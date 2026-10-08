import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.goto('http://localhost:5181/transaction', { waitUntil: 'domcontentloaded' })
const out = await p.evaluate(() => new Promise((done) => {
  const t0 = performance.now(), rows = []
  const tick = () => {
    const el = [...document.querySelectorAll('div')].find(d => (d.style.backgroundImage||'').includes('11, 89, 117') && d.className.includes('overflow-hidden'))
    if (el) { const r = el.getBoundingClientRect(); rows.push([Math.round(performance.now()-t0), Math.round(r.width), Math.round(r.height)]) }
    else if (rows.length) return done(rows)
    if (performance.now() - t0 > 25000) return done(rows)
    requestAnimationFrame(tick)
  }
  tick()
}))
const seen = new Set()
for (const [t,w,h] of out) { const k = w+'x'+h; if (!seen.has(k)) { seen.add(k); console.log(t, k) } }
console.log('frames:', out.length, 'first:', out[0]?.[0], 'last:', out.at(-1)?.[0])
await b.close()
