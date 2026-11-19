import { GitError, addRemote, branches, checkout, commit, commitAction, commitDetail, compare, conflictFiles, deleteBranch, diff, discard, fileHistory, graph, listFiles, readFileContent, openInFileManager, remotes, removeRemote, resolveConflict, resolveRepoDir, setRemoteUrl, stage, status, suggestMessage, sync, terminalRun, unstage, } from './git.js';
import { generateCommitMessage } from './generate.js';
export const name = 'wagq-dsh-git';
// Wait until the web server is ready; `sessions` is looked up lazily so the
// plugin still loads on a profile that does not mount it.
export const inject = ['webServer'];
const PREFIX = '/wagq-git';
const MAX_BODY = 256 * 1024;
const COMMIT_ACTIONS = new Set(['revert', 'reset-soft', 'reset-mixed', 'reset-hard', 'rebase']);
function header(req, key) {
    const value = req.headers[key];
    return typeof value === 'string' ? value : '';
}
/** Host-only fence: a loopback `Host` defeats DNS rebinding for every route. */
function isLoopbackHost(req) {
    const host = header(req, 'host');
    if (host === '')
        return false;
    const authority = host.replace(/:\d+$/, '').toLowerCase();
    return (authority === 'localhost' ||
        authority === '127.0.0.1' ||
        authority === '[::1]' ||
        authority === '::1' ||
        /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(authority));
}
/** Loopback + `Origin`/`Sec-Fetch-Site` check for the state-changing routes. */
function isTrustedRequest(req) {
    if (!isLoopbackHost(req))
        return false;
    if (header(req, 'sec-fetch-site').toLowerCase() === 'cross-site')
        return false;
    const host = header(req, 'host');
    const origin = header(req, 'origin');
    if (origin === '')
        return true;
    try {
        const parsed = new URL(origin);
        return parsed.host === host;
    }
    catch {
        return false;
    }
}
function sendJson(res, statusCode, body) {
    if (res.headersSent) {
        res.destroy();
        return;
    }
    const data = JSON.stringify(body);
    res.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(data),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
    });
    res.end(data);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY) {
                reject(new GitError('请求体过大', 413));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('error', reject);
        req.on('end', () => {
            if (chunks.length === 0) {
                resolve({});
                return;
            }
            try {
                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                resolve(parsed !== null && typeof parsed === 'object' ? parsed : {});
            }
            catch {
                reject(new GitError('请求体不是合法 JSON', 400));
            }
        });
    });
}
function pathList(value) {
    if (!Array.isArray(value))
        throw new GitError('paths 必须是字符串数组', 400);
    const paths = value.filter((item) => typeof item === 'string' && item !== '');
    if (paths.length === 0)
        throw new GitError('paths 不能为空', 400);
    return paths;
}
function requiredString(value, field) {
    if (typeof value !== 'string' || value.trim() === '')
        throw new GitError(`缺少 ${field}`, 400);
    return value;
}
/**
 * Live sessions → `{ id, cwd, title }`. The browser half uses this when the
 * slot did not hand it a session id, so the popup still lands on the right repo.
 */
