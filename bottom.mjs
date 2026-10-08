import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5181/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(18000)
await p.mouse.move(700, 500)
for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(70) }
await p.waitForTimeout(1600)
await p.screenshot({ path: '/tmp/claude-501/bottom.png' })
await b.close()
