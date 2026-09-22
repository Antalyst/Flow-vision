import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = 'C:/dev/Flow-vision/.scratch_screens5';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'bagocity@example.com');
await page.fill('input[type="password"]', 'bago123');
await page.click('button[type="submit"]');
await page.waitForURL('**/employee/**', { timeout: 15000 }).catch(() => {});
await page.goto('http://localhost:3000/employee/documents', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

await page.getByRole('button', { name: /upload document/i }).first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/empty.png`, fullPage: true });

const tmpFile = path.join(OUT, 'sample.txt');
fs.writeFileSync(tmpFile, 'sample content');
await page.setInputFiles('input[type="file"]', tmpFile);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/withfile.png`, fullPage: true });

const width = await page.evaluate(() => document.querySelector('form.fixed')?.getBoundingClientRect().width);
console.log('drawer width px:', width, 'viewport 1920 -> 70% =', 1920 * 0.7);

await browser.close();
console.log('DONE');
console.log(errors.join('\n') || 'no errors');
