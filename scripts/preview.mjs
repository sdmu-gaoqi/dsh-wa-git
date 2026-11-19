#!/usr/bin/env node
/**
 * Preview — renders the SCM popup as a real DOM in headless Chromium and writes
 * a PNG, so the look can be judged without booting the whole harness.
 *
 * The popup's `api` layer is stubbed through `window.__WAGQ_GIT_FIXTURE__`, and
 * the host tokens are copied from the dark theme so the render matches what the
 * desktop shell shows.
 *
 * Run: node scripts/preview.mjs [--repo <dir>]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function fixtureRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wagq-git-preview-'))
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const write = (name, text) => fs.writeFileSync(path.join(dir, name), text)
  git('init', '-q', '-b', 'main')
  git('config', 'user.name', 'YG')
  git('config', 'user.email', 'yg@example.com')
  git('config', 'commit.gpgsign', 'false')

  write('cordis.patch.yml', '[ ]\n')
  write('package.json', '{"name":"demo"}\n')
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 初始化项目')

  write('src-index.ts', "export const name = 'demo'\n")
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 加上入口')

  git('checkout', '-q', '-b', 'feat/scm-panel')
  write('src-panel.ts', 'export const Panel = () => null\n')
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 源代码管理弹窗骨架')

  write('src-styles.ts', 'export const CSS = ``\n')
  git('add', '.')
  git('commit', '-q', '-m', 'feat: 弹窗样式')

  git('checkout', '-q', 'main')
  write('README.md', '# demo\n')
  git('add', '.')
  git('commit', '-q', '-m', 'docs: 加上 README')
  git('merge', '-q', '--no-ff', 'feat/scm-panel', '-m', 'merge: feat/scm-panel → main')

  write('cordis.patch.yml', '[ ]\n# patched\n')
  write('notes.md', '# notes\n')
  write('src-styles.ts', 'export const CSS = `.a{color:red}`\n')
  return dir
}

async function main() {
  const repoArg = process.argv.indexOf('--repo')
  const repo = repoArg === -1 ? null : process.argv[repoArg + 1]

  const esbuild = require('esbuild')
  const entry = `
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { GitHeaderButton } from './src/client/ScmPanel'
import { api } from './src/client/api'

const data = window.__WAGQ_GIT_DATA__ ?? {}
if (data.state) {
  Object.assign(api, {
    state: () => Promise.resolve(data.state),
    sessions: () => Promise.resolve(data.sessions),
    diff: (cwd_, path_, staged) => Promise.resolve(
      data.diffs[path_ + '|' + (staged ? '1' : '0')] ?? {
        ok: true, path: path_, staged, binary: false, tooLarge: false, patch: '', added: 0, removed: 0,
      },
    ),
    message: () => Promise.resolve(data.message),
    branches: () => Promise.resolve(data.branches),
    remotes: () => Promise.resolve(data.remotes),
    compare: () => Promise.resolve(data.compare),
    commitDetail: (cwd_, sha) => Promise.resolve(
      data.commits[sha] ?? { ok: true, commit: data.commits[Object.keys(data.commits)[0]] },
    ),
    stage: () => Promise.resolve({ ok: true }),
    unstage: () => Promise.resolve({ ok: true }),
    discard: () => Promise.resolve({ ok: true }),
    commit: () => Promise.resolve({ ok: true, sha: '0'.repeat(40), short: '0000000', branch: 'main', summary: '' }),
    sync: () => Promise.resolve({ ok: true, summary: '已拉取', output: '' }),
    checkout: () => Promise.resolve({ ok: true, branch: 'main' }),
    deleteBranch: () => Promise.resolve({ ok: true }),
    addRemote: () => Promise.resolve({ ok: true }),
    removeRemote: () => Promise.resolve({ ok: true }),
    setRemoteUrl: () => Promise.resolve({ ok: true }),
    commitAction: () => Promise.resolve({ ok: true, action: 'reset-soft', summary: 'ok', output: '' }),
    terminal: (cwd_, command) => Promise.resolve(
      data.terminal && data.terminal[command]
        ? { ok: true, command, ...data.terminal[command] }
        : { ok: true, command, output: '', code: 0, cwd: cwd_, durationMs: 1 },
    ),
  })
}

function Host() {
  const button = React.useRef(null)
  React.useEffect(() => {
    // Open the popup immediately for the screenshot.
    const node = button.current?.querySelector('.dshg-trigger')
    node?.click()
  }, [])
  return React.createElement('div', {
    ref: button,
    style: { position: 'fixed', top: 12, right: 40 },
  }, React.createElement(GitHeaderButton, { sessionId: 'session-1' }))
}

createRoot(document.getElementById('app')).render(React.createElement(Host))
`
  const outfile = path.join(os.tmpdir(), `wagq-git-preview-${Date.now()}.mjs`)
  await esbuild.build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts', sourcefile: 'preview.tsx' },
    outfile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'transform',
    loader: { '.ts': 'ts' },
    logLevel: 'warning',
  })

  const target = repo ?? fixtureRepo()
  const state = buildState(target)
  const diffs = {}
  for (const entry of [...state.staged, ...state.changes, ...state.untracked]) {
    diffs[`${entry.path}|${entry.kind === 'staged' ? '1' : '0'}`] = diffFixture(target, entry.path, entry.kind === 'staged')
  }

  const branches = branchFixture(target)
  const remotes = {
    ok: true,
    remotes: [{ name: 'origin', url: 'https://github.com/example/dsh-wa-git.git', pushUrl: 'https://github.com/example/dsh-wa-git.git' }],
  }
  const commits = {}
  for (const commit of state.commits.slice(0, 6)) {
    commits[commit.sha] = { ok: true, commit: commitFixture(target, commit.sha) }
  }
  const terminal = terminalFixture(target)
  // Compare fixture: pretend HEAD is 2 ahead and 1 behind, which is the shape the
  // panel is designed around (both columns non-empty).
  const compare = {
    ok: true,
    upstream: 'origin/main',
    ahead: state.commits.slice(0, 2).map((commit) => ({
      sha: commit.sha,
      short: commit.short,
      author: commit.author,
      time: commit.time,
      subject: commit.subject,
    })),
    behind: [
      { sha: 'b'.repeat(40), short: 'bbbbbbb', author: 'teammate', time: Math.floor(Date.now() / 1000) - 5400, subject: 'fix: 远端修复了一个边界条件' },
    ],
  }

  // `--alpha` reproduces the dream-skin case: layer tokens carry transparency so
  // artwork shows through panels. A floating dialog must still be opaque.
  const alpha = process.argv.includes('--alpha')
  const layer = (solid) => (alpha ? `${solid}80` : solid)
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>@wagq/dsh-git preview</title>
<style>
  :root{
    --dsw-alias-bg-base:#16181d; --dsw-alias-bg-layer-1:${layer('#1c1f26')}; --dsw-alias-bg-layer-2:${layer('#22262e')};
    --dsw-alias-bg-layer-3:${layer('#282d36')}; --dsw-alias-bg-overlay:${layer('#1c1f26')};
    --dsw-alias-border-l1:#2c313a; --dsw-alias-border-l2:#333944; --dsw-alias-border-l3:#2a2f38;
    --dsw-alias-label-primary:#e8eaee; --dsw-alias-label-secondary:#b6bcc8;
    --dsw-alias-label-tertiary:#8b94a3; --dsw-alias-label-quaternary:#6b7483;
    --dsw-alias-label-primary-inverted:#0d0f13;
    --dsw-alias-interactive-bg-hover:#ffffff0f; --dsw-alias-interactive-bg-active:#ffffff1a;
    --dsw-alias-state-business-primary:#4d8dff; --dsw-alias-state-success-primary:#3fb950;
    --dsw-alias-state-error-primary:#f85149; --dsw-alias-state-warn-primary:#d29922;
    --dsw-alias-scrollbar-bg-l1:#3a4049; --dsw-alias-scrollbar-hover-l1:#4a515c;
    --dsw-alias-file-diff-added-bg:${alpha ? '#1b3a26cc' : '#1b3a26'}; --dsw-alias-file-diff-deleted-bg:${alpha ? '#3d1d1fcc' : '#3d1d1f'};
    --dsw-alias-file-diff-added-gutter:#22502f; --dsw-alias-file-diff-deleted-gutter:#5a2427;
    --dsw-alias-markdown-code-block-banner:${layer('#232830')};
    --dsh-code-font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  body{margin:0;height:100vh;background:linear-gradient(160deg,#1a1d24,#0f1116 60%);font:13px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#e8eaee}
  #app{height:100%}
  .chrome{position:fixed;left:24px;top:20px;font-size:12px;color:#6b7483}
  /* Standing content behind the dialog: any bleed-through would show as text here. */
  .behind{position:fixed;left:24px;top:64px;width:520px;font-size:14px;line-height:1.9;color:#cfd6e2}
  .behind b{color:#8fb7ff}
</style></head>
<body>
<div class="chrome">DSH · @wagq/dsh-git · 源代码管理弹窗预览${alpha ? '（半透明皮肤模拟）' : ''}</div>
<div class="behind"><b>BEHIND THE DIALOG — 这行字不该透进弹窗</b><br>
如果弹窗底色是半透明的，这一段会从弹窗里透出来。<br>
如果底色不透明，只有弹窗边缘之外能看到它。</div>
<div id="app"></div>
<script>window.__WAGQ_GIT_DATA__ = ${JSON.stringify({
    state,
    sessions: { ok: true, sessions: [{ id: 'session-1', cwd: target, title: 'demo' }] },
    diffs,
    branches,
    remotes,
    compare,
    commits,
    terminal,
    message: { ok: true, message: 'chore: 更新 2 个文件' },
  }).replace(/</g, '\\u003c')};</script>
<script src="${path.basename(outfile)}"></script>
</body></html>`

  const htmlPath = path.join(path.dirname(outfile), 'index.html')
  fs.writeFileSync(htmlPath, html, 'utf8')

  const { chromium } = await importPlaywright()
  const browser = await launchChromium(chromium)
  const page = await browser.newPage({ viewport: { width: 980, height: 820 }, deviceScaleFactor: 2 })
  page.on('pageerror', (error) => console.error('[preview:pageerror]', error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('[preview:console]', message.text())
  })
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`)
  await page.waitForTimeout(800)

  // Scene = what the screenshot should be showing.
  const scene = process.argv.find((arg) => arg.startsWith('--scene='))?.slice('--scene='.length) ?? 'changes'
  const shots = {
    changes: 'scm-popup.png',
    diff: 'scm-popup-diff.png',
    graph: 'scm-popup-graph.png',
    menu: 'scm-popup-menu.png',
    context: 'scm-popup-context.png',
    branches: 'scm-popup-branches.png',
    terminal: 'scm-popup-terminal.png',
    compare: 'scm-popup-compare.png',
    remotes: 'scm-popup-remotes.png',
    'branch-menu': 'scm-popup-branch-menu.png',
    'add-remote': 'scm-popup-add-remote.png',
  }
  const file = shots[scene] ?? shots.changes

  if (scene === 'diff') {
    await page.locator('.dshg-row').first().click()
    await page.waitForTimeout(500)
  } else if (scene === 'compare') {
    await page.locator('.dshg-ahead').first().click()
    await page.waitForTimeout(600)
  } else if (scene === 'graph') {
    await page.getByRole('tab', { name: /图表/ }).click()
    await page.waitForTimeout(200)
    await page.locator('.dshg-grow').first().click()
    await page.waitForTimeout(400)
  } else if (scene === 'menu') {
    await page.locator('button[title="更多操作"]').click()
    await page.waitForTimeout(250)
  } else if (scene === 'context') {
    await page.getByRole('tab', { name: /图表/ }).click()
    await page.waitForTimeout(200)
    await page.locator('.dshg-grow').nth(1).click({ button: 'right' })
    await page.waitForTimeout(250)
  } else if (scene === 'branches') {
    await page.locator('.dshg-branch-btn').click()
    await page.waitForTimeout(350)
  } else if (scene === 'remotes') {
    await page.locator('button[title="更多操作"]').click()
    await page.waitForTimeout(200)
    await page.getByRole('menuitem', { name: /远程管理/ }).click()
    await page.waitForTimeout(400)
  } else if (scene === 'add-remote') {
    await page.locator('button[title="更多操作"]').click()
    await page.waitForTimeout(180)
    await page.getByRole('menuitem', { name: /远程管理/ }).click()
    await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /添加远端/ }).click()
    await page.waitForTimeout(300)
  } else if (scene === 'branch-menu') {
    await page.locator('.dshg-branch-btn').click()
    await page.waitForTimeout(250)
    await page.locator('button[title="更多操作"]').click()
    await page.waitForTimeout(250)
  } else if (scene === 'terminal') {
    await page.getByRole('tab', { name: /终端/ }).click()
    await page.waitForTimeout(200)
    await page.locator('.dshg-term-field').fill('git log --oneline --graph --all -8')
    await page.locator('.dshg-term-field').press('Enter')
    await page.waitForTimeout(500)
    await page.locator('.dshg-term-field').fill('git status -sb')
    await page.locator('.dshg-term-field').press('Enter')
    await page.waitForTimeout(400)
  }

  const target_png = path.join(ROOT, 'preview', file)
  fs.mkdirSync(path.dirname(target_png), { recursive: true })
  if (process.argv.includes('--measure')) {
    const box = await page.evaluate(() => {
      const pick = (selector) => {
        const node = document.querySelector(selector)
        if (node === null) return null
        const rect = node.getBoundingClientRect()
        const cs = getComputedStyle(node)
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          display: cs.display,
          flex: cs.flex,
          background: cs.backgroundColor,
          opacity: cs.opacity,
        }
      }
      return {
        root: pick('.dshg-root'),
        body: pick('.dshg-body'),
        list: pick('.dshg-body > .dshg-list'),
        diff: pick('.dshg-diff'),
        menu: pick('.dshg-menu'),
        confirm: pick('.dshg-confirm'),
        confirmFields: document.querySelectorAll('.dshg-confirm-field').length,
        button: (() => {
          const node = document.querySelector('button[title="更多操作"]')
          if (node === null) return null
          const r = node.getBoundingClientRect()
          return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
        })(),
        branchPicker: document.querySelector('.dshg-branchpicker') !== null,
      }
    })
    console.log('[measure]', JSON.stringify(box, null, 2))
  }
  await page.screenshot({ path: target_png })
  await browser.close()
  console.log('[preview]', target_png)
  fs.rmSync(outfile, { force: true })
  fs.rmSync(htmlPath, { force: true })
}

