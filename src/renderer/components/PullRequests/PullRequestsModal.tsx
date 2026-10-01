import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X
} from 'lucide-react';
import type {
  HostedPullRequest,
  PullRequestContext,
  PullRequestCredentialStatus,
  PullRequestProvider,
  RemoteInfo
} from '../../../shared/types';
import { useApp } from '../../store';
import { api } from '../../lib/api';

const providerInfo: Record<PullRequestProvider, { label: string; tokenLabel: string; tokenUrl: string; tokenHelp: string }> = {
  github: {
    label: 'GitHub', tokenLabel: 'Personal access token',
    tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
    tokenHelp: 'Give the token Pull requests read and write access to this repository.'
  },
  gitlab: {
    label: 'GitLab', tokenLabel: 'Personal access token',
    tokenUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens?name=StrataGit&scopes=api',
    tokenHelp: 'Create a token with the api scope. For self-managed GitLab, create it on your GitLab server.'
  },
  bitbucket: {
    label: 'Bitbucket Cloud', tokenLabel: 'API token',
    tokenUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    tokenHelp: 'Allow repository read plus pull request read and write. Use your Atlassian account email with this token.'
  }
};

function dateLabel(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function branchTitle(branch: string): string {
  return branch.replace(/^(feature|feat|bugfix|fix|hotfix|release)[/\-_]+/i, '').replace(/[-_]/g, ' ').trim();
}

export function PullRequestsModal() {
  const isOpen = useApp((state) => state.pullRequestsModalOpen);
  const close = useApp((state) => state.closePullRequestsModal);
  const notify = useApp((state) => state.notify);
  const branches = useApp((state) => state.branches);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [providerOverride, setProviderOverride] = useState<PullRequestProvider | undefined>();
  const [context, setContext] = useState<PullRequestContext | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<PullRequestCredentialStatus | null>(null);
  const [token, setToken] = useState('');
  const [bitbucketEmail, setBitbucketEmail] = useState('');
  const [editingCredential, setEditingCredential] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingCredential, setSavingCredential] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const loadId = useRef(0);

  const activeProvider = context?.provider || providerOverride;
  const provider = activeProvider ? providerInfo[activeProvider] : null;
  const currentBranchRequest = useMemo(() =>
    context?.pullRequests.find((request) => request.sourceBranch === context.currentBranch && request.state === 'open') || null,
  [context]);
  const selectedRequest = context?.pullRequests.find((request) => request.id === selectedRequestId) || currentBranchRequest;
  const configured = activeProvider ? !!credentialStatus?.[activeProvider] : false;

  const loadContext = useCallback(async (remoteName?: string, override?: PullRequestProvider, currentRemotes?: RemoteInfo[]) => {
    const requestId = ++loadId.current;
    setLoading(true);
    setMessage('');
    try {
      const [result, savedCredentials] = await Promise.all([
        api.getPullRequestContext(remoteName, override),
        api.getPullRequestCredentialStatus()
      ]);
      if (requestId !== loadId.current) return;
      setContext(result);
      setCredentialStatus(savedCredentials);
      if (result.error) setMessage(result.error);
      if (result.remoteName) setSelectedRemote(result.remoteName);
      if (result.provider && result.defaultBranch) setTargetBranch((existing) => existing || result.defaultBranch);
      if (result.currentBranch) setTitle((existing) => existing || branchTitle(result.currentBranch));
      if (!result.provider && currentRemotes && currentRemotes.length === 0) setMessage(result.error || 'Add a Git remote to view hosted requests.');
    } catch (error) {
      if (requestId === loadId.current) setMessage(String(error).replace(/^Error:\s*/, ''));
    } finally {
      if (requestId === loadId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setContext(null);
    setToken('');
    setTitle('');
    setDescription('');
    setTargetBranch('');
    setEditingCredential(false);
    setProviderOverride(undefined);
    setSelectedRequestId(null);
    setMessage('');
    void Promise.all([api.getRemotes(), api.getPullRequestCredentialStatus()]).then(([remoteList, savedCredentials]) => {
      if (!current) return;
      setRemotes(remoteList);
      setCredentialStatus(savedCredentials);
      const tracking = branches.local.find((branch) => branch.isCurrent)?.tracking || '';
      const trackingRemote = tracking.split('/')[0];
      const initialRemote = remoteList.find((remote) => remote.name === trackingRemote)?.name ||
        remoteList.find((remote) => remote.name === 'origin')?.name || remoteList[0]?.name || '';
      setSelectedRemote(initialRemote);
      void loadContext(initialRemote || undefined, undefined, remoteList);
    }).catch((error) => {
      if (current) setMessage(String(error).replace(/^Error:\s*/, ''));
    });
    return () => {
      current = false;
      loadId.current++;
    };
  }, [isOpen, branches.local, loadContext]);

  useEffect(() => {
    if (!context) return;
    setTargetBranch(context.defaultBranch || '');
    setSelectedRequestId(null);
  }, [context?.remoteName, context?.provider, context?.defaultBranch]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (selectedRequest) setSelectedRequestId(selectedRequest.id);
  }, [selectedRequest?.id]);

  if (!isOpen) return null;

  const selectRemote = (remoteName: string) => {
    setSelectedRemote(remoteName);
    setContext(null);
    setProviderOverride(undefined);
    setMessage('');
    void loadContext(remoteName || undefined, undefined, remotes);
  };

  const selectProvider = (nextProvider: PullRequestProvider | '') => {
    const value = nextProvider || undefined;
    setProviderOverride(value);
    setContext(null);
    setMessage('');
    if (selectedRemote) void loadContext(selectedRemote, value, remotes);
  };

  const saveCredential = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProvider || savingCredential) return;
    setSavingCredential(true);
    setMessage('');
    try {
      const result = await api.savePullRequestCredential(activeProvider, {
        token,
        ...(activeProvider === 'bitbucket' ? { username: bitbucketEmail } : {})
      });
      if (!result.ok) throw new Error(result.error || 'Could not save this token.');
      setToken('');
      setEditingCredential(false);
      await loadContext(selectedRemote || undefined, providerOverride, remotes);
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setSavingCredential(false);
    }
  };

  const disconnectProvider = async () => {
    if (!activeProvider) return;
    try {
      await api.removePullRequestCredential(activeProvider);
      setCredentialStatus((saved) => saved ? { ...saved, [activeProvider]: false } : saved);
      setEditingCredential(false);
      setContext((existing) => existing ? { ...existing, credentialConfigured: false, pullRequests: [] } : existing);
      setMessage('Provider token removed from this device.');
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    }
  };

  const createRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!context?.remoteName || creatingRequest) return;
    setCreatingRequest(true);
    setMessage('Pushing the current branch and creating the request…');
    try {
      const result = await api.createHostedPullRequest({
        remoteName: context.remoteName,
        title,
        description,
        targetBranch,
        providerOverride
      });
      if (!result.ok || !result.pullRequest) throw new Error(result.error || 'Could not create the request.');
      setMessage('Request created.');
      setSelectedRequestId(result.pullRequest.id);
      await loadContext(context.remoteName, providerOverride, remotes);
      notify('success', `${provider?.label || 'Provider'} request created`);
    } catch (error) {
      setMessage(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setCreatingRequest(false);
    }
  };

  const activePullRequests = context?.pullRequests.filter((request) => request.state === 'open') || [];
  const providerNeedsChoosing = !context?.provider && !!context?.remoteName;
  const canCreate = !!context?.credentialConfigured && !!context.currentBranch && !!context.defaultBranch &&
    !context.error && context.currentBranch !== targetBranch && !!title.trim() && !currentBranchRequest;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <div className="w-full max-w-6xl max-h-[90vh] rounded-xl bg-panel border border-edge shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <header className="flex items-center justify-between px-5 py-4 border-b border-edge bg-panel2/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
              <GitPullRequest size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-fg">Pull request context</h2>
              <p className="text-[11px] text-dim truncate">GitHub pull requests, GitLab merge requests, and Bitbucket pull requests</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="btn-icon !w-8 !h-8 text-dim hover:text-fg"
              title="Refresh pull requests"
              onClick={() => void loadContext(selectedRemote || undefined, providerOverride, remotes)}
              disabled={loading || !selectedRemote}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            <button className="btn-icon !w-8 !h-8 text-dim hover:text-fg" onClick={close} title="Close"><X size={15} /></button>
          </div>
        </header>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-edge bg-panel2/20 shrink-0">
          <label className="text-[11px] text-dim shrink-0" htmlFor="pr-remote">Git remote</label>
          <select
            id="pr-remote"
            className="input !w-auto min-w-44 max-w-xs text-xs"
            value={selectedRemote}
            onChange={(event) => selectRemote(event.target.value)}
            disabled={!remotes.length || loading}
          >
            {remotes.length === 0 ? <option value="">No remote configured</option> : null}
            {remotes.map((remote) => <option key={remote.name} value={remote.name}>{remote.name} · {remote.fetchUrl}</option>)}
          </select>
          {context?.provider && provider ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-2.5 py-1 text-[10px] text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-add" />{provider.label}
            </span>
          ) : null}
          {context?.repository ? <span className="text-[11px] text-faint truncate">{context.repository}</span> : null}
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-edge">
            <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-fg">Open requests</h3>
                <p className="text-[10px] text-dim mt-0.5">{context?.currentBranch ? <>Current branch: <span className="font-mono text-accent">{context.currentBranch}</span></> : 'Choose a remote to load request context'}</p>
              </div>
              {context?.repositoryUrl ? <a href={context.repositoryUrl} target="_blank" rel="noreferrer" className="btn !px-2 !py-1 text-[10px] gap-1"><ExternalLink size={11} /> Repository</a> : null}
            </div>

            {providerNeedsChoosing ? (
              <div className="p-5 border-b border-edge bg-panel2/25 space-y-2">
                <div className="text-xs font-medium text-fg">Choose the hosting service</div>
                <p className="text-[11px] text-dim">StrataGit could not identify this remote. This also works with self-managed GitLab servers.</p>
                <select className="input max-w-xs text-xs" value={providerOverride || ''} onChange={(event) => selectProvider(event.target.value as PullRequestProvider | '')}>
                  <option value="">Select provider…</option>
                  <option value="gitlab">GitLab (including self-managed)</option>
                </select>
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {loading && !context ? (
                <div className="py-14 flex flex-col items-center gap-2 text-xs text-dim"><Loader2 size={18} className="animate-spin text-accent" />Loading repository context…</div>
              ) : !context?.provider ? (
                <div className="py-12 px-6 text-center text-xs text-dim">
                  <GitBranch size={21} className="mx-auto mb-2 text-faint" />
                  {message || context?.error || 'Add a Git remote to view pull requests.'}
                </div>
              ) : context.error ? (
                <div className="rounded-lg border border-warn/30 bg-warn/5 p-4 text-[11px] leading-relaxed text-warn">
                  <AlertCircle size={14} className="inline mr-1.5" />{context.error}
                </div>
              ) : !configured ? (
                <div className="py-12 px-6 text-center text-xs text-dim">
                  <KeyRound size={22} className="mx-auto mb-2 text-faint" />
                  Connect your {provider?.label} account to load open requests for this repository.
                </div>
              ) : loading && !context.pullRequests.length ? (
                <div className="py-14 flex flex-col items-center gap-2 text-xs text-dim"><Loader2 size={18} className="animate-spin text-accent" />Loading open requests…</div>
              ) : activePullRequests.length === 0 ? (
                <div className="py-12 px-6 text-center text-xs text-dim">
                  <CheckCircle2 size={22} className="mx-auto mb-2 text-add" />No open requests found for this repository.
                </div>
              ) : activePullRequests.map((request) => <PullRequestRow
                key={request.id}
                request={request}
                isCurrent={request.sourceBranch === context.currentBranch}
                isSelected={request.id === selectedRequest?.id}
                onSelect={() => setSelectedRequestId(request.id)}
              />)}
            </div>

            {selectedRequest ? <RequestDetails request={selectedRequest} /> : null}
          </section>

          <section className="min-h-0 overflow-y-auto p-5 space-y-5">
            {!provider ? (
              <div className="rounded-xl border border-edge bg-panel2/30 p-5 text-xs text-dim">
                <AlertCircle size={16} className="text-warn mb-2" />Choose a supported hosting service to connect an account.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-edge bg-panel2/35 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-7 h-7 rounded-lg bg-add/10 border border-add/20 flex items-center justify-center text-add"><ShieldCheck size={14} /></div>
                      <div>
                        <h3 className="text-xs font-semibold text-fg">{provider.label} connection</h3>
                        <p className="text-[10px] text-dim mt-0.5">Tokens are encrypted with your operating system keychain on this device.</p>
                      </div>
                    </div>
                    {configured && !editingCredential ? <span className="text-[10px] text-add flex items-center gap-1"><CheckCircle2 size={12} /> Token saved</span> : null}
                  </div>

                  {configured && !editingCredential ? (
                    <div className="flex items-center gap-2 pl-9">
                      <button className="btn text-[10px] !px-2.5 !py-1" onClick={() => setEditingCredential(true)}>Change token</button>
                      <button className="btn text-[10px] !px-2.5 !py-1 text-del" onClick={() => void disconnectProvider()}>Remove connection</button>
                    </div>
                  ) : (
                    <form className="pl-9 space-y-2.5" onSubmit={(event) => void saveCredential(event)}>
                      {activeProvider === 'bitbucket' ? (
                        <label className="block text-[10px] text-dim space-y-1">
                          Atlassian account email
                          <input className="input w-full text-xs" type="email" autoComplete="username" value={bitbucketEmail} onChange={(event) => setBitbucketEmail(event.target.value)} placeholder="you@example.com" required />
                        </label>
                      ) : null}
                      <label className="block text-[10px] text-dim space-y-1">
                        {provider.tokenLabel}
                        <div className="flex gap-1.5">
                          <input className="input min-w-0 flex-1 text-xs" type={showToken ? 'text' : 'password'} autoComplete="new-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={configured ? 'Enter a replacement token' : 'Paste your access token'} required />
                          <button type="button" className="btn text-[10px] !px-2" onClick={() => setShowToken((shown) => !shown)}>{showToken ? 'Hide' : 'Show'}</button>
                        </div>
                      </label>
                      <p className="text-[10px] text-dim leading-relaxed">{provider.tokenHelp}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={provider.tokenUrl} target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline inline-flex items-center gap-1">Create token <ExternalLink size={10} /></a>
                        <button type="submit" className="btn btn-primary !px-3 !py-1 text-[10px]" disabled={savingCredential || !token.trim()}>
                          {savingCredential ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : configured ? 'Replace token' : 'Save token'}
                        </button>
                        {configured ? <button type="button" className="btn !px-2.5 !py-1 text-[10px]" onClick={() => { setEditingCredential(false); setToken(''); }}>Cancel</button> : null}
                      </div>
                    </form>
                  )}
                </div>

                {configured ? (
                  <form className="rounded-xl border border-edge bg-panel2/35 p-4 space-y-3" onSubmit={(event) => void createRequest(event)}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold text-fg">Create from current branch</h3>
                        <p className="text-[10px] text-dim mt-0.5">StrataGit pushes this branch, then creates a request.</p>
                      </div>
                      {context?.currentBranch ? <span className="max-w-36 truncate text-[10px] font-mono text-accent" title={context.currentBranch}>{context.currentBranch}</span> : null}
                    </div>
                    {currentBranchRequest ? (
                      <div className="rounded-lg border border-add/25 bg-add/5 p-3 text-[11px] text-dim flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-add shrink-0" />An open request already exists for this branch.
                        <button type="button" className="ml-auto text-accent hover:underline shrink-0" onClick={() => setSelectedRequestId(currentBranchRequest.id)}>View</button>
                      </div>
                    ) : (
                      <>
                        <label className="block text-[10px] text-dim space-y-1">
                          Target branch
                          <input className="input w-full font-mono text-xs" value={targetBranch} onChange={(event) => setTargetBranch(event.target.value)} placeholder="main" required />
                        </label>
                        <label className="block text-[10px] text-dim space-y-1">
                          Title
                          <input className="input w-full text-xs" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What does this change do?" required />
                        </label>
                        <label className="block text-[10px] text-dim space-y-1">
                          Description <span className="text-faint">(optional)</span>
                          <textarea className="input w-full min-h-24 resize-y text-xs" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context for reviewers…" />
                        </label>
                        <p className="text-[10px] text-faint leading-relaxed">Only committed changes are pushed. Uncommitted edits remain in your working tree and are not part of the request.</p>
                        <button type="submit" className="btn btn-primary w-full justify-center !py-2 text-xs" disabled={!canCreate || creatingRequest}>
                          {creatingRequest ? <><Loader2 size={13} className="animate-spin" /> Pushing branch &amp; creating…</> : <><GitPullRequest size={13} /> Push branch &amp; create {activeProvider === 'gitlab' ? 'merge request' : 'pull request'}</>}
                        </button>
                      </>
                    )}
                  </form>
                ) : null}
              </>
            )}

            {message ? <div className={`rounded-lg border p-3 text-[11px] leading-relaxed ${/created\.$/.test(message) || /removed from this device/.test(message) ? 'border-add/30 bg-add/5 text-add' : /Pushing/.test(message) ? 'border-accent/30 bg-accent/5 text-accent' : 'border-warn/30 bg-warn/5 text-warn'}`}>
              {/Pushing/.test(message) ? <Loader2 size={12} className="inline mr-1.5 animate-spin" /> : <AlertCircle size={12} className="inline mr-1.5" />}{message}
            </div> : null}
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-edge bg-panel2/30 shrink-0">
          <span className="text-[10px] text-faint">{configured ? `${activePullRequests.length} open request${activePullRequests.length === 1 ? '' : 's'}` : 'Access tokens stay encrypted on this device.'}</span>
          <button className="btn !px-3 !py-1.5 text-[11px]" onClick={close}>Done</button>
        </footer>
      </div>
    </div>
  );
}

