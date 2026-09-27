import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { BlameLine, FileHistoryEntry } from '../../shared/types';
import { withGit } from './core';

/** Apply a patch to git via stdin with given git apply flags */
function runGitApply(repoPath: string, patch: string, flags: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['apply', ...flags, '-'], {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `git apply exited with code ${code}`));
      }
    });

    child.stdin.write(patch);
    child.stdin.end();
  });
}

/** Parses diff text into file headers and individual hunk blocks (preserving exact lines) */
function parseDiffBlocks(diffText: string): { fileHeader: string[]; hunks: string[][] } {
  const lines = diffText.split(/\r?\n/);
  // drop trailing empty line if present
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const headerLines: string[] = [];
  const hunks: string[][] = [];
  let currentHunk: string[] | null = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      currentHunk = [line];
      hunks.push(currentHunk);
    } else if (currentHunk) {
      currentHunk.push(line);
    } else {
      headerLines.push(line);
    }
  }

  const fileHeader = headerLines.filter(
    (l) => l.startsWith('--- ') || l.startsWith('+++ ') || l.startsWith('diff --git')
  );

  return { fileHeader, hunks };
}

/** Stage a single hunk from unstaged changes into git index */
export async function stageHunk(repoPath: string, filePath: string, hunkIndex: number): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found in unstaged diff`);

    const patch = [...fileHeader, ...block].join('\n') + '\n';
    await runGitApply(repoPath, patch, ['--cached', '--whitespace=nowarn', '--recount']);
  });
}

/** Unstage a single hunk from staged changes back to working tree */
export async function unstageHunk(repoPath: string, filePath: string, hunkIndex: number): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--cached', '--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found in staged diff`);

    const patch = [...fileHeader, ...block].join('\n') + '\n';
    await runGitApply(repoPath, patch, ['--cached', '--reverse', '--whitespace=nowarn', '--recount']);
  });
}

/** Discard a single hunk from the working tree (reverting it) */
export async function discardHunk(repoPath: string, filePath: string, hunkIndex: number): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found in unstaged diff`);

    const patch = [...fileHeader, ...block].join('\n') + '\n';
    await runGitApply(repoPath, patch, ['--reverse', '--whitespace=nowarn', '--recount']);
  });
}

/** Stage selected lines within a hunk */
export async function stageLines(
  repoPath: string,
  filePath: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found`);

    const header = block[0];
    const lines = block.slice(1);
    const targetSet = new Set(lineIndices);

    const filtered: string[] = [header];
    lines.forEach((l, idx) => {
      const isSelected = targetSet.has(idx);
      if (l.startsWith('+')) {
        if (isSelected) filtered.push(l);
      } else if (l.startsWith('-')) {
        if (isSelected) {
          filtered.push(l);
        } else {
          // Convert unselected deletion into context line
          filtered.push(' ' + l.slice(1));
        }
      } else {
        // Context line
        filtered.push(l);
      }
    });

    const patch = [...fileHeader, ...filtered].join('\n') + '\n';
    await runGitApply(repoPath, patch, ['--cached', '--whitespace=nowarn', '--recount']);
  });
}

