/**
 * Commit-message generation.
 *
 * The message is produced by the SAME model the conversation is running on, so
 * the wording matches the rest of the session. Resolution order:
 *
 *   1. the session's live agent  → `agent.model.current()`
 *   2. the deployment default    → `ctx.agentDefaultModel.currentSelection()`
 *   3. give up with a clear error
 *
 * Only the staged diff is sent — no file contents beyond the hunks, no paths
 * outside the repo — and the patch is capped so a huge change cannot blow the
 * context window.
 */
import type { HostContext } from './host-context.js'
import { GitError, gitOrThrow } from './git.js'

const MAX_DIFF_CHARS = 12_000
const MAX_TOKENS = 400

export interface ModelRoute {
  provider: string
  model: string
  reasoningEffort?: string
}

interface AgentModelApi {
  current?: () => ModelRoute | undefined
}

interface AgentLike {
  model?: AgentModelApi
}

export interface GenerationResult {
  message: string
  /** Which model actually answered, so the UI can show it. */
  provider: string
  model: string
}

/** Resolve the route for a session, falling back to the deployment default. */
export function resolveRoute(ctx: HostContext, sessionId: string): ModelRoute | null {
  if (sessionId !== '') {
    try {
      const agents = ctx.get('agents') as
        | { get?: (id: string) => AgentLike | undefined; list?: () => unknown[] }
        | undefined
      const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
      const route = agent?.model?.current?.()
      if (route !== undefined && route.provider !== '' && route.model !== '') return route
    } catch {
      // A profile without the agents service falls through to the default.
    }
  }
  try {
    const defaults = ctx.get('agentDefaultModel') as
      | { currentSelection?: () => ModelRoute | undefined }
      | undefined
    const route = defaults?.currentSelection?.()
    if (route !== undefined && route.provider !== '' && route.model !== '') return route
  } catch {
    // no default configured
  }
  return null
}

/** The staged patch (falling back to the working tree when nothing is staged). */
async function stagedPatch(cwd: string): Promise<{ patch: string; staged: boolean; files: string[] }> {
  const stagedNames = (await gitOrThrow(cwd, ['diff', '--cached', '--name-only'])).trim()
  const staged = stagedNames !== ''
  const args = staged ? ['diff', '--no-color', '--no-ext-diff', '--cached'] : ['diff', '--no-color', '--no-ext-diff']
  const patch = await gitOrThrow(cwd, args).catch(() => '')
  const names = staged ? stagedNames : (await gitOrThrow(cwd, ['diff', '--name-only'])).trim()
  const files = names
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  return { patch, staged, files }
}

const SYSTEM_PROMPT = [
  'You write git commit messages.',
  'Answer with ONE commit message and nothing else: no quotes, no code fences, no explanation.',
  'First line: imperative mood, at most 72 characters, no trailing period.',
  'Use the same language as the existing repository history when it is visible; otherwise English.',
  'If the change spans unrelated concerns, add a blank line and 1-3 short bullet points.',
].join(' ')

function buildUserPrompt(files: string[], patch: string, staged: boolean): string {
  const trimmed = patch.length > MAX_DIFF_CHARS ? `${patch.slice(0, MAX_DIFF_CHARS)}\n… (truncated)` : patch
  const scope = staged ? 'staged for commit' : 'modified in the working tree (nothing is staged)'
  return [
    `These changes are ${scope}.`,
    files.length === 0 ? '' : `Files:\n${files.slice(0, 60).join('\n')}`,
    '',
    'Diff:',
    '```diff',
    trimmed,
    '```',
  ]
    .filter((part) => part !== '')
    .join('\n')
}

