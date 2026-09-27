import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  GitStatus,
  GitFileStatus,
  FileStatusKind,
  FileDiff,
  DiffHunk,
  DiffLine
} from '../../shared/types';
import { withGit, errorMessage } from './core';

export async function getStatus(repoPath: string): Promise<GitStatus> {
  const git = await withGit(repoPath, (g) => Promise.resolve(g));
  const s = await git.status();

  const staged: GitFileStatus[] = [];
  const unstaged: GitFileStatus[] = [];

  for (const file of s.files) {
    let cleanPath = file.path;
    let renamedFrom: string | undefined;
    if (cleanPath.includes(' -> ')) {
      const [from, to] = cleanPath.split(' -> ');
      renamedFrom = from;
      cleanPath = to;
    }

    // Index status (staged changes)
    if (file.index && file.index !== ' ' && file.index !== '?') {
      let status: FileStatusKind = 'modified';
      if (file.index === 'A') status = 'added';
      else if (file.index === 'D') status = 'deleted';
      else if (file.index === 'R') status = 'renamed';
      else if (file.index === 'U') status = 'conflicted';

      staged.push({
        path: cleanPath,
        status,
        staged: true,
        unstaged: false,
        renamedFrom
      });
    }

    // Working tree status (unstaged changes)
    if (file.working_dir && file.working_dir !== ' ') {
      let status: FileStatusKind = 'modified';
      if (file.working_dir === '?') status = 'untracked';
      else if (file.working_dir === 'A') status = 'added';
      else if (file.working_dir === 'D') status = 'deleted';
      else if (file.working_dir === 'R') status = 'renamed';
      else if (file.working_dir === 'U') status = 'conflicted';

      unstaged.push({
        path: cleanPath,
        status,
        staged: false,
        unstaged: true,
        renamedFrom
      });
    }
  }

  return {
    currentBranch: s.current || 'HEAD (detached)',
    ahead: s.ahead,
    behind: s.behind,
    staged,
    unstaged
  };
}

/** Obtain the same patch for rendering and editing, including untracked files. */
export async function getWorkingDiffText(repoPath: string, filePath: string, staged = false): Promise<string> {
  return withGit(repoPath, async git => {
    const diff = await git.diff(['--no-ext-diff', '--no-textconv', ...(staged ? ['--cached'] : []), '--', filePath]);
    if (diff || staged) return diff;
    const untracked = await git.raw(['ls-files', '--others', '--exclude-standard', '-z', '--', filePath]);
    if (!untracked.split('\0').includes(filePath)) return '';
    try {
      const result = await promisify(execFile)('git', ['diff', '--no-ext-diff', '--no-textconv', '--no-index', '--', '/dev/null', filePath], { cwd: repoPath, maxBuffer: 16 * 1024 * 1024 });
      return result.stdout;
    } catch (err) {
      const failure = err as { code?: number; stdout?: string };
      if (failure.code === 1 && typeof failure.stdout === 'string') return failure.stdout;
      throw err;
    }
  });
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

export function parseUnifiedDiff(diffText: string, filePath: string): FileDiff {
  if (!diffText || !diffText.trim()) {
    return { path: filePath, hunks: [], insertions: 0, deletions: 0 };
  }

  const isBinary = /Binary files .* differ/i.test(diffText) || /GIT binary patch/i.test(diffText);
  if (isBinary) {
    return { path: filePath, hunks: [], insertions: 0, deletions: 0, isBinary: true };
  }

  const hunks: DiffHunk[] = [];
  let cur: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let insertions = 0;
  let deletions = 0;

  const rawLines = diffText.split('\n');
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  for (const line of rawLines) {
    const m = line.match(HUNK_RE);
    if (m) {
      cur = {
        header: line,
        oldStart: parseInt(m[1], 10),
        oldLines: m[2] ? parseInt(m[2], 10) : 1,
        newStart: parseInt(m[3], 10),
        newLines: m[4] ? parseInt(m[4], 10) : 1,
        lines: []
      };
      hunks.push(cur);
      oldNo = cur.oldStart;
      newNo = cur.newStart;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('diff --git')) { cur = null; continue; }
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    if (line.startsWith('+')) {
      cur.lines.push({ kind: 'add', oldNo: null, newNo: newNo++, content: line.slice(1) });
      insertions++;
    } else if (line.startsWith('-')) {
      cur.lines.push({ kind: 'del', oldNo: oldNo++, newNo: null, content: line.slice(1) });
      deletions++;
    } else if (line.startsWith(' ') || line === '') {
      cur.lines.push({ kind: 'context', oldNo: oldNo++, newNo: newNo++, content: line.slice(1) });
    }
  }
  return { path: filePath, hunks, insertions, deletions };
}
