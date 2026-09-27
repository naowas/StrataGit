import { create } from 'zustand';
import {
  BranchInfo,
  CommitDetail,
  FileDiff,
  FileStatusKind,
  GraphResult,
  GitStatus,
  StashInfo,
  DiffViewMode,
  DiffActiveTab,
  RepoOperationState,
  TagInfo,
  RemoteInfo,
  SubmoduleInfo,
  WorktreeInfo
} from '../../shared/types';
import { api, unwrap } from '../lib/api';

export type ActivePane = 'workdir' | 'commit' | 'file';

export interface OpenedDiff {
  /** workdir file (staged+unstaged combined) or commit file; null => working directory */
  commitHash: string | null;
  filePath: string;
  worktree?: boolean;
  staged?: boolean;
  status?: FileStatusKind;
}

interface AppState {
  tabs: { path: string; name: string }[];
  activeTab: string | null;
  recentRepos: string[];
  status: GitStatus | null;
  log: GraphResult | null;
  branches: { local: BranchInfo[]; remote: BranchInfo[] };
  tags: TagInfo[];
  remotes: RemoteInfo[];
  submodules: SubmoduleInfo[];
  worktrees: WorktreeInfo[];
  stashes: StashInfo[];
  selectedCommit: string | null;
  commitDetail: CommitDetail | null;
  openDiff: OpenedDiff | null;
  fileDiff: FileDiff | null;
  detailLoading: boolean;
  diffLoading: boolean;
  sidebarVisible: boolean;
  sidebarWidth: number;
  diffHeight: number;
  diffMaximized: boolean;
  diffViewMode: DiffViewMode;
  diffActiveTab: DiffActiveTab;
  operationState: RepoOperationState | null;
  conflictedFileToResolve: string | null;
  rebaseModalBaseCommit: string | null;
  tagModalCommit: string | null;
  addRemoteModalOpen: boolean;
  createRepoModalOpen: boolean;
  commandPaletteOpen: boolean;
  terminalDrawerOpen: boolean;
  terminalDrawerHeight: number;
  shortcutsModalOpen: boolean;
  toast: { kind: 'info' | 'error' | 'success'; text: string } | null;
  filter: string;
  commitLimit: number;
  isLoadingMoreCommits: boolean;
}

interface AppActions {
  init(): Promise<void>;
  openRepo(path: string): Promise<void>;
  openRepoDialog(): Promise<void>;
  closeTab(path: string): void;
  setActiveTab(path: string): void;
  refresh(): Promise<void>;
  loadMoreCommits(): Promise<void>;
  selectCommit(hash: string | null): Promise<void>;
  openFileDiff(d: OpenedDiff): Promise<void>;
  closeDiff(): void;
  setDiffHeight(h: number): void;
  toggleDiffMaximized(): void;
  setDiffViewMode(mode: DiffViewMode): void;
  setDiffActiveTab(tab: DiffActiveTab): void;
  reloadCurrentDiff(): Promise<void>;
  openConflictResolver(filePath: string): void;
  closeConflictResolver(): void;
  abortRepoOperation(): Promise<void>;
  continueRepoOperation(): Promise<void>;
  openRebaseModal(baseCommitHash: string): void;
  closeRebaseModal(): void;
  openCreateTagModal(commitHash?: string): void;
  closeCreateTagModal(): void;
  openAddRemoteModal(): void;
  closeAddRemoteModal(): void;
  openCreateRepoModal(): void;
  closeCreateRepoModal(): void;
  openCommandPalette(): void;
  closeCommandPalette(): void;
  toggleCommandPalette(): void;
  toggleTerminalDrawer(): void;
  setTerminalDrawerHeight(h: number): void;
  toggleShortcutsModal(): void;
  cherryPickCommit(hash: string): Promise<void>;
  setFilter(f: string): void;
  toggleSidebar(): void;
  setSidebarWidth(w: number): void;
  notify(kind: 'info' | 'error' | 'success', text: string): void;
  runAndRefresh(fn: () => Promise<unknown>, successMsg?: string): Promise<boolean>;
}

export type AppStore = AppState & AppActions;

export const WIP_HASH = '0000000-wip';

