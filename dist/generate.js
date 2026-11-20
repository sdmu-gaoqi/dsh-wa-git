import { GitError, gitOrThrow } from './git.js';
const MAX_DIFF_CHARS = 12_000;
const MAX_TOKENS = 400;
/** Resolve the route for a session, falling back to the deployment default. */
export function resolveRoute(ctx, sessionId) {
    if (sessionId !== '') {
        try {
            const agents = ctx.get('agents');
            const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined;
            const route = agent?.model?.current?.();
            if (route !== undefined && route.provider !== '' && route.model !== '')
                return route;
        }
        catch {
            // A profile without the agents service falls through to the default.
        }
    }
    try {
        const defaults = ctx.get('agentDefaultModel');
        const route = defaults?.currentSelection?.();
        if (route !== undefined && route.provider !== '' && route.model !== '')
            return route;
    }
    catch {
        // no default configured
    }
    return null;
}
/** The staged patch (falling back to the working tree when nothing is staged). */
async function stagedPatch(cwd) {
    const stagedNames = (await gitOrThrow(cwd, ['diff', '--cached', '--name-only'])).trim();
    const staged = stagedNames !== '';
    const args = staged ? ['diff', '--no-color', '--no-ext-diff', '--cached'] : ['diff', '--no-color', '--no-ext-diff'];
    const patch = await gitOrThrow(cwd, args).catch(() => '');
    const names = staged ? stagedNames : (await gitOrThrow(cwd, ['diff', '--name-only'])).trim();
    const files = names
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
    return { patch, staged, files };
}
const SYSTEM_PROMPT = [
    'You write git commit messages following the Conventional Commits specification.',
    'Answer with ONE commit message and nothing else: no quotes, no code fences, no explanation.',
    'The subject line MUST start with a type prefix in the exact form `type(scope): subject` or `type: subject`.',
    'Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.',
    'Use `feat` for new features, `fix` for bug fixes, `refactor` for code changes that neither add a feature nor fix a bug, `chore` for maintenance/dependencies/config.',
    'The `scope` in parentheses is optional; use a short noun for the affected area when it adds clarity.',
    'Keep the whole subject line at most 72 characters; use imperative mood and no trailing period.',
    'Write the subject in the same language as the recent commit examples when provided; otherwise English.',
    'Match the exact prefix style of the recent commit examples above all else.',
    'If the change spans unrelated concerns, add a blank line and 1-3 short bullet points.',
].join(' ');
/**
 * A few recent commit subjects, fed to the model as format examples so the
 * generated prefix style matches the repository's own convention (language,
 * whether a scope is used, etc.). Best effort: returns [] if history is absent.
 */
async function recentSubjects(cwd, limit = 8) {
    const raw = await gitOrThrow(cwd, ['log', '-n', String(limit), '--pretty=format:%s']).catch(() => '');
    return raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
}
function matchesConventional(message) {
    const first = message.split('\n')[0] ?? '';
    return /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?:\s+\S/.test(first);
}
/**
 * Normalise the model's answer so the subject always has a valid type prefix.
 * If the model already produced a Conventional Commits subject, keep it as-is.
 * Otherwise infer the most likely type from the message wording and the changed
 * paths, and prepend it. Body/bullet lines below the subject are preserved.
 */
function ensureConventional(message, examples) {
    if (matchesConventional(message))
        return message;
    const lines = message.split('\n');
    const subject = (lines[0] ?? '').trim().replace(/[。.]\s*$/, '');
    const rest = lines.slice(1);
    if (subject === '')
        return message;
    const lower = subject.toLowerCase();
    let type = 'chore';
    // Note: `\b` is an ASCII word boundary and never matches next to CJK, so
    // Chinese keywords are tested as plain substrings; English ones use `\b`.
    if (/修复|修正|解决|报错|崩溃|失效|\b(fix|bug|repair|correct)\b/.test(lower))
        type = 'fix';
    else if (/新增|增加|添加|实现|支持|\b(add|feat|feature|implement|support)\b/.test(lower))
        type = 'feat';
    else if (/文档|注释|说明|\b(doc|docs|readme|comment)\b/.test(lower))
        type = 'docs';
    else if (/测试|单测|\b(test|tests|spec)\b/.test(lower))
        type = 'test';
    else if (/重构|重命名|整理|\b(refactor|rename|move|cleanup)\b/.test(lower))
        type = 'refactor';
    else if (/性能|优化|加速|\b(perf|speed|optimize)\b/.test(lower))
        type = 'perf';
    const prefix = `${type}: `;
    // Avoid duplicating a type the model may have written in prose (e.g. "fix a bug").
    const body = subject.startsWith(prefix) ? subject : prefix + subject.charAt(0).toLowerCase() + subject.slice(1);
    return [body, ...rest].join('\n');
}
function buildUserPrompt(files, patch, staged, examples) {
    const trimmed = patch.length > MAX_DIFF_CHARS ? `${patch.slice(0, MAX_DIFF_CHARS)}\n… (truncated)` : patch;
    const scope = staged ? 'staged for commit' : 'modified in the working tree (nothing is staged)';
    return [
        `These changes are ${scope}.`,
        examples.length === 0
            ? ''
            : ['Recent commit messages in this repository (copy their exact `type(scope): subject` style):', ...examples.map((s) => `- ${s}`)].join('\n'),
        files.length === 0 ? '' : `Files:\n${files.slice(0, 60).join('\n')}`,
        '',
        'Diff:',
        '```diff',
        trimmed,
        '```',
    ]
        .filter((part) => part !== '')
        .join('\n');
}
function cleanMessage(raw) {
    let text = raw.trim();
    // Models like to wrap the answer in a fence even when told not to.
    const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(text);
    if (fence !== null)
        text = fence[1].trim();
    text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
    // Drop a leading "Commit message:" label some models add.
    text = text.replace(/^(commit message|message|提交信息|提交消息)\s*[:：]\s*/i, '');
    return text.trim();
}
/**
 * Ask the session's model for a commit message.
 *
 * Streaming is used because that is the only public entry point; the deltas are
 * concatenated and the terminal chunk's failure (if any) is surfaced as a normal
 * git error so the popup's existing error banner shows it.
 */
