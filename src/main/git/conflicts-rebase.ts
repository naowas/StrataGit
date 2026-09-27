import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  ConflictFileParsed,
  ConflictSection,
  RepoOperationState,
  RebaseStep,
  MergeSimulationResult
} from '../../shared/types';
import { withGit } from './core';

const execFileP = promisify(execFile);

function tmpScript(name: string, code: string): string {
  const file = path.join(os.tmpdir(), `stratagit-${name}-${crypto.randomBytes(4).toString('hex')}.cjs`);
  fs.writeFileSync(file, code);
  return file;
}

/** Check repository operation state (Merge, Rebase, Cherry-Pick, Conflicted files) */
export async function getRepoOperationState(repoPath: string): Promise<RepoOperationState> {
  const gitDir = path.join(repoPath, '.git');
  let realGitDir = gitDir;

  try {
    if (fs.existsSync(gitDir)) {
      const stat = fs.statSync(gitDir);
      if (!stat.isDirectory()) {
        // May be a git worktree file: "gitdir: /path/to/.git/worktrees/name"
        const content = fs.readFileSync(gitDir, 'utf8');
        const match = content.match(/gitdir:\s*(.+)/);
        if (match) {
          realGitDir = match[1].trim();
        }
      }
    }
  } catch {}

  const inMerge = fs.existsSync(path.join(realGitDir, 'MERGE_HEAD'));
  const inRebase =
    fs.existsSync(path.join(realGitDir, 'rebase-merge')) ||
    fs.existsSync(path.join(realGitDir, 'rebase-apply'));
  const inCherryPick = fs.existsSync(path.join(realGitDir, 'CHERRY_PICK_HEAD'));

  // Get list of conflicted files from git status
  const conflictedFiles: string[] = [];
  try {
    const { stdout } = await execFileP('git', ['status', '--porcelain'], { cwd: repoPath });
    for (const line of stdout.split('\n')) {
      if (line.startsWith('UU ') || line.startsWith('AA ') || line.startsWith('DD ') || line.startsWith('UD ') || line.startsWith('DU ')) {
        conflictedFiles.push(line.slice(3).trim());
      } else if (line.length > 2 && (line[0] === 'U' || line[1] === 'U')) {
        conflictedFiles.push(line.slice(3).trim());
      }
    }
  } catch {}

  return {
    inMerge,
    inRebase,
    inCherryPick,
    conflictedFiles
  };
}

/** Parse a conflicted file on disk into text segments and conflict markers */
export async function getConflictFile(repoPath: string, filePath: string): Promise<ConflictFileParsed> {
  const fullPath = path.resolve(repoPath, filePath);
  const rawContent = await fs.promises.readFile(fullPath, 'utf8');
  const rawLines = rawContent.split(/\r?\n/);

  const sections: ConflictFileParsed['sections'] = [];
  let currentTextLines: string[] = [];
  let totalConflicts = 0;

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (line.startsWith('<<<<<<<')) {
      if (currentTextLines.length > 0) {
        sections.push({ type: 'text', lines: currentTextLines });
        currentTextLines = [];
      }

      totalConflicts++;
      const conflictId = `conflict-${totalConflicts}-${i}`;
      const startLine = i + 1;
      const currentLabel = line.replace(/^<{7}\s*/, '').trim() || 'Current Change (Ours)';

      const currentLines: string[] = [];
      const incomingLines: string[] = [];
      let inCurrent = true;
      let inIncoming = false;
      let incomingLabel = 'Incoming Change (Theirs)';
      let endLine = startLine;

      i++;
      while (i < rawLines.length) {
        const sub = rawLines[i];
        if (sub.startsWith('=======')) {
          inCurrent = false;
          inIncoming = true;
        } else if (sub.startsWith('>>>>>>>')) {
          incomingLabel = sub.replace(/^>{7}\s*/, '').trim() || 'Incoming Change (Theirs)';
          endLine = i + 1;
          break;
        } else if (inCurrent) {
          // If diff3 format (||||||| marker), ignore base lines
          if (sub.startsWith('|||||||')) {
            inCurrent = false;
          } else {
            currentLines.push(sub);
          }
        } else if (inIncoming) {
          incomingLines.push(sub);
        }
        i++;
      }

      sections.push({
        type: 'conflict',
        conflict: {
          id: conflictId,
          startLine,
          endLine,
          currentLabel,
          currentLines,
          incomingLabel,
          incomingLines
        }
      });
    } else {
      currentTextLines.push(line);
    }
    i++;
  }

  if (currentTextLines.length > 0) {
    sections.push({ type: 'text', lines: currentTextLines });
  }

  return {
    filePath,
    sections,
    totalConflicts,
    rawContent
  };
}

/** Write resolved content to disk and git add to mark conflict as resolved */
export async function resolveConflictFile(
  repoPath: string,
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = path.resolve(repoPath, filePath);
  await fs.promises.writeFile(fullPath, content, 'utf8');
  await execFileP('git', ['add', filePath], { cwd: repoPath });
}

/** Abort active merge, rebase, or cherry-pick operation */
export async function abortOperation(repoPath: string): Promise<void> {
  const state = await getRepoOperationState(repoPath);
  if (state.inRebase) {
    await execFileP('git', ['rebase', '--abort'], { cwd: repoPath });
  } else if (state.inMerge) {
    await execFileP('git', ['merge', '--abort'], { cwd: repoPath });
  } else if (state.inCherryPick) {
    await execFileP('git', ['cherry-pick', '--abort'], { cwd: repoPath });
  }
}

