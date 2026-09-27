export interface AiCommitParams {
  diff?: string;
  provider?: 'local' | 'openrouter' | 'groq' | 'gemini' | 'ollama' | 'pollinations' | 'custom';
  model?: string;
  apiKey?: string;
  endpoint?: string;
  promptStyle?: 'conventional' | 'simple' | 'detailed' | 'gitmoji';
}

/**
 * Intelligent local fallback generator that inspects the staged git diff
 * and produces a clean Conventional Commit message without external network dependency.
 */
export function generateLocalCommitMessage(
  diff: string,
  style: 'conventional' | 'simple' | 'detailed' | 'gitmoji' = 'conventional'
): string {
  if (!diff || !diff.trim()) {
    return 'chore: update repository files';
  }

  const lines = diff.split('\n');
  const filesChanged: { file: string; kind: 'add' | 'del' | 'mod' }[] = [];
  const addedLines: string[] = [];
  const deletedLines: string[] = [];

  let currentFile = '';
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const parts = line.split(' ');
      currentFile = (parts[3] || parts[2] || '').replace(/^b\//, '').replace(/^a\//, '');
      if (currentFile && !filesChanged.some((f) => f.file === currentFile)) {
        filesChanged.push({ file: currentFile, kind: 'mod' });
      }
    } else if (line.startsWith('new file mode') && filesChanged.length > 0) {
      filesChanged[filesChanged.length - 1].kind = 'add';
    } else if (line.startsWith('deleted file mode') && filesChanged.length > 0) {
      filesChanged[filesChanged.length - 1].kind = 'del';
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(line.slice(1).trim());
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletedLines.push(line.slice(1).trim());
    }
  }

  // Determine type
  let type = 'feat';
  let scope = '';
  let description = '';

  const fileNames = filesChanged.map((f) => f.file.toLowerCase());
  const allAdded = filesChanged.every((f) => f.kind === 'add');
  const allDeleted = filesChanged.every((f) => f.kind === 'del');

  // Scope detection
  if (filesChanged.length === 1) {
    const parts = filesChanged[0].file.split('/');
    scope = parts.length > 1 ? parts[parts.length - 2] : parts[0].split('.')[0];
  } else if (filesChanged.every((f) => f.file.startsWith('src/renderer/components/'))) {
    scope = 'ui';
  } else if (filesChanged.every((f) => f.file.includes('test') || f.file.includes('spec'))) {
    scope = 'test';
  }

  // Type & description detection
  if (fileNames.every((f) => f.endsWith('.md') || f.includes('docs/'))) {
    type = 'docs';
    description = allAdded ? 'add documentation' : 'update documentation';
  } else if (fileNames.every((f) => f.includes('test') || f.includes('spec'))) {
    type = 'test';
    description = 'add and update tests';
  } else if (fileNames.some((f) => f.endsWith('package.json') || f.endsWith('lock') || f.endsWith('.toml'))) {
    type = 'chore';
    description = 'update dependencies and build configuration';
  } else if (allDeleted) {
    type = 'refactor';
    description = `remove unused ${filesChanged.map((f) => f.file.split('/').pop()).join(', ')}`;
  } else if (allAdded) {
    type = 'feat';
    const mainFile = filesChanged[0].file.split('/').pop()?.split('.')[0] || 'component';
    description = `add ${mainFile} implementation`;
  } else {
    // Check line contents for fix/bug
    const hasFix = addedLines.some((l) => /fix|bug|issue|error|resolve|patch|prevent/i.test(l));
    const hasStyle = fileNames.every((f) => f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.less'));
    if (hasStyle) {
      type = 'style';
      description = 'update styling and theme layout';
    } else if (hasFix) {
      type = 'fix';
      description = `resolve issue in ${filesChanged.map((f) => f.file.split('/').pop()?.split('.')[0]).filter(Boolean).slice(0, 2).join(' and ')}`;
    } else {
      type = 'feat';
      const mainNames = filesChanged.map((f) => f.file.split('/').pop()?.split('.')[0]).filter(Boolean);
      description = `update ${mainNames.slice(0, 2).join(' and ')}${mainNames.length > 2 ? ' and related files' : ''}`;
    }
  }

  // Clean scope
  scope = scope.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 15);

  // Format by style
  if (style === 'gitmoji') {
    const emojiMap: Record<string, string> = {
      feat: '✨',
      fix: '🐛',
      docs: '📝',
      style: '💄',
      refactor: '♻️',
      test: '✅',
      chore: '🔧'
    };
    const emoji = emojiMap[type] || '✨';
    return `${emoji} ${type}${scope ? `(${scope})` : ''}: ${description}`;
  }

  if (style === 'simple') {
    return description.charAt(0).toUpperCase() + description.slice(1);
  }

  const header = `${type}${scope ? `(${scope})` : ''}: ${description}`;
  if (style === 'detailed' && filesChanged.length > 1) {
    const bullets = filesChanged
      .slice(0, 5)
      .map((f) => `- ${f.kind === 'add' ? 'create' : f.kind === 'del' ? 'delete' : 'update'} ${f.file}`);
    return `${header}\n\n${bullets.join('\n')}`;
  }

  return header;
}

/**
 * Calls AI endpoint or falls back to intelligent local generator.
 */