/* --------------------------------------------------------------- fixtures */

function branchFixture(cwd) {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch {
      return ''
    }
  }
  const out = []
  for (const line of git('for-each-ref', '--sort=-committerdate', '--format=%(refname:short)%1f%(HEAD)%1f%(upstream:short)%1f%(objectname:short)%1f%(contents:subject)', 'refs/heads').split('\n')) {
    if (line.trim() === '') continue
    const [name, head, upstream, sha, subject] = line.split('\x1f')
    out.push({ name, remote: false, current: head.trim() === '*', upstream, ahead: 0, behind: 0, sha, subject })
  }
  out.push({ name: 'origin/main', remote: true, current: false, upstream: '', ahead: 0, behind: 0, sha: out[0]?.sha ?? '', subject: '' })
  out.push({ name: 'origin/feat/scm-panel', remote: true, current: false, upstream: '', ahead: 0, behind: 0, sha: out[1]?.sha ?? '', subject: '' })
  return { ok: true, branches: out }
}

function commitFixture(cwd, sha) {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      return typeof error.stdout === 'string' ? error.stdout : ''
    }
  }
  const meta = git('show', '--no-patch', '--pretty=format:%H%x1f%an%x1f%ae%x1f%at%x1f%P%x1f%D%x1f%s%x1f%b', sha)
  const [full, author, email, time, parents, refs, subject, body] = meta.split('\x1f')
  const parent = (parents ?? '').trim()
  const patch = parent === '' ? git('show', '--no-color', '--format=', sha) : git('diff', '--no-color', `${sha}^`, sha)
  const files = []
  for (const line of git('diff', '--numstat', parent === '' ? `${sha}^` : `${sha}^`, sha).split('\n')) {
    if (line.trim() === '') continue
    const [added, removed, ...rest] = line.split('\t')
    const filePath = rest.join('\t')
    if (filePath === '') continue
    files.push({ path: filePath, from: '', added: Number(added) || 0, removed: Number(removed) || 0, binary: added === '-' })
  }
  let added = 0
  let removed = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) added += 1
    else if (line.startsWith('-')) removed += 1
  }
  return {
    sha: full,
    short: (full ?? sha).slice(0, 7),
    author: author ?? '',
    email: email ?? '',
    time: Number(time) || 0,
    committer: author ?? '',
    parents: parent === '' ? [] : parent.split(' '),
    refs: (refs ?? '')
      .split(',')
      .map((part) => part.trim().replace(/^HEAD -> /, ''))
      .filter(Boolean),
    subject: subject ?? '',
    body: body ?? '',
    files,
    patch,
    added,
    removed,
    tooLarge: false,
  }
}

