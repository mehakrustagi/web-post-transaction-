import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR', e.message))
await p.goto('http://localhost:5181/orb', { waitUntil: 'domcontentloaded' })
const t = await p.evaluate(() => performance.now())
for (const d of process.argv.slice(2).map(Number)) {
  await p.waitForTimeout(Math.max(0, d - (await p.evaluate(() => performance.now()) - t)))
  await p.screenshot({ path: `/tmp/claude-501/b${d}.png` })
}
await b.close()
