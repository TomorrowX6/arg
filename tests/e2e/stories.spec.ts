import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { caseCollections } from '../../src/data/collections'

const sidePuzzles = JSON.parse(readFileSync('src/data/generated.json', 'utf8')).puzzles as {
  id: string
  collection?: string
}[]

test('the home story shelf resumes available work, tracks progress and opens finished evidence', async ({
  page,
}) => {
  await page.addInitScript(
    (finished) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          activePuzzle: 'x42',
          solved: Object.fromEntries(
            [...finished, 'x41'].map((id) => [
              id,
              { at: '2026-09-14T01:00:00Z', hints: 0, attempts: 1 },
            ]),
          ),
        }),
      ),
    sidePuzzles.filter((puzzle) => puzzle.collection === 'photographer').map((puzzle) => puzzle.id),
  )
  await page.goto('/')
  const resume = page.getByRole('complementary', { name: '继续上次的支线调查' })
  await expect(resume).toContainText('需要口令的校样')
  await expect(resume).toContainText('1 / 6')
  await expect(page.getByRole('link', { name: '接收第一条线索', exact: true })).toHaveAttribute(
    'href',
    '#/case/a01',
  )
  await page.getByRole('link', { name: '继续这段故事', exact: true }).click()
  await expect(page.getByRole('heading', { name: '需要口令的校样', exact: true })).toBeVisible()
  await page.goto('/')
  const shelf = page.getByRole('region', { name: '每一盏灯，都是一个故事' })
  await shelf.getByRole('button', { name: /^正在调查/ }).click()
  await expect(shelf.locator('article')).toHaveCount(1)
  await expect(shelf.locator('article')).toContainText('停在付印前的报社')
  await expect(shelf.getByRole('link', { name: '继续调查', exact: true })).toHaveAttribute(
    'href',
    '#/case/x42',
  )
  await shelf.getByRole('button', { name: /^已经复原/ }).click()
  await expect(shelf.locator('article')).toHaveCount(1)
  await expect(shelf.locator('article')).toContainText('摄影师的三张照片')
  await shelf.getByRole('link', { name: '重读故事证据', exact: true }).click()
  await expect(page).toHaveURL(/evidence\?collection=photographer/)
  await page.goto('/')
  await shelf.getByRole('button', { name: /^所有故事/ }).click()
  await shelf.getByRole('button', { name: /^展开其余/ }).click()
  await expect(shelf.locator('article')).toHaveCount(caseCollections.length)
})

test('all story covers and the resume card remain readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(() =>
    localStorage.setItem('echo-archive:v1', JSON.stringify({ version: 1, activePuzzle: 'x41' })),
  )
  await page.goto('/')
  await page.getByRole('button', { name: /^展开其余/ }).click()
  await expect(page.locator('.story-book')).toHaveCount(caseCollections.length)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
    })),
  ).toEqual([])
})
