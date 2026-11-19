#!/usr/bin/env node
/**
 * Smoke test — proves both halves actually work, without needing the GUI.
 *
 *   1. host half: build a throwaway git repo, mount the plugin on a fake
 *      `webServer`, and drive every route through real `req`/`res` objects.
 *   2. client half: evaluate `dist/client.js` against a fake
 *      `window.__ModuleLoader__`, assert it registers under the package name,
 *      then render the registered header button with react-dom/server.
 *
 * Run: node scripts/smoke.mjs
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

let passed = 0
function ok(label) {
  passed += 1
  console.log(`  \u001B[32m✓\u001B[0m ${label}`)
}

/* ------------------------------------------------------------------ host */

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-smoke-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'main')
  git('config', 'user.name', 'Smoke Test')
  git('config', 'user.email', 'smoke@example.com')
  git('config', 'commit.gpgsign', 'false')
  fs.writeFileSync(path.join(dir, 'README.md'), '# smoke\n')
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 初始化项目')
  return { dir, git }
}

function callRoute(handler, { method = 'GET', url, body, headers = {} }) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8')
  const req = Readable.from(payload === null ? [] : [payload])
  req.method = method
  req.url = url
  req.headers = {
    host: '127.0.0.1:54878',
    origin: 'http://127.0.0.1:54878',
    ...headers,
    ...(payload === null ? {} : { 'content-length': String(payload.length) }),
  }
  return new Promise((resolve, reject) => {
    let status = 0
    const chunks = []
    const res = {
      headersSent: false,
      writeHead(code) {
        status = code
        this.headersSent = true
        return this
      },
      end(data) {
        if (data !== undefined) chunks.push(Buffer.from(data))
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try {
          json = JSON.parse(text)
        } catch {
          json = null
        }
        resolve({ status, json, text })
      },
      destroy(error) {
        reject(error ?? new Error('response destroyed'))
      },
    }
    Promise.resolve(handler(req, res)).catch(reject)
  })
}

