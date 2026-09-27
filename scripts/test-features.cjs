const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, filename);
const { compareCommits, getComparisonFileDiff, getFileDiff } = require('../src/main/git/commit-detail.ts');
const { stageLines, unstageLines, discardLines, discardHunk, stageHunk } = require('../src/main/git/hunk-actions.ts');
const { startBisect, stepBisect, resetBisect, getBisectState } = require('../src/main/git/bisect.ts');
const { createWorktree } = require('../src/main/git/history.ts');
const { getWorktrees, removeWorktree } = require('../src/main/git/objects-navigation.ts');
const { explainCodeChanges } = require('../src/shared/ai.ts');
const { alignHunkLinesForSplit } = require('../src/renderer/components/DiffViewer/diffUtils.ts');
const git = (repo, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function fixture(t, content = Array.from({ length: 35 }, (_, i) => `line ${i + 1}`).join('\n') + '\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratagit-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo'); fs.mkdirSync(repo);
  git(repo, 'init', '-b', 'main'); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
  const file = path.join(repo, 'file.txt'); fs.writeFileSync(file, content);
  const commit = () => { git(repo, 'add', '.'); git(repo, 'commit', '-m', 'fixture'); return git(repo, 'rev-parse', 'HEAD'); };
  const initial = commit();
  return { dir, repo, file, content, initial, commit, read: () => fs.readFileSync(file, 'utf8') };
}
async function changedIndices(repo, staged = false, hunk = 0) {
  const diff = await getFileDiff(repo, '', 'file.txt', staged ? { staged: true } : { worktree: true });
  return diff.hunks[hunk].lines.flatMap((line, i) => line.kind !== 'context' ? [i] : []);
}
test('comparison handles modified renames, tabs, Unicode, binary files, and swapped revisions', async t => {
  const f = fixture(t); const renamed = 'renamed\t日本.txt';
  git(f.repo, 'mv', 'file.txt', renamed);
  fs.writeFileSync(path.join(f.repo, renamed), f.content.replace('line 3', 'changed 3'));
  fs.writeFileSync(path.join(f.repo, 'binary.bin'), Buffer.from([0, 1, 2]));
  const target = f.commit();
  const result = await compareCommits(f.repo, f.initial, target);
  const file = result.files.find(x => x.path === renamed);
  assert.equal(file.status, 'renamed'); assert.equal(file.renamedFrom, 'file.txt');
  assert.equal(file.insertions, 1); assert.equal(file.deletions, 1);
  assert.equal((await getComparisonFileDiff(f.repo, f.initial, target, renamed)).hunks.length, 1);
  assert.equal(result.files.find(x => x.path === 'binary.bin').insertions, undefined);
  const swapped = await compareCommits(f.repo, target, f.initial);
  assert.equal(swapped.files.find(x => x.path === 'file.txt').renamedFrom, renamed);
});
test('line discard preserves other hunks and the exact staged patch', async t => {
  const f = fixture(t);
  const staged = f.content.replace('line 15\n', 'staged 15\n'); fs.writeFileSync(f.file, staged); git(f.repo, 'add', '.');
  const index = git(f.repo, 'diff', '--cached');
  fs.writeFileSync(f.file, staged.replace('line 2\n', 'changed 2\n').replace('line 30\n', 'changed 30\n'));
  await discardLines(f.repo, 'file.txt', 0, await changedIndices(f.repo));
  assert.equal(f.read(), staged.replace('line 30\n', 'changed 30\n'));
  assert.equal(git(f.repo, 'diff', '--cached'), index);
});
test('partial unstaging preserves unselected additions and worktree bytes', async t => {
  const f = fixture(t, 'a\nb\nc\n'); fs.writeFileSync(f.file, 'a\nB\nC\n'); git(f.repo, 'add', '.');
  const diff = await getFileDiff(f.repo, '', 'file.txt', { staged: true });
  const i = diff.hunks[0].lines.findIndex(l => l.kind === 'add');
  await unstageLines(f.repo, 'file.txt', 0, [i]);
  assert.equal(git(f.repo, 'show', ':file.txt'), 'a\nC'); assert.equal(f.read(), 'a\nB\nC\n');
});
test('staging selected changes and discarding other hunk preserve index', async t => {
  const f = fixture(t); fs.writeFileSync(f.file, f.content.replace('line 2\n', 'changed 2\n').replace('line 30\n', 'changed 30\n'));
  await stageLines(f.repo, 'file.txt', 0, await changedIndices(f.repo));
  const index = git(f.repo, 'diff', '--cached');
  await discardHunk(f.repo, 'file.txt', 0);
  assert.equal(git(f.repo, 'diff'), ''); assert.equal(git(f.repo, 'diff', '--cached'), index);
});
test('split diff gives additions and deletions independent indices', () => {
  const rows = alignHunkLinesForSplit({ lines: [{ kind: 'del', content: 'old', oldNo: 1, newNo: null }, { kind: 'add', content: 'new', oldNo: null, newNo: 1 }] });
  assert.equal(rows[0].left.hunkLineIndex, 0); assert.equal(rows[0].right.hunkLineIndex, 1);
});
for (const action of ['stage', 'unstage', 'discard']) {
  test(`${action} selected lines handles no trailing newline`, async t => {
    const f = fixture(t, 'one\ntwo'); fs.writeFileSync(f.file, 'ONE\nTWO');
    if (action === 'unstage') git(f.repo, 'add', '.');
    const indices = await changedIndices(f.repo, action === 'unstage');
    await ({ stage: stageLines, unstage: unstageLines, discard: discardLines }[action])(f.repo, 'file.txt', 0, indices);
    assert.equal(action === 'discard' ? f.read() : git(f.repo, 'show', ':file.txt'), action === 'stage' ? 'ONE\nTWO' : 'one\ntwo');
  });
}
test('partial deletion leaves remaining lines', async t => {
  const f = fixture(t, 'one\ntwo\nthree\n'); fs.unlinkSync(f.file);
  await stageLines(f.repo, 'file.txt', 0, [1]);
  assert.equal(git(f.repo, 'show', ':file.txt'), 'one\nthree');
});
test('worktree lifecycle and dirty worktree protection', async t => {
  const f = fixture(t); const wt = path.join(f.dir, 'linked');
  await createWorktree(f.repo, wt, f.initial); assert.equal((await getWorktrees(f.repo)).length, 2);
  fs.writeFileSync(path.join(wt, 'file.txt'), 'dirty');
  await assert.rejects(removeWorktree(f.repo, wt)); assert.equal(fs.readFileSync(path.join(wt, 'file.txt'), 'utf8'), 'dirty');
  git(wt, 'restore', 'file.txt'); await removeWorktree(f.repo, wt); assert.equal((await getWorktrees(f.repo)).length, 1);
});
test('bisect locates culprit, survives reopening, and resets linked worktree', async t => {
  const f = fixture(t); const hashes = [f.initial];
  for (let i = 1; i <= 5; i++) { fs.writeFileSync(f.file, `revision ${i}\n`); hashes.push(f.commit()); }
  const wt = path.join(f.dir, 'linked'); await createWorktree(f.repo, wt, hashes[5]);
  let result = await startBisect(wt, hashes[5], hashes[0]); assert.equal(result.ok, true); assert.equal(result.state.active, true);
  for (let i = 0; i < 8 && !result.state.culpritCommit; i++) {
    const current = hashes.indexOf(result.state.currentCommit.hash);
    result = await stepBisect(wt, current >= 3 ? 'bad' : 'good'); assert.equal(result.ok, true);
  }
  assert.equal(result.state.culpritCommit.hash, hashes[3]);
  assert.equal((await getBisectState(wt)).culpritCommit.hash, hashes[3]);
  assert.equal((await resetBisect(wt)).ok, true); assert.equal(git(wt, 'rev-parse', 'HEAD'), hashes[5]);
});
test('bisect marking good first does not mark it bad or erase session', async t => {
  const f = fixture(t); fs.writeFileSync(f.file, 'bad\n'); const bad = f.commit();
  assert.equal((await startBisect(f.repo, undefined, f.initial)).ok, true);
  const result = await startBisect(f.repo, bad); assert.equal(result.ok, true); assert.equal(result.state.culpritCommit.hash, bad);
  await resetBisect(f.repo);
});
test('bisect refuses dirty checkout before changing HEAD', async t => {
  const f = fixture(t); fs.writeFileSync(f.file, 'dirty');
  assert.equal((await startBisect(f.repo, f.initial)).ok, false);
  assert.equal((await getBisectState(f.repo)).active, false); assert.equal(f.read(), 'dirty');
});
test('AI respects each configured provider and returns generated text', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  for (const provider of ['pollinations', 'groq', 'gemini', 'openrouter', 'ollama', 'custom']) {
    let request;
    global.fetch = async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ choices: [{ message: { content: 'Actual generated review' } }] }) }; };
    const res = await explainCodeChanges('diff --git a/f b/f\n+changed', { provider, model: 'chosen-model', apiKey: 'test-key', endpoint: 'http://localhost:1234/v1' });
    assert.equal(res.explanation, 'Actual generated review'); assert.equal(request.method, 'POST');
    assert.equal(JSON.parse(request.body).model, 'chosen-model'); assert.equal(request.headers.Authorization, 'Bearer test-key');
    assert.ok(JSON.parse(request.body).messages[1].content.includes('+changed'));
    if (provider === 'pollinations') assert.equal(request.url, 'https://gen.pollinations.ai/v1/chat/completions');
    if (provider === 'custom' || provider === 'ollama') assert.equal(request.url, 'http://localhost:1234/v1/chat/completions');
  }
});
test('AI failures, missing keys, and local heuristic never produce a fake review', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original; });
  const config = { provider: 'groq', apiKey: 'test-key' };
  for (const fetch of [async () => ({ ok: false, status: 401 }), async () => { throw new Error('offline'); }, async () => ({ ok: true, json: async () => ({ choices: [] }) })]) {
    global.fetch = fetch; const result = await explainCodeChanges('+test', config); assert.equal(result.ok, false); assert.equal(result.explanation, undefined); assert.ok(result.error);
  }
  global.fetch = () => { throw new Error('Should not call fetch'); };
  assert.equal((await explainCodeChanges('+test', { provider: 'local' })).ok, false);
  assert.match((await explainCodeChanges('+test', { provider: 'groq' })).error, /API key/);
});
for (const action of ['stage', 'discard']) {
  test(`${action} untracked selected lines preserves the other new lines`, async t => {
    const f = fixture(t); const file = path.join(f.repo, 'new.txt'); fs.writeFileSync(file, 'one\ntwo\nthree\n');
    const diff = await getFileDiff(f.repo, '', 'new.txt', { worktree: true }); assert.equal(diff.hunks[0].lines.length, 3);
    await (action === 'stage' ? stageLines : discardLines)(f.repo, 'new.txt', 0, [1]);
    assert.equal(action === 'stage' ? git(f.repo, 'show', ':new.txt') : fs.readFileSync(file, 'utf8'), action === 'stage' ? 'two' : 'one\nthree\n');
  });
}
test('partial unstaging of a new file retains unselected additions', async t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.repo, 'new.txt'), 'one\ntwo\nthree\n'); git(f.repo, 'add', '.');
  await unstageLines(f.repo, 'new.txt', 0, [1]); assert.equal(git(f.repo, 'show', ':new.txt'), 'one\nthree');
});
test('clean tracked file has no synthetic addition diff', async t => {
  const f = fixture(t); assert.equal((await getFileDiff(f.repo, '', 'file.txt', { worktree: true })).hunks.length, 0);
});
test('line indices remain correct when a deleted line begins with dashes', async t => {
  const f = fixture(t, '-- heading\nkeep\n'); fs.writeFileSync(f.file, '++ heading\nkeep\n');
  const diff = await getFileDiff(f.repo, '', 'file.txt', { worktree: true });
  assert.equal(diff.hunks[0].lines[0].content, '-- heading'); assert.equal(diff.hunks[0].lines[1].content, '++ heading');
  await stageLines(f.repo, 'file.txt', 0, [0, 1]); assert.equal(git(f.repo, 'diff'), '');
});
test('bisect reports ambiguous candidates when all remaining commits are skipped', async t => {
  const f = fixture(t); const hashes = [f.initial];
  for (let i = 1; i <= 3; i++) { fs.writeFileSync(f.file, `revision ${i}\n`); hashes.push(f.commit()); }
  let result = await startBisect(f.repo, hashes[3], hashes[0]);
  for (let i = 0; i < 5 && !result.state?.ambiguousCommits?.length; i++) {
    result = await stepBisect(f.repo, 'skip');
    assert.equal(result.ok, true, result.error);
  }
  assert.ok(result.state.ambiguousCommits.length > 1);
  assert.ok((await getBisectState(f.repo)).ambiguousCommits.length > 1);
  await resetBisect(f.repo);
});
test('discard preserves CRLF line endings', async t => {
  const f = fixture(t, 'one\r\ntwo\r\nthree\r\n');
  git(f.repo, 'config', 'core.autocrlf', 'false');
  fs.writeFileSync(f.file, 'ONE\r\ntwo\r\nthree\r\n');
  await discardLines(f.repo, 'file.txt', 0, await changedIndices(f.repo));
  assert.equal(f.read(), f.content);
});
test('desktop registers unique IPC handlers and routes both patch APIs correctly', async t => {
  const Module = require('node:module');
  const originalLoad = Module._load;
  const handlers = new Map();
  const calls = [];
  let exposedApi;
  const electron = {
    ipcMain: {
      handle(channel, callback) {
        assert.equal(handlers.has(channel), false, `Duplicate IPC handler: ${channel}`);
        handlers.set(channel, callback);
      }
    },
    contextBridge: { exposeInMainWorld(name, api) { assert.equal(name, 'api'); exposedApi = api; } },
    ipcRenderer: { invoke: async (channel, ...args) => { calls.push({ channel, args }); return { ok: true }; } }
  };
  Module._load = function (name, ...args) {
    return name === 'electron' ? electron : originalLoad.call(this, name, ...args);
  };
  try {
    require('../src/main/ipc.ts').registerIpc(() => null, () => null);
    require('../src/preload/index.ts');
    await exposedApi.applyPatchCommit('abc123');
    await exposedApi.applyPatch('/tmp/change.patch');
    assert.deepEqual(calls, [
      { channel: 'git:apply-patch-commit', args: ['abc123'] },
      { channel: 'git:apply-patch', args: ['/tmp/change.patch'] }
    ]);
    for (const { channel } of calls) assert.ok(handlers.has(channel), `Missing handler: ${channel}`);
    assert.ok(handlers.has('git:bisect-start'));
    assert.ok(handlers.has('ai:explain-changes'));
  } finally {
    Module._load = originalLoad;
  }
});