function terminalFixture(cwd) {
  const run = (command) => {
    try {
      const stdout = execFileSync('powershell.exe', ['-NoLogo', '-NonInteractive', '-NoProfile', '-Command', command], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { output: stdout.trimEnd(), code: 0, cwd, durationMs: 24 }
    } catch (error) {
      return { output: String(error.stdout ?? '').trimEnd(), code: 1, cwd, durationMs: 24 }
    }
  }
  return {
    'git log --oneline --graph --all -8': run('git log --oneline --graph --all -8'),
    'git status -sb': run('git status -sb'),
    'git branch -vv': run('git branch -vv'),
    'git diff --stat': run('git diff --stat'),
    'git stash list': run('git stash list'),
  }
}

async function launchChromium(chromium) {
  try {
    return await chromium.launch()
  } catch (error) {
    // No downloaded Chromium: reuse an installed Edge/Chrome instead of a 100 MB
    // download, which is plenty for a layout screenshot.
    for (const channel of ['msedge', 'chrome']) {
      try {
        return await chromium.launch({ channel })
      } catch {
        // try the next installed browser
      }
    }
    throw error
  }
}

async function importPlaywright() {
  try {
    return await import('playwright')
  } catch {
    throw new Error('需要 playwright：pnpm add -D playwright')
  }
}

function buildState(cwd) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const read = (args) => {
    try {
      return git(...args)
    } catch {
      return ''
    }
  }
  const branch = read(['symbolic-ref', '--short', '-q', 'HEAD']).trim() || 'main'
  const root = read(['rev-parse', '--show-toplevel']).trim() || cwd
  const head = read(['rev-parse', '--short', 'HEAD']).trim()
  const commits = read(['log', '--all', '--date-order', '--max-count', '40', '--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s%x1e'])
    .split('\x1e')
    .map((chunk) => chunk.replace(/^\n+/, ''))
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      const [sha, parents, author, email, time, refs, subject] = chunk.split('\x1f')
      return {
        sha,
        short: sha.slice(0, 7),
        parents: (parents ?? '').split(' ').filter(Boolean),
        author: author ?? '',
        email: email ?? '',
        time: Number(time) || 0,
        refs: (refs ?? '')
          .split(',')
          .map((part) => part.trim().replace(/^HEAD -> /, ''))
          .filter(Boolean),
        subject: subject ?? '',
      }
    })

  const porcelain = read(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const entries = []
  for (const record of porcelain.split('\0')) {
    if (record === '') continue
    const code = record.slice(0, 2)
    const path_ = record.slice(3)
    const index = code[0]
    const worktree = code[1]
    const untracked = code === '??'
    const staged = !untracked && index !== ' ' && index !== '?'
    const kind = untracked ? 'untracked' : staged ? 'staged' : 'unstaged'
    entries.push({
      path: path_,
      from: '',
      code,
      index,
      worktree,
      kind,
      letter: untracked ? 'U' : code.trim()[0] ?? 'M',
    })
  }

  const stats = {}
  for (const args of [
    ['diff', '--numstat', '--no-color', '--find-renames'],
    ['diff', '--numstat', '--cached', '--no-color', '--find-renames'],
  ]) {
    for (const line of read(args).split('\n')) {
      if (line === '') continue
      const [added, removed, ...rest] = line.split('\t')
      const key = rest.join('\t')
      if (key === '') continue
      const current = stats[key] ?? { added: 0, removed: 0 }
      current.added += Number(added) || 0
      current.removed += Number(removed) || 0
      stats[key] = current
    }
  }
  for (const entry of entries) {
    if (entry.kind !== 'untracked' || stats[entry.path] !== undefined) continue
    const text = fs.readFileSync(path.join(cwd, entry.path), 'utf8')
    const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
    stats[entry.path] = { added: lines, removed: 0 }
  }

  return {
    ok: true,
    cwd,
    repo: {
      root,
      name: path.basename(root),
      branch,
      detached: false,
      head,
      upstream: '',
      ahead: 0,
      behind: 0,
      empty: commits.length === 0,
    },
    staged: entries.filter((entry) => entry.kind === 'staged'),
    changes: entries.filter((entry) => entry.kind === 'unstaged'),
    untracked: entries.filter((entry) => entry.kind === 'untracked'),
    commits,
    stats,
  }
}

