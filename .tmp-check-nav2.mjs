import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

for (const route of ['/', '/features', '/tracking']) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const info = await page.evaluate(() => {
    const nav = document.querySelector('nav')
    const links = Array.from(nav?.querySelectorAll('a') ?? []).map(a => ({
      text: a.textContent?.trim(),
      href: a.getAttribute('href'),
      visible: a.offsetParent !== null,
    }))
    const navRect = nav?.getBoundingClientRect()
    return { linkCount: links.length, links, navWidth: navRect?.width }
  })
  console.log(`--- ${route} ---`)
  console.log(JSON.stringify(info, null, 2))
}

await browser.close()
