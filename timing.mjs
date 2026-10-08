import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.goto('http://localhost:5181/transaction', { waitUntil: 'domcontentloaded' })
const marks = await p.evaluate(() => new Promise((done) => {
  const t0 = performance.now(), out = []
  const seen = new Set()
  const mark = (n) => { if (!seen.has(n)) { seen.add(n); out.push([n, Math.round(performance.now() - t0)]) } }
  const tick = () => {
    const rig = document.querySelector('.rig-box')
    if (rig) for (const c of ['printing','done','torn','flapped','float']) if (rig.classList.contains(c)) mark('rig:' + c)
    if (document.querySelector('.rig-box')) mark('rig:mounted')
    else if (seen.has('rig:mounted')) mark('rig:gone')
    // the wash: its sheet is the only fixed-gradient element on the page
    const wash = [...document.querySelectorAll('div')].find(d => (d.style.backgroundImage || '').includes('#118388'))
    if (wash) mark('wash:mounted')
    else if (seen.has('wash:mounted')) mark('wash:gone')
    if (seen.has('rig:gone') && seen.has('wash:gone')) return done(out)
    if (performance.now() - t0 > 30000) return done(out)
    requestAnimationFrame(tick)
  }
  tick()
}))
for (const [n, t] of marks) console.log(String(t).padStart(6), n)
await b.close()