function diffFixture(cwd, file, staged = false) {
  const gitDiff = (...args) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      // `git diff --no-index` exits 1 when the files differ.
      return typeof error.stdout === 'string' ? error.stdout : ''
    }
  }
  let patch = ''
  if (file !== undefined) patch = gitDiff('diff', '--no-color', ...(staged ? ['--cached'] : []), '--', file)
  if (patch === '' && file !== undefined && !staged) {
    // Untracked file: show its whole content like the host route does.
    try {
      const text = fs.readFileSync(path.join(cwd, file), 'utf8')
      patch = [
        `diff --git a/${file} b/${file}`,
        'new file mode 100644',
        `--- /dev/null`,
        `+++ b/${file}`,
        `@@ -0,0 +1,${text.split('\n').length - (text.endsWith('\n') ? 1 : 0)} @@`,
        ...text
          .split('\n')
          .filter((line, index, all) => !(index === all.length - 1 && line === ''))
          .map((line) => `+${line}`),
        '',
      ].join('\n')
    } catch {
      patch = ''
    }
  }
  let added = 0
  let removed = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) added += 1
    else if (line.startsWith('-')) removed += 1
  }
  return {
    ok: true,
    path: file ?? '',
    staged,
    binary: false,
    tooLarge: false,
    patch,
    added,
    removed,
  }
}

main().catch((error) => {
  console.error('[preview]', error?.message ?? error)
  process.exit(1)
})