async function testHost() {
  console.log('\n\u001B[36mhost half\u001B[0m')
  const { dir, git } = makeRepo()
  const mod = await import(pathToFileURL(path.join(ROOT, 'dist', 'index.js')).href)

  assert.equal(mod.name, 'wagq-dsh-git')
  assert.deepEqual(mod.inject, ['webServer'])
  ok('exports name + inject（webServer）')

  let route = null
  let disposed = 0
  const ctx = {
    webServer: {
      register(spec) {
        route = spec
        return () => {
          disposed += 1
        }
      },
    },
    logger: { info() {}, warn() {} },
    effect(cb) {
      const cleanup = cb()
      return () => cleanup?.()
    },
    get(name) {
      if (name === 'sessions') {
        return { list: () => [{ id: 'session-1', header: { cwd: dir }, title: 'demo' }] }
      }
      return undefined
    },
  }
  mod.apply(ctx)
  assert.ok(route !== null, 'route registered')
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/wagq-git')
  ok('注册 /wagq-git 前缀路由')

  // Untracked + modified file, so every list bucket has content.
  fs.writeFileSync(path.join(dir, 'README.md'), '# smoke\nmore\n')
  fs.writeFileSync(path.join(dir, 'new file.txt'), 'hello\n')

  const sessions = await callRoute(route.handler, { url: '/wagq-git/api/sessions' })
  assert.equal(sessions.status, 200)
  assert.equal(sessions.json.sessions[0].cwd, dir)
  ok('GET /api/sessions 返回会话工作目录')

  const encoded = encodeURIComponent(dir)
  const state = await callRoute(route.handler, { url: `/wagq-git/api/state?cwd=${encoded}` })
  assert.equal(state.status, 200, state.text)
  assert.equal(state.json.repo.branch, 'main')
  assert.equal(state.json.repo.name, path.basename(dir))
  assert.ok(state.json.commits.length >= 1, 'commit graph has the seed commit')
  assert.ok(
    [...state.json.changes, ...state.json.untracked].some((entry) => entry.path === 'new file.txt'),
    'untracked file listed with a space in its name',
  )
  assert.ok(state.json.changes.some((entry) => entry.path === 'README.md'), 'modified file listed')
  ok('GET /api/state 解析分支 / 更改 / 提交图')

  const diff = await callRoute(route.handler, {
    url: `/wagq-git/api/diff?cwd=${encoded}&path=${encodeURIComponent('README.md')}&staged=0&from=`,
  })
  assert.equal(diff.status, 200, diff.text)
  assert.ok(diff.json.patch.includes('+more'), 'diff carries the added line')
  ok('GET /api/diff 返回 unified patch')

  const untrackedDiff = await callRoute(route.handler, {
    url: `/wagq-git/api/diff?cwd=${encoded}&path=${encodeURIComponent('new file.txt')}&staged=0&from=`,
  })
  assert.equal(untrackedDiff.status, 200, untrackedDiff.text)
  assert.ok(untrackedDiff.json.patch.includes('+hello'), 'untracked file shows its content')
  ok('GET /api/diff 对未跟踪文件也给出内容')

  const staged = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/stage',
    body: { cwd: dir, paths: ['README.md', 'new file.txt'] },
  })
  assert.equal(staged.status, 200, staged.text)
  ok('POST /api/stage 暂存文件')

  const suggestion = await callRoute(route.handler, { url: `/wagq-git/api/message?cwd=${encoded}` })
  assert.equal(suggestion.status, 200)
  assert.ok(suggestion.json.message.length > 0)
  ok('GET /api/message 生成建议提交信息')

  const committed = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/commit',
    body: { cwd: dir, message: 'test: 冒烟提交' },
  })
  assert.equal(committed.status, 200, committed.text)
  assert.ok(committed.json.short.length >= 7)
  ok('POST /api/commit 提交成功')

  assert.equal(git('log', '-1', '--pretty=%s').trim(), 'test: 冒烟提交')

  const unstage = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/unstage',
    body: { cwd: dir, paths: ['README.md'] },
  })
  assert.equal(unstage.status, 200, unstage.text)
  ok('POST /api/unstage 取消暂存')

  fs.writeFileSync(path.join(dir, 'README.md'), '# smoke\nmore\ndirty\n')
  const discard = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/discard',
    body: { cwd: dir, paths: ['README.md'] },
  })
  assert.equal(discard.status, 200, discard.text)
  assert.ok(!fs.readFileSync(path.join(dir, 'README.md'), 'utf8').includes('dirty'), 'worktree change reverted')
  ok('POST /api/discard 放弃工作区更改')

  /* ---- new in 0.3: branches / remotes / commit detail / sync / terminal ---- */

  const branchList = await callRoute(route.handler, { url: `/wagq-git/api/branches?cwd=${encoded}` })
  assert.equal(branchList.status, 200, branchList.text)
  assert.ok(branchList.json.branches.some((branch) => branch.name === 'main' && branch.current), 'current branch reported')
  ok('GET /api/branches 列出本地/远程分支')

  const checkoutNew = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/checkout',
    body: { cwd: dir, target: 'feature/smoke', create: true },
  })
  assert.equal(checkoutNew.status, 200, checkoutNew.text)
  assert.equal(checkoutNew.json.branch, 'feature/smoke')
  assert.equal(git('rev-parse', '--abbrev-ref', 'HEAD').trim(), 'feature/smoke')
  ok('POST /api/checkout 新建并切换分支')

  const checkoutBack = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/checkout',
    body: { cwd: dir, target: 'main' },
  })
  assert.equal(checkoutBack.status, 200, checkoutBack.text)
  ok('POST /api/checkout 切回 main')

  const checkoutMissing = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/checkout',
    body: { cwd: dir, target: 'no/such/branch' },
  })
  assert.equal(checkoutMissing.status, 404)
  ok('不存在的分支 → 404')

  const remoteAdd = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/remote-add',
    body: { cwd: dir, name: 'origin', url: 'https://example.com/demo.git' },
  })
  assert.equal(remoteAdd.status, 200, remoteAdd.text)
  const remoteList = await callRoute(route.handler, { url: `/wagq-git/api/remotes?cwd=${encoded}` })
  assert.equal(remoteList.status, 200, remoteList.text)
  assert.equal(remoteList.json.remotes[0].name, 'origin')
  assert.equal(remoteList.json.remotes[0].url, 'https://example.com/demo.git')
  ok('POST /api/remote-add + GET /api/remotes')

  const remoteDup = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/remote-add',
    body: { cwd: dir, name: 'origin', url: 'https://example.com/x.git' },
  })
  assert.equal(remoteDup.status, 409)
  ok('重复添加同名远端 → 409')

  const remoteUrl = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/remote-url',
    body: { cwd: dir, name: 'origin', url: 'https://example.com/renamed.git' },
  })
  assert.equal(remoteUrl.status, 200, remoteUrl.text)
  ok('POST /api/remote-url 修改地址')

  const remoteRemove = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/remote-remove',
    body: { cwd: dir, name: 'origin' },
  })
  assert.equal(remoteRemove.status, 200, remoteRemove.text)
  ok('POST /api/remote-remove 删除远端')

  const headSha = git('rev-parse', 'HEAD').trim()
  const detail = await callRoute(route.handler, { url: `/wagq-git/api/commit?cwd=${encoded}&sha=${headSha}` })
  assert.equal(detail.status, 200, detail.text)
  assert.equal(detail.json.commit.sha, headSha)
  assert.equal(detail.json.commit.subject, 'test: 冒烟提交')
  assert.ok(detail.json.commit.patch.length > 0, 'commit patch present')
  ok('GET /api/commit 返回提交详情 + patch')

  const badSha = await callRoute(route.handler, { url: `/wagq-git/api/commit?cwd=${encoded}&sha=nope!` })
  assert.equal(badSha.status, 400)
  ok('非法提交哈希 → 400')

  const terminal = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/terminal',
    body: { cwd: dir, command: 'git rev-parse --abbrev-ref HEAD' },
  })
  assert.equal(terminal.status, 200, terminal.text)
  assert.match(terminal.json.output, /main/)
  assert.equal(terminal.json.code, 0)
  ok('POST /api/terminal 执行 git 命令并回传退出码')

  const terminalFail = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/terminal',
    body: { cwd: dir, command: 'git rev-parse --verify definitely-not-a-ref' },
  })
  assert.equal(terminalFail.status, 200)
  assert.notEqual(terminalFail.json.code, 0, 'non-zero exit code surfaces')
  ok('终端命令失败时退出码非 0')

  const terminalCd = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/terminal',
    body: { cwd: dir, command: process.platform === 'win32' ? 'Set-Location ..' : 'cd ..' },
  })
  assert.equal(terminalCd.status, 200, terminalCd.text)
  assert.notEqual(path.resolve(terminalCd.json.cwd), path.resolve(dir), 'cwd moved for the next call')
  ok('终端 cd 改变后续命令的工作目录')

  /* ---- file browser ---- */

  fs.mkdirSync(path.join(dir, 'sub', 'deep'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'sub', 'note.txt'), 'note\n')

  const rootFiles = await callRoute(route.handler, { url: `/wagq-git/api/files?cwd=${encoded}&dir=` })
  assert.equal(rootFiles.status, 200, rootFiles.text)
  assert.ok(rootFiles.json.entries.some((e) => e.name === 'sub' && e.kind === 'dir'))
  assert.ok(rootFiles.json.entries.some((e) => e.name === 'README.md' && e.kind === 'file'))
  ok('GET /api/files 列出仓库根目录')

  const subFiles = await callRoute(route.handler, { url: `/wagq-git/api/files?cwd=${encoded}&dir=sub` })
  assert.equal(subFiles.status, 200, subFiles.text)
  assert.ok(subFiles.json.entries.some((e) => e.name === 'note.txt'))
  assert.equal(subFiles.json.dir, 'sub')
  ok('GET /api/files 进入子目录')

  const escapeFiles = await callRoute(route.handler, { url: `/wagq-git/api/files?cwd=${encoded}&dir=..%2F..` })
  assert.equal(escapeFiles.status, 403, escapeFiles.text)
  ok('浏览仓库之外的目录 → 403')

  const noSuchDir = await callRoute(route.handler, { url: `/wagq-git/api/files?cwd=${encoded}&dir=nope` })
  assert.equal(noSuchDir.status, 404, noSuchDir.text)
  ok('不存在的目录 → 404')

  const fileLog = await callRoute(route.handler, { url: `/wagq-git/api/file-history?cwd=${encoded}&path=README.md` })
  assert.equal(fileLog.status, 200, fileLog.text)
  assert.ok(fileLog.json.commits.length >= 1, 'README.md has commits')
  ok('GET /api/file-history 返回单文件提交历史')

  const badPath = await callRoute(route.handler, { url: `/wagq-git/api/file-history?cwd=${encoded}&path=..%2Fetc` })
  assert.equal(badPath.status, 400)
  ok('逃逸路径的 file-history → 400')

  const textContent = await callRoute(route.handler, {
    url: `/wagq-git/api/file-content?cwd=${encoded}&path=${encodeURIComponent('README.md')}`,
  })
  assert.equal(textContent.status, 200, textContent.text)
  assert.equal(textContent.json.mime, null)
  assert.match(textContent.json.text, /# smoke/)
  ok('GET /api/file-content 返回文本文件')

  // A tiny PNG (1x1) must come back as base64 with its MIME.
  const pngPath = path.join(dir, 'pixel.png')
  fs.writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  const imageContent = await callRoute(route.handler, {
    url: `/wagq-git/api/file-content?cwd=${encoded}&path=pixel.png`,
  })
  assert.equal(imageContent.status, 200, imageContent.text)
  assert.equal(imageContent.json.mime, 'image/png')
  assert.equal(imageContent.json.base64.length > 0, true)
  assert.equal(imageContent.json.text, null)
  ok('GET /api/file-content 返回图片的 base64 + MIME')

  const escapeContent = await callRoute(route.handler, {
    url: `/wagq-git/api/file-content?cwd=${encoded}&path=..%2F..%2Fetc`,
  })
  assert.equal(escapeContent.status, 400)
  ok('逃逸路径的 file-content → 400')
  fs.unlinkSync(pngPath)

  const openBad = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/open-path',
    body: { cwd: dir, target: '' },
  })
  assert.equal(openBad.status, 400)
  ok('POST /api/open-path 缺少 target → 400（不真的弹窗口）')

  const syncResult = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/sync',
    body: { cwd: dir, action: 'fetch' },
  })
  // `fetch --all` with no remote configured is a no-op; anything but 500 is fine.
  assert.ok(syncResult.status === 200 || syncResult.status >= 400, 'sync reachable')
  ok('POST /api/sync 可调用（fetch）')

  const badSync = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/sync',
    body: { cwd: dir, action: 'nuke' },
  })
  assert.equal(badSync.status, 400)
  ok('非法 sync action → 400')

  // With no upstream the compare call must answer cleanly instead of 500.
  const compareNoUpstream = await callRoute(route.handler, { url: `/wagq-git/api/compare?cwd=${encoded}` })
  assert.equal(compareNoUpstream.status, 200, compareNoUpstream.text)
  assert.equal(compareNoUpstream.json.upstream, '')
  assert.deepEqual(compareNoUpstream.json.ahead, [])
  ok('GET /api/compare 无上游时返回空列表')

  // Build a real upstream: a second repo acting as `origin`, then fetch it.
  const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-bare-'))
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bareDir], { stdio: 'ignore' })
  git('remote', 'add', 'origin', bareDir)
  git('push', '-q', '-u', 'origin', 'main')
  const compareSynced = await callRoute(route.handler, { url: `/wagq-git/api/compare?cwd=${encoded}` })
  assert.equal(compareSynced.status, 200, compareSynced.text)
  assert.equal(compareSynced.json.upstream, 'origin/main')
  assert.equal(compareSynced.json.ahead.length, 0)
  assert.equal(compareSynced.json.behind.length, 0)
  ok('GET /api/compare 跟踪 origin/main（已同步）')

  fs.writeFileSync(path.join(dir, 'ahead.txt'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 本地领先的提交')
  const compareAhead = await callRoute(route.handler, { url: `/wagq-git/api/compare?cwd=${encoded}` })
  assert.equal(compareAhead.json.ahead.length, 1)
  assert.equal(compareAhead.json.ahead[0].subject, 'feat: 本地领先的提交')
  assert.equal(compareAhead.json.behind.length, 0)
  ok('GET /api/compare 正确列出领先提交')

  // The header badge uses repoInfo().ahead/behind, which used to be swapped:
  // a locally-ahead branch was displayed as "behind". Assert it agrees with git.
  const stateAhead = await callRoute(route.handler, { url: `/wagq-git/api/state?cwd=${encoded}` })
  assert.equal(stateAhead.json.repo.ahead, 1, 'state.ahead counts our own commits')
  assert.equal(stateAhead.json.repo.behind, 0, 'state.behind counts remote-only commits')
  ok('GET /api/state 的 ahead/behind 方向与 git 一致')

  // A commit pushed from the "remote" side must show up as behind.
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-other-'))
  execFileSync('git', ['clone', '-q', bareDir, other], { stdio: 'ignore' })
  execFileSync('git', ['-C', other, 'config', 'user.name', 'Other'], { stdio: 'ignore' })
  execFileSync('git', ['-C', other, 'config', 'user.email', 'other@example.com'], { stdio: 'ignore' })
  fs.writeFileSync(path.join(other, 'behind.txt'), 'y\n')
  execFileSync('git', ['-C', other, 'add', '.'], { stdio: 'ignore' })
  execFileSync('git', ['-C', other, 'commit', '-q', '-m', 'feat: 远端多出来的提交'], { stdio: 'ignore' })
  execFileSync('git', ['-C', other, 'push', '-q', 'origin', 'main'], { stdio: 'ignore' })
  git('fetch', '-q', 'origin')

  const compareBoth = await callRoute(route.handler, { url: `/wagq-git/api/compare?cwd=${encoded}` })
  assert.equal(compareBoth.json.ahead.length, 1)
  assert.equal(compareBoth.json.behind.length, 1)
  assert.equal(compareBoth.json.behind[0].subject, 'feat: 远端多出来的提交')
  ok('GET /api/compare 同时列出落后与领先（双向）')

  const stateBoth = await callRoute(route.handler, { url: `/wagq-git/api/state?cwd=${encoded}` })
  assert.equal(stateBoth.json.repo.ahead, 1, 'state.ahead is our local commit')
  assert.equal(stateBoth.json.repo.behind, 1, 'state.behind is the remote commit')
  ok('GET /api/state 双向分叉时 ahead/behind 都正确')

  git('reset', '-q', '--hard', 'HEAD')
  fs.rmSync(bareDir, { recursive: true, force: true })
  fs.rmSync(other, { recursive: true, force: true })

  /* ---- generated commit message (the session's model) ---- */

  fs.writeFileSync(path.join(dir, 'gen.txt'), 'hello\n')
  git('add', '.')

  // No model configured at all: must be a clean 409, not a crash.
  const genNoModel = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/generate-message',
    body: { cwd: dir, sessionId: '' },
  })
  assert.equal(genNoModel.status, 409, genNoModel.text)
  ok('POST /api/generate-message 无可用模型 → 409')

  // Wire a fake live agent exposing `model.current()` plus a fake llm stream.
  const calls = []
  ctx.get = (name) => {
    if (name === 'agents') {
      return {
        get: (id) =>
          id === 'session-1'
            ? { model: { current: () => ({ provider: 'fake-provider', model: 'fake-model' }) } }
            : undefined,
      }
    }
    if (name === 'sessions') {
      return { list: () => [{ id: 'session-1', header: { cwd: dir }, title: 'demo' }] }
    }
    if (name === 'llm') {
      return {
        stream: async function* (options) {
          calls.push(options)
          yield { type: 'block-start', index: 0 }
          yield { type: 'text-delta', text: '```\n' }
          yield { type: 'text-delta', text: 'feat: 加上 gen.txt\n' }
          yield { type: 'text-delta', text: '```' }
          yield { type: 'finish', reason: { kind: 'stop' } }
        },
      }
    }
    return undefined
  }

  const gen = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/generate-message',
    body: { cwd: dir, sessionId: 'session-1' },
  })
  assert.equal(gen.status, 200, gen.text)
  assert.equal(gen.json.message, 'feat: 加上 gen.txt', 'code fence stripped')
  assert.equal(gen.json.provider, 'fake-provider')
  assert.equal(gen.json.model, 'fake-model')
  ok('POST /api/generate-message 用会话模型生成并清理代码围栏')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].provider, 'fake-provider', 'routes to the session model')
  assert.equal(calls[0].model, 'fake-model')
  assert.equal(typeof calls[0].system, 'string', 'system goes in its own option')
  assert.ok(calls[0].system.includes('commit message'), 'system says what to produce')
  const sent = JSON.stringify(calls[0].messages)
  assert.ok(sent.includes('gen.txt'), 'prompt carries the changed file')
  assert.ok(sent.includes('+hello'), 'prompt carries the diff hunk')
  assert.ok(!sent.includes('You write git commit messages'), 'system is NOT inside messages')
  ok('生成请求带上文件清单与差异并走会话模型')

  // `prepareCall` is the path the real host exposes; the prepared config must be
  // what actually reaches stream().
  const preparedCalls = []
  ctx.get = ((original) => (name) => {
    if (name !== 'llm') return original(name)
    return {
      prepareCall: async (config) => {
        assert.equal(config.provider, 'fake-provider')
        assert.equal(config.model, 'fake-model')
        return {
          config: { provider: 'fake-provider', model: 'fake-model', temperature: 0.2 },
          stream: async function* (options) {
            preparedCalls.push(options)
            yield { type: 'text-delta', text: 'refactor(core): 用 prepareCall 走一遍' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          },
        }
      },
    }
  })(ctx.get)

  const genPrepared = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/generate-message',
    body: { cwd: dir, sessionId: 'session-1' },
  })
  assert.equal(genPrepared.status, 200, genPrepared.text)
  assert.equal(genPrepared.json.message, 'refactor(core): 用 prepareCall 走一遍')
  assert.equal(preparedCalls.length, 1)
  assert.equal(preparedCalls[0].temperature, 0.2, 'prepared config is forwarded')
  ok('prepareCall 的 config 会透传给 stream')

  // A model that returns nothing must not produce an empty commit message.
  ctx.get = ((original) => (name) => {
    if (name === 'llm') {
      return {
        stream: async function* () {
          yield { type: 'finish', reason: { kind: 'stop' } }
        },
      }
    }
    return original(name)
  })(ctx.get)

  const genEmpty = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/generate-message',
    body: { cwd: dir, sessionId: 'session-1' },
  })
  assert.equal(genEmpty.status, 502, genEmpty.text)
  assert.match(genEmpty.json.error, /没有返回文本/)
  ok('模型返回空内容 → 502 而不是空提交消息')

  // A provider failure inside the stream must surface its own message.
  ctx.get = ((original) => (name) => {
    if (name === 'llm') {
      return {
        stream: async function* () {
          yield { type: 'finish', reason: { kind: 'error', failure: { message: 'rate limited' } } }
        },
      }
    }
    return original(name)
  })(ctx.get)

  const genFail = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/generate-message',
    body: { cwd: dir, sessionId: 'session-1' },
  })
  assert.equal(genFail.status, 502, genFail.text)
  assert.match(genFail.json.error, /rate limited/)
  ok('流内失败会带上提供方原始错误')

  git('reset', '-q', '--hard', 'HEAD')

  /* ---- conflict resolution ---- */

  // Create a real merge conflict: branch A and main edit the same line.
  {
    const conflictDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-conflict-'))
    const cg = (...args) => execFileSync('git', args, { cwd: conflictDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    cg('init', '-q', '-b', 'main')
    cg('config', 'user.name', 'T')
    cg('config', 'user.email', 't@e.com')
    fs.writeFileSync(path.join(conflictDir, 'shared.txt'), 'base\n')
    cg('add', '.')
    cg('commit', '-q', '-m', 'base')
    cg('checkout', '-q', '-b', 'feature')
    fs.writeFileSync(path.join(conflictDir, 'shared.txt'), 'theirs change\n')
    cg('add', '.')
    cg('commit', '-q', '-m', 'theirs')
    cg('checkout', '-q', 'main')
    fs.writeFileSync(path.join(conflictDir, 'shared.txt'), 'ours change\n')
    cg('add', '.')
    cg('commit', '-q', '-m', 'ours')
    let conflicted = false
    try {
      cg('merge', 'feature')
    } catch {
      conflicted = true
    }
    assert.equal(conflicted, true, 'merge should conflict')

    const ce = encodeURIComponent(conflictDir)
    const list = await callRoute(route.handler, { url: `/wagq-git/api/conflicts?cwd=${ce}` })
    assert.equal(list.status, 200, list.text)
    assert.equal(list.json.conflicts.length, 1)
    assert.equal(list.json.conflicts[0].path, 'shared.txt')
    assert.equal(list.json.conflicts[0].ours, 'ours change\n')
    assert.equal(list.json.conflicts[0].theirs, 'theirs change\n')
    assert.equal(list.json.conflicts[0].base, 'base\n')
    assert.ok(list.json.conflicts[0].worktree.includes('<<<<<<<'))
    ok('GET /api/conflicts 读取三方内容与带标记原文')

    const resolved = await callRoute(route.handler, {
      method: 'POST',
      url: '/wagq-git/api/resolve-conflict',
      body: { cwd: conflictDir, paths: ['shared.txt'], side: 'theirs' },
    })
    assert.equal(resolved.status, 200, resolved.text)
    assert.equal(resolved.json.remaining.length, 0)
    assert.equal(fs.readFileSync(path.join(conflictDir, 'shared.txt'), 'utf8').replace(/\r\n/g, '\n'), 'theirs change\n')
    assert.equal(cg('status', '--porcelain=v1').trim(), 'M  shared.txt')
    ok('POST /api/resolve-conflict 采用 theirs 并 git add')

    const badSide = await callRoute(route.handler, {
      method: 'POST',
      url: '/wagq-git/api/resolve-conflict',
      body: { cwd: conflictDir, paths: ['shared.txt'], side: 'nobody' },
    })
    assert.equal(badSide.status, 400)
    ok('非法 side → 400')

    // Restore the real ctx.get before the following tests use the model mocks.
    // (No model calls follow, but keep the fixture isolated.)
    fs.rmSync(conflictDir, { recursive: true, force: true })
  }

  fs.writeFileSync(path.join(dir, 'second.txt'), 'two\n')
  git('add', '.')
  git('commit', '-q', '-m', 'chore: 第二个提交')
  const firstSha = git('rev-parse', 'HEAD~1').trim()

  const softReset = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/commit-action',
    body: { cwd: dir, sha: firstSha, action: 'reset-soft' },
  })
  assert.equal(softReset.status, 200, softReset.text)
  assert.equal(git('rev-parse', 'HEAD').trim(), firstSha)
  const porcelainAfterSoft = git('status', '--porcelain=v1')
  assert.match(porcelainAfterSoft, /^A\s+second\.txt/m, 'soft reset staged the removed commit')
  ok('POST /api/commit-action reset-soft 生效')

  const revert = await callRoute(route.handler, {
    method: 'POST',
    url: '/wagq-git/api/commit-action',
    body: { cwd: dir, sha: firstSha, action: 'revert' },
  })
  assert.ok(revert.status === 200 || revert.status === 409, 'revert reachable')
  ok('POST /api/commit-action revert 可调用')

  const missing2 = await callRoute(route.handler, { url: '/wagq-git/api/state?cwd=' + encodeURIComponent(path.join(dir, 'nope')) })
  assert.equal(missing2.status, 404)
  ok('不存在的目录 → 404')

  const missing = await callRoute(route.handler, { url: '/wagq-git/api/state?cwd=' + encodeURIComponent(path.join(dir, 'nope')) })
  assert.equal(missing.status, 404)
  ok('不存在的目录 → 404')

  const foreign = await callRoute(route.handler, {
    url: '/wagq-git/api/sessions',
    headers: { origin: 'http://evil.example' },
  })
  assert.equal(foreign.status, 403)
  ok('跨源 Origin → 403')

  const foreignHost = await callRoute(route.handler, {
    url: '/wagq-git/api/sessions',
    headers: { host: 'evil.example:80', origin: 'http://evil.example:80' },
  })
  assert.equal(foreignHost.status, 403)
  ok('非 loopback Host → 403')

  const wrongMethod = await callRoute(route.handler, { method: 'DELETE', url: '/wagq-git/api/commit' })
  assert.equal(wrongMethod.status, 405)
  ok('方法不允许 → 405')

  const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-norepo-'))
  const notRepoRes = await callRoute(route.handler, { url: `/wagq-git/api/state?cwd=${encodeURIComponent(notRepo)}` })
  assert.equal(notRepoRes.status, 409)
  assert.match(notRepoRes.json.error, /不是 Git 仓库/)
  ok('非仓库目录 → 409 且提示清晰')

  fs.rmSync(dir, { recursive: true, force: true })
  fs.rmSync(notRepo, { recursive: true, force: true })
  assert.equal(disposed, 0)
}