/** Unstage selected lines within a staged hunk */
export async function unstageLines(
  repoPath: string,
  filePath: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--cached', '--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found`);

    const header = block[0];
    const lines = block.slice(1);
    const targetSet = new Set(lineIndices);

    const filtered: string[] = [header];
    lines.forEach((l, idx) => {
      const isSelected = targetSet.has(idx);
      if (l.startsWith('+')) {
        if (isSelected) filtered.push(l);
      } else if (l.startsWith('-')) {
        if (isSelected) {
          filtered.push(l);
        } else {
          filtered.push(' ' + l.slice(1));
        }
      } else {
        filtered.push(l);
      }
    });

    const patch = [...fileHeader, ...filtered].join('\n') + '\n';
    await runGitApply(repoPath, patch, ['--cached', '--reverse', '--whitespace=nowarn', '--recount']);
  });
}

/** Discard selected lines in working tree */
export async function discardLines(
  repoPath: string,
  filePath: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return withGit(repoPath, async (git) => {
    const diffText = await git.diff(['--', filePath]);
    const { fileHeader, hunks } = parseDiffBlocks(diffText);
    const block = hunks[hunkIndex];
    if (!block) throw new Error(`Hunk #${hunkIndex + 1} not found`);

    const header = block[0];
    const lines = block.slice(1);
    const discardSet = new Set(lineIndices);

    // Build patch of lines we want to KEEP in the index
    const keepLines: string[] = [header];
    lines.forEach((l, idx) => {
      const isToDiscard = discardSet.has(idx);
      if (l.startsWith('+')) {
        if (!isToDiscard) keepLines.push(l);
      } else if (l.startsWith('-')) {
        if (!isToDiscard) {
          keepLines.push(l);
        } else {
          keepLines.push(' ' + l.slice(1));
        }
      } else {
        keepLines.push(l);
      }
    });

    const keepPatch = [...fileHeader, ...keepLines].join('\n') + '\n';
    // 1. Stage the lines to keep
    await runGitApply(repoPath, keepPatch, ['--cached', '--whitespace=nowarn', '--recount']);
    // 2. Checkout file from index (discards un-staged lines from working tree)
    await git.checkout(['--', filePath]);
    // 3. Reset index for this file so kept changes become unstaged again
    await git.reset(['HEAD', '--', filePath]);
  });
}

/** Get structured git blame for a file */
export async function getBlameLines(repoPath: string, filePath: string): Promise<BlameLine[]> {
  return withGit(repoPath, async (git) => {
    try {
      const raw = await git.raw(['blame', '--line-porcelain', '--', filePath]);
      const lines = raw.split(/\r?\n/);
      const result: BlameLine[] = [];

      let currentHash = '';
      let currentAuthor = '';
      let currentAuthorEmail = '';
      let currentAuthorTime = '';
      let currentSummary = '';
      let currentFinalLine = 1;

      for (const line of lines) {
        if (/^[0-9a-f]{40}\s+\d+\s+\d+/.test(line)) {
          const parts = line.split(/\s+/);
          currentHash = parts[0];
          currentFinalLine = parseInt(parts[2], 10);
        } else if (line.startsWith('author ')) {
          currentAuthor = line.slice(7);
        } else if (line.startsWith('author-mail ')) {
          currentAuthorEmail = line.slice(12).replace(/^<|>$/g, '');
        } else if (line.startsWith('author-time ')) {
          const epoch = parseInt(line.slice(12), 10);
          if (!isNaN(epoch)) {
            currentAuthorTime = new Date(epoch * 1000).toISOString().split('T')[0];
          }
        } else if (line.startsWith('summary ')) {
          currentSummary = line.slice(8);
        } else if (line.startsWith('\t')) {
          result.push({
            lineNo: currentFinalLine,
            commitHash: currentHash,
            shortHash: currentHash.slice(0, 7),
            author: currentAuthor || 'Unknown',
            authorEmail: currentAuthorEmail,
            date: currentAuthorTime,
            summary: currentSummary,
            content: line.slice(1)
          });
        }
      }

      return result;
    } catch {
      return [];
    }
  });
}

/** Get file commit history */
export async function getFileHistory(repoPath: string, filePath: string): Promise<FileHistoryEntry[]> {
  return withGit(repoPath, async (git) => {
    try {
      const raw = await git.raw([
        'log',
        '--pretty=format:%H%x09%h%x09%an%x09%ae%x09%cI%x09%s',
        '--',
        filePath
      ]);
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return lines.map((line) => {
        const [hash, shortHash, authorName, authorEmail, date, summary] = line.split('\t');
        return {
          hash: hash || '',
          shortHash: shortHash || '',
          authorName: authorName || 'Unknown',
          authorEmail: authorEmail || '',
          date: date || '',
          summary: summary || ''
        };
      });
    } catch {
      return [];
    }
  });
}

/** Export commit diff as standard git patch file */
export async function exportPatch(repoPath: string, commitHash: string, outputPath: string): Promise<void> {
  await withGit(repoPath, async (git) => {
    const patch = await git.raw(['format-patch', '-1', commitHash, '--stdout']);
    await fs.promises.writeFile(outputPath, patch, 'utf8');
  });
}

/** Apply standard git patch file to working directory */
export async function applyPatchFile(repoPath: string, patchPath: string): Promise<void> {
  await withGit(repoPath, async (git) => {
    await git.raw(['apply', patchPath]);
  });
}