export const useApp = create<AppStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  recentRepos: [],
  status: null,
  log: null,
  branches: { local: [], remote: [] },
  tags: [],
  remotes: [],
  submodules: [],
  worktrees: [],
  stashes: [],
  selectedCommit: null,
  commitDetail: null,
  openDiff: null,
  fileDiff: null,
  detailLoading: false,
  diffLoading: false,
  sidebarVisible: true,
  sidebarWidth: 240,
  diffHeight: 360,
  diffMaximized: true,
  diffViewMode: (typeof localStorage !== 'undefined' && (localStorage.getItem('stratagit:diffViewMode') as DiffViewMode)) || 'unified',
  diffActiveTab: 'diff',
  operationState: null,
  conflictedFileToResolve: null,
  rebaseModalBaseCommit: null,
  tagModalCommit: null,
  addRemoteModalOpen: false,
  createRepoModalOpen: false,
  commandPaletteOpen: false,
  terminalDrawerOpen: false,
  terminalDrawerHeight: 220,
  shortcutsModalOpen: false,
  toast: null,
  filter: '',
  commitLimit: 300,
  isLoadingMoreCommits: false,

  async init() {
    const recent = (await unwrap(api.recentRepos()).catch(() => [])) as string[];
    set({ recentRepos: recent });
    if (recent.length > 0) await get().openRepo(recent[0]);
  },

  async openRepo(p) {
    try {
      const res = (await unwrap(api.openRepo(p))) as {
        ok: boolean;
        repo?: { path: string; name: string };
        error?: string;
      };
      if (!res.ok || !res.repo) {
        get().notify('error', res.error || 'Failed to open repository');
        return;
      }
      api.setActiveRepo(res.repo.path);
      const repo = res.repo;
      const tabs = [...get().tabs.filter((t) => t.path !== repo.path), { path: repo.path, name: repo.name }];
      set({ tabs, activeTab: repo.path });
      await get().refresh();
      get().notify('success', `Opened ${repo.name}`);
    } catch (err) {
      get().notify('error', String(err).replace('Error: ', ''));
    }
  },

  async openRepoDialog() {
    try {
      const res = (await unwrap(api.openRepoDialog())) as {
        ok: boolean;
        repo?: { path: string; name: string };
        error?: string;
      };
      if (res.ok && res.repo) await get().openRepo(res.repo.path);
    } catch (err) {
      if (String(err).includes('canceled')) return;
      get().notify('error', String(err).replace('Error: ', ''));
    }
  },

  closeTab(p) {
    const tabs = get().tabs.filter((t) => t.path !== p);
    let activeTab = get().activeTab;
    if (activeTab === p) activeTab = tabs.length > 0 ? tabs[tabs.length - 1].path : null;
    set({ tabs, activeTab, selectedCommit: null, commitDetail: null, openDiff: null, fileDiff: null, commitLimit: 300 });
    if (activeTab) {
      api.setActiveRepo(activeTab);
      void get().refresh();
    } else {
      set({
        status: null,
        log: null,
        branches: { local: [], remote: [] },
        tags: [],
        remotes: [],
        submodules: [],
        worktrees: [],
        stashes: []
      });
    }
  },

  setActiveTab(p) {
    set({ activeTab: p, selectedCommit: null, commitDetail: null, openDiff: null, fileDiff: null, commitLimit: 300 });
    api.setActiveRepo(p);
    void get().refresh();
  },

  async refresh() {
    const repo = get().activeTab;
    if (!repo) return;
    const limit = get().commitLimit || 300;
    try {
      const [status, log, branches, stashes, operationState, tags, remotes, submodules, worktrees] = await Promise.all([
        unwrap(api.getStatus()),
        unwrap(api.getLog(limit)),
        unwrap(api.getBranches()),
        unwrap(api.getStashes()),
        unwrap(api.getRepoOperationState()).catch(() => null),
        unwrap(api.getTags()).catch(() => []),
        unwrap(api.getRemotes()).catch(() => []),
        unwrap(api.getSubmodules()).catch(() => []),
        unwrap(api.getWorktrees()).catch(() => [])
      ]);
      set({ status, log, branches, stashes, operationState, tags, remotes, submodules, worktrees });
    } catch (err) {
      get().notify('error', String(err).replace('Error: ', ''));
    }
  },

  async loadMoreCommits() {
    const { activeTab, log, commitLimit, isLoadingMoreCommits } = get();
    if (!activeTab || isLoadingMoreCommits) return;
    if (!log || !log.hasMore) return;

    const newLimit = commitLimit + 300;
    set({ isLoadingMoreCommits: true });
    try {
      const nextLog = await unwrap(api.getLog(newLimit));
      set({
        log: nextLog,
        commitLimit: newLimit,
        isLoadingMoreCommits: false
      });
    } catch (err) {
      set({ isLoadingMoreCommits: false });
      get().notify('error', `Failed to load more commits: ${String(err)}`);
    }
  },

  async selectCommit(hash) {
    set({ selectedCommit: hash, commitDetail: null, detailLoading: true });
    if (!hash) {
      set({ detailLoading: false });
      return;
    }
    if (hash === WIP_HASH) {
      const status = get().status;
      const files = [
        ...(status?.staged || []).map((f) => ({ path: f.path, status: f.status })),
        ...(status?.unstaged || []).map((f) => ({ path: f.path, status: f.status }))
      ];
      set({
        commitDetail: {
          hash: WIP_HASH,
          shortHash: 'WIP',
          parents: [],
          message: 'Uncommitted changes',
          body: 'Working directory changes not yet committed',
          authorName: '',
          authorEmail: '',
          date: new Date().toISOString(),
          files,
          insertions: 0,
          deletions: 0
        },
        detailLoading: false
      });
      return;
    }
    const detail = await api.getCommitDetail(hash);
    if (get().selectedCommit === hash) {
      set({ commitDetail: detail, detailLoading: false });
      if (!detail) get().notify('error', 'Failed to load commit details');
    }
  },

  async openFileDiff(d) {
    set({ openDiff: d, fileDiff: null, diffLoading: true, diffMaximized: true });
    try {
      const diff = await api.getFileDiff(d.commitHash ?? '', d.filePath, {
        staged: d.staged,
        worktree: d.worktree ?? d.commitHash === null
      });
      set({
        fileDiff: diff ?? { path: d.filePath, hunks: [], insertions: 0, deletions: 0 },
        diffLoading: false
      });
    } catch (err) {
      set({ diffLoading: false });
      get().notify('error', String(err).replace('Error: ', ''));
    }
  },

  closeDiff() {
    set({ openDiff: null, fileDiff: null, diffMaximized: true });
  },

  setDiffHeight(h) {
    const minH = 120;
    const maxH = typeof window !== 'undefined' ? Math.max(minH, window.innerHeight - 150) : 800;
    set({ diffHeight: Math.max(minH, Math.min(maxH, h)) });
  },

  toggleDiffMaximized() {
    set({ diffMaximized: !get().diffMaximized });
  },

  setDiffViewMode(mode) {
    try {
      localStorage.setItem('stratagit:diffViewMode', mode);
    } catch {}
    set({ diffViewMode: mode });
  },

  setDiffActiveTab(tab) {
    set({ diffActiveTab: tab });
  },

  async reloadCurrentDiff() {
    const d = get().openDiff;
    if (!d) return;
    try {
      const diff = await api.getFileDiff(d.commitHash ?? '', d.filePath, {
        staged: d.staged,
        worktree: d.worktree ?? d.commitHash === null
      });
      set({
        fileDiff: diff ?? { path: d.filePath, hunks: [], insertions: 0, deletions: 0 }
      });
    } catch (err) {
      console.error('Failed to reload diff:', err);
    }
  },

  openConflictResolver(filePath) {
    set({ conflictedFileToResolve: filePath });
  },

  closeConflictResolver() {
    set({ conflictedFileToResolve: null });
  },

  async abortRepoOperation() {
    await get().runAndRefresh(async () => {
      await api.abortOperation();
      set({ conflictedFileToResolve: null });
    }, 'Operation aborted');
  },

  async continueRepoOperation() {
    await get().runAndRefresh(async () => {
      await api.continueOperation();
      set({ conflictedFileToResolve: null });
    }, 'Operation continued');
  },

  openRebaseModal(baseCommitHash) {
    set({ rebaseModalBaseCommit: baseCommitHash });
  },

  closeRebaseModal() {
    set({ rebaseModalBaseCommit: null });
  },

  openCreateTagModal(commitHash = 'HEAD') {
    set({ tagModalCommit: commitHash });
  },

  closeCreateTagModal() {
    set({ tagModalCommit: null });
  },

  openAddRemoteModal() {
    set({ addRemoteModalOpen: true });
  },

  closeAddRemoteModal() {
    set({ addRemoteModalOpen: false });
  },

  openCreateRepoModal() {
    set({ createRepoModalOpen: true });
  },

  closeCreateRepoModal() {
    set({ createRepoModalOpen: false });
  },

  openCommandPalette() {
    set({ commandPaletteOpen: true });
  },

  closeCommandPalette() {
    set({ commandPaletteOpen: false });
  },

  toggleCommandPalette() {
    set({ commandPaletteOpen: !get().commandPaletteOpen });
  },

  toggleTerminalDrawer() {
    set({ terminalDrawerOpen: !get().terminalDrawerOpen });
  },

  setTerminalDrawerHeight(h) {
    set({ terminalDrawerHeight: Math.max(120, Math.min(600, h)) });
  },

  toggleShortcutsModal() {
    set({ shortcutsModalOpen: !get().shortcutsModalOpen });
  },

  async cherryPickCommit(hash) {
    await get().runAndRefresh(async () => {
      const res = await api.cherryPick(hash);
      if (!res.ok) {
        if (res.hasConflicts) {
          const op = await api.getRepoOperationState();
          if (op.conflictedFiles.length > 0) {
            get().openConflictResolver(op.conflictedFiles[0]);
          }
          throw new Error('Cherry-pick produced merge conflicts. Please resolve conflicts.');
        }
        throw new Error(res.error || 'Cherry-pick failed');
      }
    }, 'Commit cherry-picked');
  },

  setFilter(f) {
    set({ filter: f });
  },

  toggleSidebar() {
    set({ sidebarVisible: !get().sidebarVisible });
  },

  setSidebarWidth(w) {
    set({ sidebarWidth: Math.max(52, Math.min(480, w)) });
  },

  notify(kind, text) {
    set({ toast: { kind, text } });
    const cur = text;
    setTimeout(() => {
      if (get().toast?.text === cur) set({ toast: null });
    }, 3500);
  },

  async runAndRefresh(fn, successMsg) {
    try {
      await unwrap(fn());
      await get().refresh();
      if (successMsg) get().notify('success', successMsg);
      return true;
    } catch (err) {
      get().notify('error', String(err).replace('Error: ', ''));
      return false;
    }
  }
}));