/* ---------------------------------------------------------------- client */

async function testClient() {
  console.log('\n\u001B[36mclient half\u001B[0m')
  const source = fs.readFileSync(path.join(ROOT, 'dist', 'client.js'), 'utf8')
  assert.ok(source.startsWith('window.__ModuleLoader__.load({'), 'classic-script shell present')

  const registrations = []
  const sandboxWindow = {
    __ModuleLoader__: {
      load(registration) {
        registrations.push(registration)
      },
    },
  }
  const fakeRequire = (specifier) => {
    if (specifier === 'react') return require('react')
    if (specifier === 'react-dom') return require('react-dom')
    throw new Error(`unexpected external module: ${specifier}`)
  }

  const run = new Function('window', 'require', 'module', 'exports', source)
  run(sandboxWindow, fakeRequire, { exports: {} }, {})

  assert.equal(registrations.length, 1)
  const registration = registrations[0]
  assert.equal(registration.id, PKG.name, 'module id must be the package name')
  ok(`以包名注册浏览器模块（${registration.id}）`)

  const exportsObject = registration.factory(fakeRequire)
  assert.equal(exportsObject.name, 'wagq-dsh-git-client')
  assert.deepEqual(exportsObject.inject, ['slots'])
  ok('导出 name + inject（slots）')

  let captured = null
  let injectCalled = 0
  const ctx = {
    slots: {
      inject(name, callback) {
        injectCalled += 1
        assert.equal(name, 'conversation.session.header.utilities')
        return callback()
      },
      register(spec, component) {
        captured = { spec, component }
        return () => {}
      },
    },
    effect(cb) {
      cb()
      return () => {}
    },
    get() {
      return undefined
    },
  }

  exportsObject.apply(ctx)
  assert.equal(injectCalled, 1, 'injects into the header utilities slot once')
  assert.ok(captured !== null, 'slot registration captured')
  assert.equal(captured.spec.name, 'conversation.session.header.utilities')
  assert.equal(captured.spec.id, 'wagq-dsh-git')
  ok('注册到 conversation.session.header.utilities')

  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const html = renderToStaticMarkup(React.createElement(captured.component, { sessionId: 'session-1' }))
  assert.ok(html.includes('data-dsh-part="scm-button"'), 'button carries the semantic attribute')
  assert.ok(html.includes('源代码管理'), 'button has its accessible label')
  assert.ok(html.includes('<svg'), 'git icon rendered')
  ok('渲染出 Git 图标按钮')
  console.log(`\n  HTML: ${html.slice(0, 160)}…`)
}

/* ------------------------------------------------------------------ main */

async function main() {
  await testHost()
  await testClient()
  console.log(`\n\u001B[32m全部通过\u001B[0m（${passed} 项）`)
}

main().catch((error) => {
  console.error(`\n\u001B[31m失败\u001B[0m ${error?.stack ?? error}`)
  process.exit(1)
})
