import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR', e.message))
await p.goto('http://localhost:5181/orb', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => document.querySelector('.rig-box')?.classList.contains('printing'), null, { timeout: 30000 })
const t = await p.evaluate(() => performance.now())
for (const d of (process.argv.slice(2).map(Number))) {
  await p.waitForTimeout(Math.max(0, d - (await p.evaluate(() => performance.now()) - t)))
  await p.screenshot({ path: `/tmp/claude-501/v${d}.png`, clip: { x: 430, y: 310, width: 560, height: 560 } })
}
await b.close()
