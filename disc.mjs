import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.goto('http://localhost:5181/transaction', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => {
  const el = [...document.querySelectorAll('div')].find(d => (d.style.backgroundImage||'').includes('11, 89, 117') && d.className.includes('overflow-hidden'))
  const w = el?.getBoundingClientRect().width || 0
  const r = el?.getBoundingClientRect(); return r && Math.abs(r.width - r.height) < 6 && r.width > 520 && r.width < 1100
}, null, { timeout: 30000, polling: 'raf' })
await p.screenshot({ path: '/tmp/claude-501/disc.png' })
await b.close()