function cleanMessage(raw: string): string {
  let text = raw.trim()
  // Models like to wrap the answer in a fence even when told not to.
  const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(text)
  if (fence !== null) text = fence[1].trim()
  text = text.replace(/^["'`]+|["'`]+$/g, '').trim()
  // Drop a leading "Commit message:" label some models add.
  text = text.replace(/^(commit message|message|提交信息|提交消息)\s*[:：]\s*/i, '')
  return text.trim()
}

/**
 * Ask the session's model for a commit message.
 *
 * Streaming is used because that is the only public entry point; the deltas are
 * concatenated and the terminal chunk's failure (if any) is surfaced as a normal
 * git error so the popup's existing error banner shows it.
 */
export async function generateCommitMessage(
  ctx: HostContext,
  cwd: string,
  sessionId: string,
): Promise<GenerationResult> {
  const route = resolveRoute(ctx, sessionId)
  if (route === null) {
    throw new GitError('没有可用的模型：当前会话没有选定模型，也没有部署默认模型', 409)
  }

  const { patch, staged, files } = await stagedPatch(cwd)
  if (patch.trim() === '' && files.length === 0) {
    throw new GitError('没有可用来生成提交消息的改动', 409)
  }

  const llm = ctx.get('llm') as
    | {
        prepareCall?: (
          config: { provider: string; model: string; maxTokens?: number; reasoningEffort?: string },
          signal?: AbortSignal,
        ) => Promise<{ config: Record<string, unknown>; stream: (options: Record<string, unknown>) => AsyncIterable<LlmChunk> }>
        stream?: (options: Record<string, unknown>) => AsyncIterable<LlmChunk>
      }
    | undefined
  if (llm === undefined) {
    throw new GitError('当前 profile 没有挂载模型服务（llm）', 503)
  }

  // `system` is its own top-level option — putting a system message inside
  // `messages` gets it dropped by the adapter, which is why the first attempt
  // produced no text at all.
  const messages = [
    { role: 'user', content: [{ type: 'text', text: buildUserPrompt(files, patch, staged) }] },
  ]
  const baseOptions: Record<string, unknown> = {
    messages,
    system: SYSTEM_PROMPT,
    maxTokens: MAX_TOKENS,
  }
  if (route.reasoningEffort !== undefined) baseOptions.reasoningEffort = route.reasoningEffort

  let stream: (options: Record<string, unknown>) => AsyncIterable<LlmChunk>
  if (typeof llm.prepareCall === 'function') {
    let call: { config: Record<string, unknown>; stream: (options: Record<string, unknown>) => AsyncIterable<LlmChunk> }
    try {
      // prepareCall resolves the route and validates credentials, so the
      // "no API key" / "no adapter" failures surface HERE, not in the stream.
      call = await llm.prepareCall(
        { provider: route.provider, model: route.model, maxTokens: MAX_TOKENS },
        undefined,
      )
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      throw new GitError(`生成提交消息失败：${friendlyFailure(raw, route)}`, 502)
    }
    const prepared = call.config
    stream = call.stream
    delete baseOptions.maxTokens
    Object.assign(baseOptions, prepared)
  } else if (typeof llm.stream === 'function') {
    stream = llm.stream
    baseOptions.provider = route.provider
    baseOptions.model = route.model
  } else {
    throw new GitError('模型服务不提供 stream()', 503)
  }

  let text = ''
  let failure = ''
  try {
    for await (const chunk of stream(baseOptions)) {
      switch (chunk.type) {
        case 'text-delta':
          if (typeof chunk.text === 'string') text += chunk.text
          break
        case 'block-end':
          if (chunk.block?.type === 'text' && text === '' && typeof chunk.block.text === 'string') {
            text = chunk.block.text
          }
          break
        case 'finish':
          if (chunk.reason?.kind === 'error' || chunk.reason?.type === 'error') {
            failure = describeFinishError(chunk.reason)
          }
          break
        default:
          break
      }
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    throw new GitError(`生成提交消息失败：${friendlyFailure(raw, route)}`, 502)
  }

  const message = cleanMessage(text)
  if (message === '') {
    throw new GitError(
      failure === ''
        ? `模型（${route.provider}/${route.model}）没有返回文本，可能只产出了 reasoning 或被上限截断`
        : `生成提交消息失败：${friendlyFailure(failure, route)}`,
      502,
    )
  }
  return { message, provider: route.provider, model: route.model }
}

interface LlmChunk {
  type: string
  index?: number
  text?: string
  block?: { type?: string; text?: string }
  reason?: {
    kind?: string
    type?: string
    message?: string
    failure?: { message?: string; code?: string }
  }
}

function describeFinishError(reason: NonNullable<LlmChunk['reason']>): string {
  const detail = reason.failure?.message ?? reason.message
  if (typeof detail === 'string' && detail !== '') return detail
  return '模型调用失败'
}

/**
 * Turn the raw provider error into something the user can act on.
 *
 * The common failure on this machine is a route with no credentials, and the
 * adapter's own wording ("store DEEPSEEK_API_KEY through the credentials
 * service") assumes the reader knows the Models page exists.
 */
function friendlyFailure(raw: string, route: ModelRoute): string {
  if (/no adapter registered/i.test(raw)) {
    return `provider「${route.provider}」没有注册适配器：这个 profile 没有安装对应的模型插件`
  }
  if (/no API key|not authenticated|unauthori[sz]ed|401/i.test(raw)) {
    return `provider「${route.provider}」缺少凭据：先在「设置 → 模型」里填好密钥，或换一个已配置的会话模型（原始信息：${raw}）`
  }
  if (/rate limit|429/i.test(raw)) {
    return `模型被限流，稍后再试（原始信息：${raw}）`
  }
  return raw
}
