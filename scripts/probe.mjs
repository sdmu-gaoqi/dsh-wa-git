#!/usr/bin/env node
/**
 * Diagnostic probe: opens the LIVE harness page, opens the SCM popup, and reports
 * the computed colour tokens the popup actually renders against. Used to explain
 * a translucent popup on a skin whose `--dsw-alias-bg-layer-*` carry alpha.
 *
 * Usage: node scripts/probe.mjs <url-with-token> [--shot out.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const url = process.argv[2]
  if (!url) throw new Error('缺少 url')
  const shotIndex = process.argv.indexOf('--shot')
  const shot = shotIndex === -1 ? '' : process.argv[shotIndex + 1]

  const { chromium } = await import('playwright')
  let browser
  try {
    browser = await chromium.launch()
  } catch {
    browser = await chromium.launch({ channel: 'msedge' })
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
  await page.goto(url)
  await page.waitForTimeout(3500)

  const tokens = await page.evaluate(() => {
    const probe = document.createElement('div')
    document.body.appendChild(probe)
    const names = [
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-2',
      '--dsw-alias-bg-layer-3',
      '--dsw-alias-bg-mask-1',
      '--dsw-alias-border-l2',
      '--dsw-alias-label-primary',
      '--dsw-specific-sidebar-fill',
    ]
    const out = {}
    for (const name of names) {
      probe.style.color = `var(${name})`
      out[name] = getComputedStyle(probe).color
    }
    probe.remove()
    return { tokens: out, dark: document.body.dataset.dsDarkTheme ?? '', platform: document.documentElement.dataset.platform ?? '' }
  })
  console.log(JSON.stringify(tokens, null, 2))

  // Open the git popup via the header button.
  const trigger = page.locator('[data-dsh-part="scm-button"]')
  if ((await trigger.count()) > 0) {
    await trigger.first().click()
    await page.waitForTimeout(1500)
    const popup = page.locator('.dshg-root')
    if ((await popup.count()) > 0) {
      const style = await popup.first().evaluate((node) => {
        const cs = getComputedStyle(node)
        return { background: cs.backgroundColor, backdrop: cs.backdropFilter, opacity: cs.opacity, zIndex: cs.zIndex }
      })
      console.log('popup computed:', JSON.stringify(style))
      // What is actually painted underneath the popup's centre?
      const box = await popup.first().boundingBox()
      console.log('popup box:', JSON.stringify(box))
    } else {
      console.log('popup did not open')
    }
    if (shot !== '') {
      fs.mkdirSync(path.dirname(shot), { recursive: true })
      await page.screenshot({ path: shot })
      console.log('[probe] shot', shot)
    }
  } else {
    console.log('trigger not found (popup closed / plugin not loaded)')
  }
  await browser.close()
}

main().catch((error) => {
  console.error('[probe]', error?.message ?? error)
  process.exit(1)
})
