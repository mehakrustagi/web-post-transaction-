import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.goto('http://localhost:5181/transaction', { waitUntil: 'domcontentloaded' })
const out = await p.evaluate(() => new Promise((done) => {
  const t0 = performance.now(), marks = [], seen = new Set()
  const mark = (n) => { if (!seen.has(n)) { seen.add(n); marks.push([Math.round(performance.now() - t0), n]) } }
  let lastY = null, stillSince = 0
  const tick = () => {
    const now = performance.now() - t0
    const rig = document.querySelector('.rig-box')
    if (rig) for (const c of ['printing','done','torn','flapped','float']) if (rig.classList.contains(c)) mark(c)
    // the surface that becomes the card
    const surf = [...document.querySelectorAll('div')].find(d => (d.style.backgroundImage||'').includes('11, 89, 117') && d.className.includes('overflow-hidden') && d.getBoundingClientRect().width > 900)
    if (surf) mark('wash covers')
    else if (seen.has('wash covers')) mark('card formed')
    // the page has stopped scrolling
    const page = document.querySelector('main')
    const y = page ? Math.round(page.getBoundingClientRect().top) : 0
    const card = document.querySelector('[class*="rounded-\\[24px\\]"]')
    const cy = card ? Math.round(card.getBoundingClientRect().top) : null
    if (cy !== null && seen.has('card formed')) {
      if (cy === lastY) { if (now - stillSince > 900) mark('settled') } else { lastY = cy; stillSince = now }
    }
    if (now > 22000) return done(marks)
    requestAnimationFrame(tick)
  }
  tick()
}))
for (const [t, n] of out) console.log((t/1000).toFixed(2).padStart(6) + 's  ' + n)
await b.close()