export async function generateCommitMessage(params: AiCommitParams): Promise<{ ok: boolean; message?: string; error?: string }> {
  const diff = params.diff?.trim() || '';
  const provider = params.provider || 'local';
  const style = params.promptStyle || 'conventional';

  // Fast offline/local smart generator without AI
  if (provider === 'local') {
    const localMsg = generateLocalCommitMessage(diff, style);
    return { ok: true, message: localMsg };
  }

  if (!diff) {
    return { ok: false, error: 'No staged changes found. Please stage files before generating a commit message.' };
  }

  const trimmedDiff = diff.slice(0, 8000); // Guard token limits

  const systemPrompt = `You are an expert Git assistant. Generate a concise, high-quality Git commit message based strictly on the provided staged diff.
Style requirement: ${style.toUpperCase()}.
Rules:
- First line MUST be under 72 characters.
- ${style === 'conventional' ? 'Format as Conventional Commit: <type>(<scope>): <imperative summary> (e.g. feat: ..., fix: ..., refactor: ..., chore: ...)' : 'Use concise imperative mood.'}
- If needed, follow with a blank line and up to 3 short bullet points starting with "- ".
- Output ONLY the commit message text. Do NOT wrap in markdown code blocks or quotes. Do NOT include preambles or explanations.`;

  // Try AI provider if configured
  try {
    let url = '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = null;

    if (provider === 'pollinations') {
      // Use free Pollinations text API
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
          ],
          model: params.model || 'openai-fast',
          seed: Math.floor(Math.random() * 10000)
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (response.ok) {
        const text = await response.text();
        const cleaned = cleanCommitText(text);
        if (cleaned) return { ok: true, message: cleaned };
      }
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${params.apiKey || ''}`;
      body = {
        model: params.model || 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers['Authorization'] = `Bearer ${params.apiKey || ''}`;
      body = {
        model: params.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      headers['Authorization'] = `Bearer ${params.apiKey || ''}`;
      body = {
        model: params.model || 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'ollama') {
      url = params.endpoint ? `${params.endpoint.replace(/\/+$/, '')}/chat/completions` : 'http://127.0.0.1:11434/v1/chat/completions';
      body = {
        model: params.model || 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'custom') {
      url = params.endpoint || '';
      if (params.apiKey) headers['Authorization'] = `Bearer ${params.apiKey}`;
      body = {
        model: params.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Staged diff:\n${trimmedDiff}` }
        ]
      };
    }

    if (url && body) {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        const cleaned = cleanCommitText(content);
        if (cleaned) return { ok: true, message: cleaned };
      } else {
        const errorText = await response.text();
        console.warn('AI provider response error:', response.status, errorText);
      }
    }
  } catch (err: unknown) {
    console.warn('AI request failed, falling back to local generator:', err);
  }

  // Graceful fallback to local generator
  const localMsg = generateLocalCommitMessage(diff, style);
  return { ok: true, message: localMsg };
}

function cleanCommitText(text?: string | null): string {
  if (!text) return '';
  let cleaned = text.trim();
  // Strip code block fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  // Strip surrounding quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export async function explainCodeChanges(
  diffText: string,
  config?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    endpoint?: string;
  }
): Promise<{ ok: boolean; explanation?: string; error?: string }> {
  if (!diffText || !diffText.trim()) {
    return { ok: false, error: 'No diff content provided to explain' };
  }

  const trimmedDiff = diffText.slice(0, 12000);
  const systemPrompt = `You are an expert code reviewer and software architect. Analyze the provided git diff and provide:
1. 🎯 Summary: A crisp 1-2 sentence overview of what this change achieves.
2. 🔑 Key Changes: Bullet points detailing key code modifications, components touched, and logic updates.
3. ⚠️ Potential Considerations: Any edge-cases, performance implications, or testing recommendations.
Keep your response concise, well-structured, formatted in clear markdown.`;

  const provider = config?.provider || 'pollinations';

  try {
    let url = '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: unknown = null;

    if (provider === 'pollinations') {
      const prompt = `${systemPrompt}\n\nDiff:\n${trimmedDiff}`;
      url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        return { ok: true, explanation: text.trim() };
      }
    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers['Authorization'] = `Bearer ${config?.apiKey || ''}`;
      body = {
        model: config?.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${config?.apiKey || ''}`;
      body = {
        model: config?.model || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Diff:\n${trimmedDiff}` }
        ]
      };
    } else if (provider === 'gemini') {
      url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      headers['Authorization'] = `Bearer ${config?.apiKey || ''}`;
      body = {
        model: config?.model || 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Diff:\n${trimmedDiff}` }
        ]
      };
    }

    if (url && body) {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return { ok: true, explanation: content.trim() };
      }
    }
  } catch (err) {
    console.warn('AI explain failed, using heuristic summary:', err);
  }

  const lines = diffText.split('\n');
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const p = line.split(' ');
      files.push((p[3] || p[2] || '').replace(/^[ab]\//, ''));
    } else if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  const explanation = `### 🎯 Change Overview
This revision modifies **${files.length || 1} file(s)** with **+${additions}** additions and **-${deletions}** deletions.

### 🔑 Files Changed
${files.slice(0, 8).map((f) => `- \`${f}\``).join('\n')}
${files.length > 8 ? `- *...and ${files.length - 8} more files*` : ''}

### 💡 Review Notes
- Ensure all automated unit/integration tests pass for modified modules.
- Check regression coverage across touched components.`;

  return { ok: true, explanation };
}

