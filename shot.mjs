import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.log('PAGEERR', e.message))
p.on('console', m => m.type() === 'error' && !/vibrate/.test(m.text()) && console.log('ERR', m.text()))
await p.goto('http://localhost:5181/', { waitUntil: 'load' })
await p.waitForTimeout(1500)
const t0 = Date.now()
await p.mouse.click(700, 980)
const marks = process.argv.slice(2).map(Number)
for (const at of marks) {
  await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)))
  await p.screenshot({ path: `/tmp/claude-501/t${at}.png` })
}
await b.close()
