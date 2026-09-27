import { CommitDetail, FileChange, FileDiff, ComparisonResult, FileStatusKind } from '../../shared/types';
import { withGit, errorMessage } from './core';
import { parseUnifiedDiff, getWorkingDiffText } from './status-diff';
import { gravatarHash } from './history';

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
      if (opts?.staged || opts?.worktree) {
        diffText = await getWorkingDiffText(repoPath, filePath, opts.staged);
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

      // NUL-delimited output preserves tabs, Unicode, and rename source/target paths.
      const numstat = await git.raw(['diff', '--numstat', '-z', '-M', baseHash, targetHash, '--']);
      const nameStatus = await git.raw(['diff', '--name-status', '-z', '-M', baseHash, targetHash, '--']);
      const statuses = nameStatus.split('\0');
      const files: FileChange[] = [];
      for (let i = 0; i < statuses.length && statuses[i];) {
        const code = statuses[i++];
        const firstPath = statuses[i++];
        const renamed = code.startsWith('R') || code.startsWith('C');
        files.push({
          path: renamed ? statuses[i++] : firstPath,
          renamedFrom: renamed ? firstPath : undefined,
          status: code.startsWith('A') ? 'added' : code.startsWith('D') ? 'deleted' : renamed ? 'renamed' : 'modified'
        });
      }
      const stats = numstat.split('\0');
      let insertions = 0;
      let deletions = 0;
      for (let i = 0; i < stats.length && stats[i];) {
        const record = stats[i++];
        const match = record.match(/^(\d+|-)\t(\d+|-)\t([\s\S]*)$/);
        if (!match) continue;
        let filePath = match[3];
        if (!filePath) { i++; filePath = stats[i++]; }
        const file = files.find(f => f.path === filePath);
        if (!file) continue;
        file.insertions = match[1] === '-' ? undefined : Number(match[1]);
        file.deletions = match[2] === '-' ? undefined : Number(match[2]);
        insertions += file.insertions || 0;
        deletions += file.deletions || 0;
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
      const comparison = await compareCommits(repoPath, baseHash, targetHash);
      const file = comparison?.files.find(f => f.path === filePath);
      const paths = file?.renamedFrom ? [file.renamedFrom, filePath] : [filePath];
      const diffText = await git.diff(['-M', baseHash, targetHash, '--', ...paths]);
      return parseUnifiedDiff(diffText, filePath);
    });
  } catch (err) {
    console.error('getComparisonFileDiff failed:', errorMessage(err));
    return null;
  }
}
