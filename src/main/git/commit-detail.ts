import path from 'node:path';
import fs from 'node:fs';
import { CommitDetail, FileChange, FileDiff, ComparisonResult, FileStatusKind } from '../../shared/types';
import { withGit, errorMessage } from './core';
import { parseUnifiedDiff } from './status-diff';
import { gravatarHash } from './history';

/** Construct synthetic full-addition diff for untracked/new text files on disk. */
async function getUntrackedFileDiff(repoPath: string, filePath: string): Promise<FileDiff | null> {
  const fullPath = path.resolve(repoPath, filePath);
  try {
    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) return null;
    const buf = await fs.promises.readFile(fullPath);

    // Detect binary files (null bytes in first 8000 bytes)
    const checkLen = Math.min(buf.length, 8000);
    for (let i = 0; i < checkLen; i++) {
      if (buf[i] === 0) {
        return { path: filePath, hunks: [], insertions: 0, deletions: 0, isBinary: true };
      }
    }

    if (buf.length === 0) {
      return { path: filePath, hunks: [], insertions: 0, deletions: 0 };
    }

    const text = buf.toString('utf8');
    const rawLines = text.split(/\r?\n/);
    if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }
    const lines = rawLines.map((content, idx) => ({
      kind: 'add' as const,
      oldNo: null,
      newNo: idx + 1,
      content
    }));

    return {
      path: filePath,
      hunks: [
        {
          header: `@@ -0,0 +1,${lines.length} @@`,
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: lines.length,
          lines
        }
      ],
      insertions: lines.length,
      deletions: 0
    };
  } catch {
    return null;
  }
}

/** Number stats per changed file for a commit. */
export async function getCommitDetail(repoPath: string, hash: string): Promise<CommitDetail | null> {
  try {
    return await withGit(repoPath, async (git) => {
      const meta = await git.raw([
        'show',
        '-s',
        '--pretty=format:%H%n%h%n%an%n%ae%n%cI%n%s%n%b%n%P',
        hash
      ]);
      const lines = meta.split('\n');
      const hashFull = lines[0];
      const short = lines[1];
      const name = lines[2];
      const email = lines[3];
      const date = lines[4];
      const subject = lines[5];
      const parentsLine = lines[lines.length - 1] || '';
      const body = lines.slice(6, lines.length - 1).join('\n').replace(/\n$/, '');

      const parents = parentsLine.trim() ? parentsLine.trim().split(' ') : [];
      const isRoot = parents.length === 0;
      const range = isRoot ? [hash, '--'] : [`${hash}~1`, hash, '--'];
      const numstat = await git.raw(['diff', '--numstat', ...range]);
      const files: FileChange[] = [];
      let insertions = 0;
      let deletions = 0;
      for (const line of numstat.split('\n')) {
        if (!line.trim()) continue;
        const [ins, del, ...rest] = line.split('\t');
        const file = rest.join('\t');
        if (!file) continue;
        files.push({
          path: file,
          status: 'modified',
          insertions: ins === '-' ? undefined : parseInt(ins, 10),
          deletions: del === '-' ? undefined : parseInt(del, 10)
        });
        if (ins !== '-') insertions += parseInt(ins, 10);
        if (del !== '-') deletions += parseInt(del, 10);
      }

      // file status (A/M/D) via --name-status
      const nameStatus = await git.raw(['diff', '--name-status', ...range]);
      for (const line of nameStatus.split('\n')) {
        if (!line.trim()) continue;
        const [st, from, to] = line.split('\t');
        const target = to || from;
        const f = files.find((x) => x.path === target);
        if (!f) continue;
        if (st === 'A') f.status = 'added';
        else if (st === 'D') f.status = 'deleted';
        else if (st === 'R') {
          f.status = 'renamed';
          f.renamedFrom = from;
        }
      }

      return {
        hash: hashFull,
        shortHash: short,
        parents,
        message: subject,
        body,
        authorName: name,
        authorEmail: email,
        avatarHash: email ? gravatarHash(email) : undefined,
        date,
        files,
        insertions,
        deletions
      };
    });
  } catch (err) {
    console.error('getCommitDetail failed:', errorMessage(err));
    return null;
  }
}

