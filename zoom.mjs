import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 3 })
await p.goto('http://localhost:5181/transaction', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => document.querySelector('.rig-box')?.classList.contains('torn'), null, { timeout: 30000 })
await p.waitForTimeout(Number(process.argv[2] || 700))
await p.screenshot({ path: '/tmp/claude-501/zoom.png', clip: { x: 430, y: 330, width: 330, height: 240 } })
await b.close()
