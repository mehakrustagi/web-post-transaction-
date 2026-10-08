import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5181/', { waitUntil: 'domcontentloaded' })
// catch the slip part-way through its recede, whatever the clock says
await p.waitForFunction(() => {
  const s = document.querySelector('.sheet')
  if (!s) return false
  const r = s.getBoundingClientRect()
  return r.width > 0 && r.width < 170
}, null, { timeout: 30000, polling: 'raf' })
await p.screenshot({ path: '/tmp/claude-501/merge.png' })
await b.close()
