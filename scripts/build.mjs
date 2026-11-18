#!/usr/bin/env node
/**
 * Build: host half (tsc → dist/index.js, pure ESM) + browser half
 * (esbuild → dist/client.js wrapped in the `__ModuleLoader__` classic-script
 * shell the DSH client module system expects).
 *
 * Why the shell: the browser loads each plugin as `plugins/<pkg>/client.js` and
 * that file must itself call `window.__ModuleLoader__.load({ id, factory })`.
 * Bare specifiers stay external (`require('react')`) so the host's frozen
 * platform module table resolves them; only relative modules are inlined.
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const OUT = path.join(ROOT, 'dist')
const CLIENT_WRAPPER = 'window.__ModuleLoader__.load({'

const color = process.stdout.isTTY === true && process.env.NO_COLOR === undefined
const paint = (code, text) => (color ? `\u001B[${code}m${text}\u001B[39m` : text)
const log = (text) => console.log(`${paint(36, '[build]')} ${text}`)
const fail = (text) => {
  console.error(`${paint(31, '[build]')} ${text}`)
  process.exit(1)
}

function resolveTypeScript() {
  try {
    const main = require.resolve('typescript')
    return path.join(path.dirname(main), 'tsc.js')
  } catch {
    return fail('找不到 typescript，请先在插件目录执行 pnpm install')
  }
}

function resolveEsbuild() {
  try {
    return require('esbuild')
  } catch {
    return fail('找不到 esbuild，请先在插件目录执行 pnpm install')
  }
}

function runTsc(tscPath, project) {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [tscPath, '-p', project], { cwd: ROOT }, (error, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
      if (error) reject(error)
      else resolve()
    })
    child.on('error', reject)
  })
}

async function bundleClient() {
  const esbuild = resolveEsbuild()
  const header = [
    CLIENT_WRAPPER,
    `  id: ${JSON.stringify(PKG.name)},`,
    '  factory: (require) => {',
    '    var module = { exports: {} };',
    '    var exports = module.exports;',
    "    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });",
    '',
  ].join('\n')
  const footer = ['', '    return module.exports;', '  },', '});', ''].join('\n')

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src', 'client', 'index.ts')],
    outfile: path.join(OUT, 'client.js'),
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    // Bare package names stay as require('x') for the host's module table;
    // relative modules (./ScmPanel, ./styles …) are inlined into the bundle.
    packages: 'external',
    sourcemap: false,
    banner: { js: header },
    footer: { js: footer },
    logLevel: 'warning',
    legalComments: 'none',
  })
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  log('tsc → dist/index.js（node 端 ESM）')
  await runTsc(resolveTypeScript(), 'tsconfig.json')

  log('esbuild → dist/client.js（浏览器端 classic script）')

  await bundleClient()

  const bundlePath = path.join(OUT, 'client.js')
  const head = fs.readFileSync(bundlePath, 'utf8').slice(0, CLIENT_WRAPPER.length)
  if (head !== CLIENT_WRAPPER) fail('dist/client.js 缺少 __ModuleLoader__ 外壳')

  for (const entry of ['index.js', 'client.js']) {
    const file = path.join(OUT, entry)
    if (!fs.existsSync(file)) fail(`缺少产物 dist/${entry}`)
    log(`ok  dist/${entry}  ${(fs.statSync(file).size / 1024).toFixed(1)} KiB`)
  }
}

main().catch((error) => fail(error?.message ?? String(error)))