export async function generateCommitMessage(ctx, cwd, sessionId) {
    const route = resolveRoute(ctx, sessionId);
    if (route === null) {
        throw new GitError('没有可用的模型：当前会话没有选定模型，也没有部署默认模型', 409);
    }
    const { patch, staged, files } = await stagedPatch(cwd);
    if (patch.trim() === '' && files.length === 0) {
        throw new GitError('没有可用来生成提交消息的改动', 409);
    }
    const examples = await recentSubjects(cwd);
    const llm = ctx.get('llm');
    if (llm === undefined) {
        throw new GitError('当前 profile 没有挂载模型服务（llm）', 503);
    }
    // `system` is its own top-level option — putting a system message inside
    // `messages` gets it dropped by the adapter, which is why the first attempt
    // produced no text at all.
    const messages = [
        { role: 'user', content: [{ type: 'text', text: buildUserPrompt(files, patch, staged, examples) }] },
    ];
    const baseOptions = {
        messages,
        system: SYSTEM_PROMPT,
        maxTokens: MAX_TOKENS,
    };
    if (route.reasoningEffort !== undefined)
        baseOptions.reasoningEffort = route.reasoningEffort;
    let stream;
    if (typeof llm.prepareCall === 'function') {
        let call;
        try {
            // prepareCall resolves the route and validates credentials, so the
            // "no API key" / "no adapter" failures surface HERE, not in the stream.
            call = await llm.prepareCall({ provider: route.provider, model: route.model, maxTokens: MAX_TOKENS }, undefined);
        }
        catch (error) {
            const raw = error instanceof Error ? error.message : String(error);
            throw new GitError(`生成提交消息失败：${friendlyFailure(raw, route)}`, 502);
        }
        const prepared = call.config;
        stream = call.stream;
        delete baseOptions.maxTokens;
        Object.assign(baseOptions, prepared);
    }
    else if (typeof llm.stream === 'function') {
        stream = llm.stream;
        baseOptions.provider = route.provider;
        baseOptions.model = route.model;
    }
    else {
        throw new GitError('模型服务不提供 stream()', 503);
    }
    let text = '';
    let failure = '';
    try {
        for await (const chunk of stream(baseOptions)) {
            switch (chunk.type) {
                case 'text-delta':
                    if (typeof chunk.text === 'string')
                        text += chunk.text;
                    break;
                case 'block-end':
                    if (chunk.block?.type === 'text' && text === '' && typeof chunk.block.text === 'string') {
                        text = chunk.block.text;
                    }
                    break;
                case 'finish':
                    if (chunk.reason?.kind === 'error' || chunk.reason?.type === 'error') {
                        failure = describeFinishError(chunk.reason);
                    }
                    break;
                default:
                    break;
            }
        }
    }
    catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        throw new GitError(`生成提交消息失败：${friendlyFailure(raw, route)}`, 502);
    }
    const cleaned = cleanMessage(text);
    if (cleaned === '') {
        throw new GitError(failure === ''
            ? `模型（${route.provider}/${route.model}）没有返回文本，可能只产出了 reasoning 或被上限截断`
            : `生成提交消息失败：${friendlyFailure(failure, route)}`, 502);
    }
    // Last-resort guarantee: even if the model ignored the format rules, the
    // subject still carries a Conventional Commits type so history stays uniform.
    const message = ensureConventional(cleaned, examples);
    return { message, provider: route.provider, model: route.model };
}
function describeFinishError(reason) {
    const detail = reason.failure?.message ?? reason.message;
    if (typeof detail === 'string' && detail !== '')
        return detail;
    return '模型调用失败';
}
/**
 * Turn the raw provider error into something the user can act on.
 *
 * The common failure on this machine is a route with no credentials, and the
 * adapter's own wording ("store DEEPSEEK_API_KEY through the credentials
 * service") assumes the reader knows the Models page exists.
 */
function friendlyFailure(raw, route) {
    if (/no adapter registered/i.test(raw)) {
        return `provider「${route.provider}」没有注册适配器：这个 profile 没有安装对应的模型插件`;
    }
    if (/no API key|not authenticated|unauthori[sz]ed|401/i.test(raw)) {
        return `provider「${route.provider}」缺少凭据：先在「设置 → 模型」里填好密钥，或换一个已配置的会话模型（原始信息：${raw}）`;
    }
    if (/rate limit|429/i.test(raw)) {
        return `模型被限流，稍后再试（原始信息：${raw}）`;
    }
    return raw;
}
