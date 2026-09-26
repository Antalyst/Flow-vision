import { chromium } from 'playwright'

const errors = []
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.stack || err.message}`))

await page.goto('http://localhost:3000/features', { waitUntil: 'domcontentloaded' })
try {
  await page.waitForSelector('text=Platform Features', { timeout: 8000 })
}
catch {
  console.log('SELECTOR_NOT_FOUND')
}
await page.waitForTimeout(1000)
await page.screenshot({ path: 'C:\\dev\\Flow-vision\\.tmp-features-error.png' })
console.log('BODY_TEXT_SNIPPET', (await page.evaluate(() => document.body.innerText)).slice(0, 500))

const fullHeight = await page.evaluate(() => document.body.scrollHeight)
const stops = [0, 0.15, 0.35, 0.55, 0.75, 0.95].map(f => Math.floor(fullHeight * f))
let i = 0
for (const y of stops) {
  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `C:\\dev\\Flow-vision\\.tmp-features-${i}.png` })
  i++
}

console.log('CONSOLE_ERRORS', JSON.stringify(errors))
await browser.close()