function liveSessions(ctx, fallbackCwd) {
    const sessions = ctx.get('sessions');
    const rows = [];
    try {
        const all = typeof sessions?.list === 'function' ? sessions.list() : [];
        for (const session of all ?? []) {
            const id = typeof session?.id === 'string' ? session.id : '';
            const cwd = typeof session?.header?.cwd === 'string' ? session.header.cwd : '';
            if (id === '' || cwd === '')
                continue;
            const title = session?.title ?? session?.summary?.title ?? '';
            rows.push({ id, cwd, title: typeof title === 'string' ? title : '' });
        }
    }
    catch {
        // A profile without the sessions service simply has no fallback list.
    }
    if (rows.length === 0)
        rows.push({ id: '', cwd: fallbackCwd, title: '' });
    return rows;
}
export function apply(ctx) {
    const warn = (message) => {
        const logger = ctx.logger;
        if (typeof logger?.warn === 'function')
            logger.warn(message);
        else
            console.warn(message);
    };
    const note = (message) => {
        const logger = ctx.logger;
        if (typeof logger?.info === 'function')
            logger.info(message);
        else
            console.info(message);
    };
    const dispose = ctx.webServer.register({
        kind: 'prefix',
        path: PREFIX,
        handler: async (req, res) => {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1');
            if (!isTrustedRequest(req)) {
                sendJson(res, 403, { ok: false, error: 'forbidden' });
                return;
            }
            const fallbackCwd = process.cwd();
            try {
                if (url.pathname === `${PREFIX}/api/sessions`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    sendJson(res, 200, { ok: true, sessions: liveSessions(ctx, fallbackCwd) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/state`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const [snapshot, commits] = await Promise.all([
                        status(cwd),
                        graph(cwd, Number(url.searchParams.get('limit') ?? 60)),
                    ]);
                    sendJson(res, 200, { ok: true, cwd, ...snapshot, commits });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/diff`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const path = requiredString(url.searchParams.get('path'), 'path');
                    const staged = url.searchParams.get('staged') === '1';
                    const from = url.searchParams.get('from') ?? '';
                    const payload = await diff(cwd, path, staged, from);
                    sendJson(res, 200, { ok: true, ...payload });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/message`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    sendJson(res, 200, { ok: true, message: await suggestMessage(cwd) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/branches`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    sendJson(res, 200, { ok: true, branches: await branches(cwd) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/remotes`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    sendJson(res, 200, { ok: true, remotes: await remotes(cwd) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/compare`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    sendJson(res, 200, { ok: true, ...(await compare(cwd, Number(url.searchParams.get('limit') ?? 40))) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/files`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    sendJson(res, 200, { ok: true, ...(await listFiles(cwd, url.searchParams.get('dir') ?? '')) });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/file-content`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const content = await readFileContent(cwd, url.searchParams.get('path') ?? '');
                    sendJson(res, 200, { ok: true, ...content });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/file-history`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const commits = await fileHistory(cwd, url.searchParams.get('path') ?? '');
                    sendJson(res, 200, { ok: true, commits });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/open-path`) {
                    if (req.method !== 'POST') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const bodyOpen = await readBody(req);
                    const cwd = await resolveRepoDir(typeof bodyOpen.cwd === 'string' ? bodyOpen.cwd : fallbackCwd);
                    const target = requiredString(bodyOpen.target, 'target');
                    try {
                        await openInFileManager(cwd, target, bodyOpen.reveal === true);
                        sendJson(res, 200, { ok: true });
                    }
                    catch (error) {
                        const detail = error instanceof Error ? error.message : String(error);
                        throw new GitError(`无法打开：${detail}`, 500, detail);
                    }
                    return;
                }
                if (url.pathname === `${PREFIX}/api/conflicts`) {
                    if (req.method !== 'GET') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const paths = url.searchParams.get('paths');
                    const list = paths === null || paths === ''
                        ? (await status(cwd)).changes.filter((entry) => entry.kind === 'conflicted').map((entry) => entry.path)
                        : paths.split('\0').filter((path) => path !== '');
                    const conflicts = list.length === 0 ? [] : await conflictFiles(cwd, list);
                    sendJson(res, 200, { ok: true, conflicts });
                    return;
                }
                // Model-generated commit message: uses the session's own model.
                if (url.pathname === `${PREFIX}/api/generate-message`) {
                    if (req.method !== 'POST') {
                        sendJson(res, 405, { ok: false, error: 'method not allowed' });
                        return;
                    }
                    const bodyGen = await readBody(req);
                    const cwd = await resolveRepoDir(typeof bodyGen.cwd === 'string' ? bodyGen.cwd : fallbackCwd);
                    const sessionId = typeof bodyGen.sessionId === 'string' ? bodyGen.sessionId : '';
                    const result = await generateCommitMessage(ctx, cwd, sessionId);
                    sendJson(res, 200, { ok: true, ...result });
                    return;
                }
                // `/api/commit` answers both: GET reads a commit's detail, POST creates one.
                if (url.pathname === `${PREFIX}/api/commit` && req.method === 'GET') {
                    const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd);
                    const sha = requiredString(url.searchParams.get('sha'), 'sha');
                    sendJson(res, 200, { ok: true, commit: await commitDetail(cwd, sha) });
                    return;
                }
                if (req.method !== 'POST') {
                    sendJson(res, 405, { ok: false, error: 'method not allowed' });
                    return;
                }
                const body = await readBody(req);
                const cwd = await resolveRepoDir(typeof body.cwd === 'string' ? body.cwd : fallbackCwd);
                if (url.pathname === `${PREFIX}/api/stage`) {
                    await stage(cwd, pathList(body.paths));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/unstage`) {
                    await unstage(cwd, pathList(body.paths));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/discard`) {
                    await discard(cwd, pathList(body.paths));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/commit`) {
                    const result = await commit(cwd, requiredString(body.message, 'message'), {
                        amend: body.amend === true,
                        signoff: body.signoff === true,
                    });
                    sendJson(res, 200, { ok: true, ...result });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/sync`) {
                    const action = requiredString(body.action, 'action');
                    if (action !== 'fetch' && action !== 'pull' && action !== 'push') {
                        throw new GitError('action 只能是 fetch / pull / push', 400);
                    }
                    const result = await sync(cwd, action, {
                        remote: typeof body.remote === 'string' ? body.remote : '',
                        branch: typeof body.branch === 'string' ? body.branch : '',
                        setUpstream: body.setUpstream === true,
                        force: body.force === true,
                    });
                    sendJson(res, 200, { ...result, ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/checkout`) {
                    const target = requiredString(body.target, 'target');
                    const branch = await checkout(cwd, target, { create: body.create === true });
                    sendJson(res, 200, { ok: true, branch });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/branch-delete`) {
                    await deleteBranch(cwd, requiredString(body.name, 'name'), body.force === true);
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/remote-add`) {
                    await addRemote(cwd, requiredString(body.name, 'name'), requiredString(body.url, 'url'));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/remote-remove`) {
                    await removeRemote(cwd, requiredString(body.name, 'name'));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/remote-url`) {
                    await setRemoteUrl(cwd, requiredString(body.name, 'name'), requiredString(body.url, 'url'));
                    sendJson(res, 200, { ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/resolve-conflict`) {
                    const paths = (Array.isArray(body.paths) ? body.paths : []).filter((path) => typeof path === 'string' && path !== '');
                    if (paths.length === 0)
                        throw new GitError('paths 不能为空', 400);
                    const side = body.side === 'theirs' ? 'theirs' : body.side === 'ours' ? 'ours' : '';
                    if (side === '')
                        throw new GitError('side 只能是 ours / theirs', 400);
                    const remaining = await resolveConflict(cwd, paths, side);
                    sendJson(res, 200, { ok: true, remaining });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/commit-action`) {
                    const action = requiredString(body.action, 'action');
                    if (!COMMIT_ACTIONS.has(action))
                        throw new GitError('不支持的操作', 400);
                    const result = await commitAction(cwd, requiredString(body.sha, 'sha'), action);
                    sendJson(res, 200, { ...result, ok: true });
                    return;
                }
                if (url.pathname === `${PREFIX}/api/terminal`) {
                    const command = requiredString(body.command, 'command');
                    const result = await terminalRun(cwd, command);
                    sendJson(res, 200, { ok: true, ...result });
                    return;
                }
                sendJson(res, 404, { ok: false, error: 'not found' });
            }
            catch (error) {
                if (error instanceof GitError) {
                    sendJson(res, error.code, { ok: false, error: error.message, detail: error.detail });
                    return;
                }
                const message = error instanceof Error ? error.message : String(error);
                warn(`[wagq-git] ${url.pathname} failed: ${message}`);
                sendJson(res, 500, { ok: false, error: message });
            }
        },
    });
    ctx.effect(() => () => {
        try {
            dispose();
        }
        catch {
            // The route table is already gone when the web server unloads first.
        }
    });
    note(`[wagq-git] routes ready under ${PREFIX}`);
}