/** Continue active merge, rebase, or cherry-pick operation after conflicts resolved */
export async function continueOperation(repoPath: string): Promise<void> {
  const state = await getRepoOperationState(repoPath);
  if (state.inRebase) {
    await execFileP('git', ['rebase', '--continue'], {
      cwd: repoPath,
      env: { ...process.env, GIT_EDITOR: '/bin/true' }
    });
  } else if (state.inMerge) {
    await execFileP('git', ['commit', '--no-edit'], { cwd: repoPath });
  } else if (state.inCherryPick) {
    await execFileP('git', ['cherry-pick', '--continue'], {
      cwd: repoPath,
      env: { ...process.env, GIT_EDITOR: '/bin/true' }
    });
  }
}

/** Cherry-pick a commit onto current branch */
export async function cherryPick(
  repoPath: string,
  hash: string
): Promise<{ ok: boolean; hasConflicts?: boolean; error?: string }> {
  try {
    await execFileP('git', ['cherry-pick', hash], { cwd: repoPath });
    return { ok: true };
  } catch (err: unknown) {
    const state = await getRepoOperationState(repoPath);
    if (state.inCherryPick || state.conflictedFiles.length > 0) {
      return { ok: false, hasConflicts: true, error: 'Conflicts encountered during cherry-pick' };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Get list of commits between a base hash and HEAD for interactive rebase */
export async function getCommitsForRebase(repoPath: string, baseHash: string): Promise<RebaseStep[]> {
  try {
    const { stdout } = await execFileP(
      'git',
      ['log', '--pretty=format:%H%x09%h%x09%an%x09%s', '--reverse', `${baseHash}..HEAD`],
      { cwd: repoPath }
    );
    const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const [hash, shortHash, author, message] = line.split('\t');
      return {
        hash: hash || '',
        shortHash: shortHash || '',
        action: 'pick' as const,
        message: message || '',
        author: author || 'Unknown'
      };
    });
  } catch {
    return [];
  }
}

/** Execute interactive rebase with customized steps */
export async function executeInteractiveRebase(
  repoPath: string,
  baseHash: string,
  steps: RebaseStep[]
): Promise<{ ok: boolean; hasConflicts?: boolean; error?: string }> {
  const todoLines: string[] = [];
  const rewordMap: Record<string, string> = {};

  for (const step of steps) {
    todoLines.push(`${step.action} ${step.hash} ${step.message}`);
    if (step.action === 'reword') {
      rewordMap[step.hash.slice(0, 7)] = step.message;
    }
  }

  const todoContent = todoLines.join('\n') + '\n';
  const todoScript = [
    "const fs = require('node:fs');",
    "const file = process.argv[2];",
    `fs.writeFileSync(file, ${JSON.stringify(todoContent)});`
  ].join('\n');

  // Script to supply customized reword messages automatically if needed
  const msgScript = [
    "const fs = require('node:fs');",
    "const file = process.argv[2];",
    `const rewords = ${JSON.stringify(rewordMap)};`,
    "const current = fs.readFileSync(file, 'utf8');",
    "for (const [k, v] of Object.entries(rewords)) {",
    "  if (current.includes(k) || true) {",
    "    fs.writeFileSync(file, v);",
    "    break;",
    "  }",
    "}"
  ].join('\n');

  const todoFile = tmpScript('rebase-todo', todoScript);
  const msgFile = tmpScript('rebase-msg', msgScript);

  try {
    await execFileP('git', ['rebase', '-i', baseHash], {
      cwd: repoPath,
      env: {
        ...process.env,
        GIT_SEQUENCE_EDITOR: `node ${JSON.stringify(todoFile)}`,
        GIT_EDITOR: Object.keys(rewordMap).length > 0 ? `node ${JSON.stringify(msgFile)}` : '/bin/true'
      }
    });
    return { ok: true };
  } catch (err: unknown) {
    const state = await getRepoOperationState(repoPath);
    if (state.inRebase || state.conflictedFiles.length > 0) {
      return { ok: false, hasConflicts: true, error: 'Conflicts occurred during rebase' };
    }
    // If not in rebase conflict, attempt abort to leave repo clean
    await execFileP('git', ['rebase', '--abort'], { cwd: repoPath }).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    void fs.promises.unlink(todoFile).catch(() => {});
    void fs.promises.unlink(msgFile).catch(() => {});
  }
}

/** Pre-flight check simulating merge without touching working tree or index */
export async function simulateMerge(repoPath: string, targetBranch: string): Promise<MergeSimulationResult> {
  return await withGit(repoPath, async () => {
    try {
      await execFileP('git', ['merge-tree', '--write-tree', 'HEAD', targetBranch], { cwd: repoPath });
      return {
        clean: true,
        conflicts: [],
        message: `Merge with ${targetBranch} can be performed cleanly without conflicts.`
      };
    } catch (err: unknown) {
      const errorOutput =
        (err && typeof err === 'object' && 'stdout' in err ? String(err.stdout) : '') +
        '\n' +
        (err && typeof err === 'object' && 'stderr' in err ? String(err.stderr) : '');
      const conflictFiles = new Set<string>();

      const lines = errorOutput.split('\n');
      for (const line of lines) {
        const m1 = line.match(/CONFLICT \([^)]+\): Merge conflict in (.+)/i);
        if (m1) {
          conflictFiles.add(m1[1].trim());
          continue;
        }
        const m2 = line.match(/CONFLICT \([^)]+\): (.+)/i);
        if (m2) {
          const fileMatch = m2[1].match(/(?:in |delete |modified )?([^\s,]+)/);
          if (fileMatch && fileMatch[1]) conflictFiles.add(fileMatch[1].trim());
        }
      }

      const files = Array.from(conflictFiles);
      return {
        clean: false,
        conflicts: files,
        message:
          files.length > 0
            ? `Conflicts detected in ${files.length} file(s) when merging ${targetBranch}.`
            : `Merge with ${targetBranch} will encounter conflicts.`
      };
    }
  });
}