/** Unified diff of one file at a commit (vs first parent) or worktree modes. */
export async function getFileDiff(
  repoPath: string,
  hash: string,
  filePath: string,
  opts?: { staged?: boolean; worktree?: boolean }
): Promise<FileDiff | null> {
  try {
    return await withGit(repoPath, async (git) => {
      let diffText = '';
      if (opts?.staged) {
        diffText = await git.diff(['--cached', '--', filePath]);
      } else if (opts?.worktree) {
        diffText = await git.diff(['--', filePath]);
        // Untracked or new files return empty from standard git diff
        if (!diffText || diffText.trim() === '') {
          try {
            diffText = await git.raw(['diff', '--no-index', '--', '/dev/null', filePath]);
          } catch {
            // git diff --no-index can fail on certain special paths or OS quirks
          }
        }
      } else {
        const parents = (await git.raw(['rev-list', '--parents', '-n', '1', hash])).trim().split(' ').slice(1);
        if (parents.length === 0) {
          const emptyTree = (await git.raw(['hash-object', '-t', 'tree', '/dev/null'])).trim();
          diffText = await git.diff([`${emptyTree}..${hash}`, '--', filePath]);
        } else {
          diffText = await git.diff([`${parents[0]}..${hash}`, '--', filePath]);
        }
      }

      const parsed = parseUnifiedDiff(diffText, filePath);
      // If worktree diff yielded no hunks and is not binary, check direct disk content (e.g. untracked files)
      if (opts?.worktree && parsed.hunks.length === 0 && !parsed.isBinary) {
        const fallback = await getUntrackedFileDiff(repoPath, filePath);
        if (fallback) return fallback;
      }

      return parsed;
    });
  } catch (err) {
    console.error('getFileDiff failed:', errorMessage(err));
    return null;
  }
}

/** Full diff text for a commit — used by revert-hunk and AI explainer. */
export async function getCommitDiffText(repoPath: string, hash: string, filePath?: string): Promise<string> {
  return withGit(repoPath, async (git) => {
    const parents = (await git.raw(['rev-list', '--parents', '-n', '1', hash])).trim().split(' ').slice(1);
    const args = filePath ? ['--', filePath] : [];
    if (parents.length === 0) {
      const emptyTree = (await git.raw(['hash-object', '-t', 'tree', '/dev/null'])).trim();
      return git.diff([`${emptyTree}..${hash}`, ...args]);
    }
    return git.diff([`${parents[0]}..${hash}`, ...args]);
  });
}

/** Compare two arbitrary revisions (commits or tags) */
export async function compareCommits(
  repoPath: string,
  baseHash: string,
  targetHash: string
): Promise<ComparisonResult | null> {
  try {
    return await withGit(repoPath, async (git) => {
      const [baseMeta, targetMeta] = await Promise.all([
        git.raw(['show', '-s', '--pretty=format:%h%n%s%n%an%n%cI', baseHash]),
        git.raw(['show', '-s', '--pretty=format:%h%n%s%n%an%n%cI', targetHash])
      ]);

      const baseLines = baseMeta.trim().split('\n');
      const targetLines = targetMeta.trim().split('\n');

      const numstat = await git.raw(['diff', '--numstat', baseHash, targetHash, '--']);
      let nameStatus = '';
      try {
        nameStatus = await git.raw(['diff', '--name-status', baseHash, targetHash, '--']);
      } catch {}

      const statusMap = new Map<string, FileStatusKind>();
      for (const line of nameStatus.split('\n')) {
        if (!line.trim()) continue;
        const [code, ...parts] = line.split('\t');
        const fPath = parts[parts.length - 1];
        const kind: FileStatusKind =
          code.startsWith('A') ? 'added' :
          code.startsWith('D') ? 'deleted' :
          code.startsWith('R') ? 'renamed' : 'modified';
        statusMap.set(fPath, kind);
      }

      const files: FileChange[] = [];
      let insertions = 0;
      let deletions = 0;

      for (const line of numstat.split('\n')) {
        if (!line.trim()) continue;
        const [ins, del, ...parts] = line.split('\t');
        const fPath = parts.join('\t');
        if (!fPath) continue;
        const insNum = ins === '-' ? undefined : parseInt(ins, 10);
        const delNum = del === '-' ? undefined : parseInt(del, 10);
        files.push({
          path: fPath,
          status: statusMap.get(fPath) || 'modified',
          insertions: insNum,
          deletions: delNum
        });
        if (insNum) insertions += insNum;
        if (delNum) deletions += delNum;
      }

      return {
        baseHash,
        targetHash,
        baseSubject: baseLines[1] || baseLines[0] || baseHash.slice(0, 7),
        targetSubject: targetLines[1] || targetLines[0] || targetHash.slice(0, 7),
        files,
        insertions,
        deletions
      };
    });
  } catch (err) {
    console.error('compareCommits failed:', errorMessage(err));
    return null;
  }
}

/** Get unified diff between two arbitrary revisions for a specific file */
export async function getComparisonFileDiff(
  repoPath: string,
  baseHash: string,
  targetHash: string,
  filePath: string
): Promise<FileDiff | null> {
  try {
    return await withGit(repoPath, async (git) => {
      const diffText = await git.diff([baseHash, targetHash, '--', filePath]);
      return parseUnifiedDiff(diffText, filePath);
    });
  } catch (err) {
    console.error('getComparisonFileDiff failed:', errorMessage(err));
    return null;
  }
}
