import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } })
p.on('console', m => { if (m.type()==='error'||m.type()==='warning') console.log(m.type(), m.text().slice(0,200)) })
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0,200)))
await p.goto('http://localhost:5181/', { waitUntil: 'networkidle' })
await p.waitForTimeout(18000)
await b.close()
