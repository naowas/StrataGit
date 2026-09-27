import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BisectState } from '../../shared/types';
import { withGit } from './core';

const execFileP = promisify(execFile);

async function checkIsBisecting(repoPath: string): Promise<boolean> {
  const startFile = path.join(repoPath, '.git', 'BISECT_START');
  const logFile = path.join(repoPath, '.git', 'BISECT_LOG');
  return fs.existsSync(startFile) || fs.existsSync(logFile);
}

export async function getBisectState(repoPath: string): Promise<BisectState> {
  const active = await checkIsBisecting(repoPath);
  if (!active) {
    return { active: false };
  }

  return await withGit(repoPath, async (git) => {
    try {
      const logFilePath = path.join(repoPath, '.git', 'BISECT_LOG');
      let bisectLogLines: string[] = [];
      if (fs.existsSync(logFilePath)) {
        const raw = await fs.promises.readFile(logFilePath, 'utf8');
        bisectLogLines = raw.split('\n').filter(Boolean);
      }

      // Check current HEAD
      const logOut = await git.raw(['log', '-1', '--format=%H%x00%h%x00%s%x00%an%x00%ci']);
      const [hash, shortHash, message, authorName, date] = logOut.trim().split('\0');

      // Check if culprit is already determined
      let culpritCommit: BisectState['culpritCommit'] | undefined;
      const expectedCulpritLine = bisectLogLines.find((l) => l.includes('first bad commit'));
      if (expectedCulpritLine) {
        const m = expectedCulpritLine.match(/([a-f0-9]{40})/i);
        if (m) {
          const culpritHash = m[1];
          const culpritOut = await git.raw(['log', '-1', '--format=%H%x00%h%x00%s%x00%b%x00%an%x00%ae%x00%ci', culpritHash]);
          const [cH, cShort, cMsg, cBody, cAuthor, cEmail, cDate] = culpritOut.trim().split('\0');
          culpritCommit = {
            hash: cH,
            shortHash: cShort,
            message: cMsg,
            body: cBody || '',
            authorName: cAuthor,
            authorEmail: cEmail,
            date: cDate
          };
        }
      }

      return {
        active: true,
        currentCommit: {
          hash,
          shortHash,
          message,
          authorName,
          date
        },
        culpritCommit,
        log: bisectLogLines
      };
    } catch {
      return { active: true };
    }
  });
}

export async function startBisect(
  repoPath: string,
  badCommit?: string,
  goodCommit?: string
): Promise<{ ok: boolean; state?: BisectState; error?: string }> {
  try {
    const isBisecting = await checkIsBisecting(repoPath);
    if (isBisecting) {
      await execFileP('git', ['bisect', 'reset'], { cwd: repoPath }).catch(() => {});
    }

    const args = ['bisect', 'start'];
    if (badCommit) args.push(badCommit);
    if (goodCommit) args.push(goodCommit);

    const { stdout, stderr } = await execFileP('git', args, { cwd: repoPath });
    const output = `${stdout}\n${stderr}`;

    const state = await getBisectState(repoPath);
    const stepMatch = output.match(/Bisecting:\s*([^\n]+)/i);
    if (stepMatch) {
      state.stepInfo = stepMatch[0];
    }

    return { ok: true, state };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function stepBisect(
  repoPath: string,
  verdict: 'good' | 'bad' | 'skip'
): Promise<{ ok: boolean; state?: BisectState; error?: string }> {
  try {
    const { stdout, stderr } = await execFileP('git', ['bisect', verdict], { cwd: repoPath });
    const output = `${stdout}\n${stderr}`;

    const state = await getBisectState(repoPath);
    const stepMatch = output.match(/Bisecting:\s*([^\n]+)/i);
    if (stepMatch) {
      state.stepInfo = stepMatch[0];
    }

    const firstBadMatch = output.match(/([a-f0-9]{40})\s+is the first bad commit/i);
    if (firstBadMatch) {
      const culpritHash = firstBadMatch[1];
      await withGit(repoPath, async (git) => {
        const culpritOut = await git.raw(['log', '-1', '--format=%H%x00%h%x00%s%x00%b%x00%an%x00%ae%x00%ci', culpritHash]);
        const [cH, cShort, cMsg, cBody, cAuthor, cEmail, cDate] = culpritOut.trim().split('\0');
        state.culpritCommit = {
          hash: cH,
          shortHash: cShort,
          message: cMsg,
          body: cBody || '',
          authorName: cAuthor,
          authorEmail: cEmail,
          date: cDate
        };
      });
    }

    return { ok: true, state };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function resetBisect(repoPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileP('git', ['bisect', 'reset'], { cwd: repoPath });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
