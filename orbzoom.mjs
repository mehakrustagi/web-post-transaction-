import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5181/orb', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(Number(process.argv[2]))
await p.screenshot({ path: '/tmp/claude-501/oz.png', clip: { x: 480, y: 440, width: 440, height: 420 } })
await b.close()