function PullRequestRow({
  request,
  isCurrent,
  isSelected,
  onSelect
}: {
  request: HostedPullRequest;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${isSelected ? 'border-accent/40 bg-accent/8' : 'border-edge/70 bg-panel2/20 hover:bg-panel2/60'}`}
    >
      <div className="flex items-start gap-2.5">
        <GitPullRequest size={14} className={`mt-0.5 shrink-0 ${request.draft ? 'text-dim' : 'text-add'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-xs font-medium text-fg">{request.title}</span>
            {isCurrent ? <span className="shrink-0 text-[9px] rounded bg-accent/15 px-1.5 py-0.5 text-accent">Current branch</span> : null}
          </div>
          <div className="mt-1.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-[10px] text-dim">
            <span className="font-mono">{request.sourceBranch}</span><span>→</span><span className="font-mono">{request.targetBranch}</span>
            <span>·</span><span>{request.author}</span>
            {dateLabel(request.updatedAt || request.createdAt) ? <><span>·</span><span>{dateLabel(request.updatedAt || request.createdAt)}</span></> : null}
            {request.draft ? <span className="rounded border border-edge px-1 py-0.5 text-faint">Draft</span> : null}
          </div>
        </div>
        <span className="text-[10px] font-mono text-faint">#{request.id}</span>
      </div>
    </button>
  );
}

function RequestDetails({ request }: { request: HostedPullRequest }) {
  return (
    <div className="shrink-0 border-t border-edge bg-panel2/30 px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] text-dim">
        <GitBranch size={12} className="text-accent" />
        <span className="font-mono truncate">{request.sourceBranch}</span><span>→</span><span className="font-mono truncate">{request.targetBranch}</span>
        <span className="ml-auto text-faint">{request.draft ? 'Draft' : 'Open'}</span>
      </div>
      <a href={request.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline">
        Open on provider <ExternalLink size={11} />
      </a>
    </div>
  );
}
