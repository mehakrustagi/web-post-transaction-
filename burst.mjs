import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR', e.message))
const t0 = Date.now()
await p.goto('http://localhost:5181/orb', { waitUntil: 'domcontentloaded' })
for (const d of process.argv.slice(2).map(Number)) {
  await p.waitForTimeout(Math.max(0, d - (Date.now() - t0)))
  await p.screenshot({ path: `/tmp/claude-501/b${d}.png` })
}
await b.close()
