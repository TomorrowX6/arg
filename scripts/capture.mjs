import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
})
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true })
await page.goto('http://127.0.0.1:4173/#/case/a01', { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '一封未寄出的信', exact: true }).waitFor()
await page.screenshot({ path: 'artifacts/first-case-desktop.png', fullPage: true })
await page.setViewportSize({ width: 390, height: 844 })
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true })
console.log(
  JSON.stringify({
    errors,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    title: await page.title(),
  }),
)
await browser.close()
