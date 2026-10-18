# Advanced Git workflows

All four workflows are available from **Actions**. Restore points, conflict memory, and rewrite comparison are also in the command palette. These are manual usage instructions; implementing these features did not run a test suite or typecheck.

## 1. Review a hosted pull or merge request

1. Configure the provider token in **Settings → Pull Request Providers**. GitHub requires Pull requests read/write; CI results can additionally require Checks read and Commit statuses read. GitLab uses an `api` token. Bitbucket Cloud uses an Atlassian account email and API token with repository read and pull request read/write permissions.
2. Open **Actions → Pull Requests / Merge Requests**, select a remote and request, then choose **Review changes, conversation & CI**.
3. Browse files and select an old/new line number to target a comment. Conversation supports replies to inline GitHub comments and GitLab/Bitbucket discussions. General GitHub conversation items can receive a new top-level review comment.
4. Choose Comment, Approve, or Request changes and explicitly submit. Messages remain unpublished until submission. If the source revision changes, submission is rejected and the draft is kept.
5. Use the CI tab to inspect checks/statuses for the loaded source revision. Refresh to fetch new results; a missing-permission warning is separate from an empty result list.

Native GitLab change requests use the host's GraphQL capability. Hosts without that capability explicitly show **Request changes (discussion)**: this posts the request as a discussion and withdraws your approval; it does not set a native review-blocking state. Multi-step provider actions report partial success rather than encouraging a duplicate review submission. Provider pagination and missing/binary patches are disclosed. No HTML from provider descriptions/comments is executed.

Local demo origins cannot host reviews or CI results. Use a separate hosted demo repository for these account-dependent checks.

## 2. Save and restore a workspace

1. Open a dirty repository and choose **Actions → Restore Points → Save point**. A point includes HEAD, the index/working-tree split, and non-ignored untracked files. Creating it does not clear your changes or add a stash entry.
2. Inspect its label, branch, timestamp, and saved file status. Points are also created before reset, file/hunk/line discard, pull, and history rewrites. A failed snapshot stops the destructive action.
3. Commit or stash your current changes until the working tree is clean. Select the point and choose **Restore into new branch**, read the confirmation, then confirm.
4. Recovery checks out a new branch at the saved HEAD and reapplies the saved index and working files. The original branch and restore point are kept. If recovery stops, review the recovery branch; the point remains available.
5. Delete unwanted points explicitly. They are stored under local custom Git refs, so normal branch pushes do not publish them. A mirror push includes custom refs.

Ignored files, unsaved editor buffers, and files inside submodule working directories are excluded. Submodule revisions are recorded, and recovery does not recursively update their working directories. Conflicted indexes cannot be snapshotted. An unborn repository uses an empty baseline commit on its recovery branch. For the demo, save a point in `workspace`, commit its changes, then restore the point and inspect both staged/unstaged versions of `src/app.ts` and the untracked note.

## 3. Remember repeated conflict resolutions

1. Open **Actions → Conflict Resolution Memory** and enable it for the repository. This sets Git's local automatic rerere application to false so StrataGit can offer suggestions first. It does not alter global Git configuration.
2. Resolve and Apply a text conflict. The app records the conflict and reviewed result in Git's local rr-cache, using a temporary worktree and index for cache operations.
3. When that conflict recurs, the merge editor offers **Preview remembered result**. Review the complete result and choose **Use reviewed result** to load an undoable editor draft. Apply still explicitly controls saving/staging.
4. **Forget this resolution** discards the matching cached resolution. Disabling memory retains the cache and leaves Git's automatic application disabled.

To repeat a conflict in the demo, enable memory in `merge-standard`, resolve and Apply its JSON file without continuing the merge, abort the merge, and merge `demo/simple-incoming` again. Binary, submodule, and deletion-only conflicts use explicit file-side choices. If automatic rerere is separately re-enabled in Git, the settings view warns that Git may already fill working files.

## 4. Compare a branch before and after rewriting

1. Perform an in-app branch/interactive rebase, reword, drop, or reorder operation. Pulls configured to rebase are also recorded when an upstream is available. The app retains the old base/tip before the operation and new base/tip after completion.
2. Completed rewrites that change HEAD automatically open **Rebase & Rewrite Comparison**. Conflict-paused sessions remain paused until Continue/Abort; interactive rebase no longer reloads the app after success.
3. Filter unchanged, changed, removed, and added commits. Select a row to inspect its patch comparison, or open the full old/new commit details. Copy raw output for sharing or inspecting a long result.
4. Reopen saved records from Actions after an app restart. A session ended outside the app is labeled **ended**, since StrataGit cannot confirm whether it completed or was aborted. Refresh the records after an external continuation.
5. For a manual comparison, select **Custom ranges** and enter a base and tip for each side. Bases are excluded and tips included. Inputs are resolved to commit hashes before comparison.
6. Delete a finished record to release its saved references. This does not alter branches or working files.

Requires Git 2.19+. The comparison uses Git range-diff; patch matching is heuristic and merges are excluded. Squashing or a large rewrite can show removed/added commits instead of a one-to-one match. Each range is capped at 500 non-merge commits, execution at 30 seconds, and rendered previews are explicitly bounded. Root commit rewrites use an empty baseline so the original root is included. Saved refs are kept out of the main graph.

Use the clean `history-playground` demo for reword/drop/squash operations. Restore points created before those operations provide a separate recovery path.

## 5. Monitor pinned repositories

Open the **Dashboard** tab, then pin a recently opened repository. Pin choices persist locally (up to 50); they do not alter Git remotes. Local refresh reads each workspace independently with at most three concurrent scans. It shows branch, unique changed files, staged files, conflicts, and ahead/behind against the last fetched upstream. It never changes the active repository or runs fetch.

**Refresh PRs / MRs** explicitly contacts the configured hosting provider and shows up to 100 loaded open requests. Configure credentials in Settings first. Provider errors are displayed per repository; PR information stays cached only while the dashboard is open and is not refreshed by a local scan. Click a repository name to open it. Missing folders remain pinned so you can unpin or reconnect them.
