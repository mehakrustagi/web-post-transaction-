import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
await p.goto('http://localhost:5181/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(18000)
const step = () => p.evaluate(() => document.querySelector('main')?.dataset.step)
const read = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => d.style.transform?.includes('translateY') && d.className.includes('absolute inset-0'))
  return el ? el.style.transform : document.querySelector('main')?.innerText.slice(0,0) ?? 'none'
})
console.log('step', await step(), 'before', await read())
await p.mouse.move(700, 500)
for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(80) }
await p.waitForTimeout(600)
console.log('after ', await read())
await b.close()
