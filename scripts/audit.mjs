import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile, mkdir } from 'node:fs/promises'

await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const report = []
for (const route of ['/', '/case/a01', '/archives', '/settings', '/field']) {
  await page.goto(`http://127.0.0.1:4173/#${route}`, { waitUntil: 'networkidle' })
  await page.locator('main h1').waitFor()
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  report.push({
    route,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  })
}
await writeFile('artifacts/a11y-audit.json', JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    report.map((r) => ({
      route: r.route,
      violations: r.violations.map((v) => ({
        id: v.id,
        count: v.nodes.length,
        examples: v.nodes.slice(0, 3),
      })),
    })),
    null,
    2,
  ),
)
await browser.close()
