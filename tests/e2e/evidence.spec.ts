import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const postal = JSON.parse(readFileSync('content/puzzles-14-postoffice.json', 'utf8'))
const solved = ['a01', 'x21', 'x22', 'x23', 'x27', 'x28', 'x29', 'x30', 'x31']
test.beforeEach(async ({ page }) => {
  await page.addInitScript((ids) => {
    if (!sessionStorage.getItem('evidence-seeded')) {
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id, i) => [
              id,
              { at: new Date(Date.UTC(2026, 8, 14, 0, i)).toISOString(), hints: 0, attempts: 1 },
            ]),
          ),
        }),
      )
      sessionStorage.setItem('evidence-seeded', 'yes')
    }
  }, solved)
})

test('find known clues, compare across stories and save the exact evidence with a return link', async ({
  page,
}) => {
  await page.goto('/#/case/x32')
  await page.getByRole('link', { name: '查阅证据', exact: true }).click()
  await expect(page.getByLabel('按章节或故事筛选证据')).toHaveValue('story:postoffice')
  await expect(page.locator('.evidence-note')).toHaveCount(5)
  await expect(page.getByRole('link', { name: /返回调查：/ })).toHaveAttribute('href', '#/case/x32')
  await page.getByLabel('搜索已收集的证据').fill('window seven')
  await expect(page.locator('.evidence-note')).toHaveCount(1)
  await expect(page.locator('.evidence-note')).toContainText(postal[2].evidence.title)
  await page.getByLabel('搜索已收集的证据').fill('未公开的签收终局')
  await expect(page.locator('.evidence-note')).toHaveCount(0)
  await expect(page.getByText('已确认的证据里，没有这条线索。')).toBeVisible()
  await page.getByLabel('搜索已收集的证据').fill('')
  for (const puzzle of postal.slice(0, 5)) {
    await page.getByRole('button', { name: `对照：${puzzle.evidence.title}`, exact: true }).click()
  }
  await expect(page.locator('.comparison-grid > article')).toHaveCount(5)
  await page.getByLabel('按章节或故事筛选证据').selectOption('story:fairground')
  await expect(page.locator('.evidence-note')).toHaveCount(3)
  const firstTitle = await page.locator('.evidence-note h2').first().innerText()
  await page.locator('.evidence-note-bottom button').first().click()
  await expect(page.locator('.comparison-grid > article')).toHaveCount(6)
  await page.locator('.evidence-note-bottom button').nth(1).click()
  await expect(page.getByText('对照台可同时放六份证据，先取下一份再继续。')).toBeVisible()
  await page.getByRole('button', { name: `从对照台取下${firstTitle}`, exact: true }).click()
  await expect(page.locator('.comparison-grid > article')).toHaveCount(5)
  await page.getByLabel('按章节或故事筛选证据').selectOption('story:postoffice')
  await expect(page.locator('.evidence-note')).toHaveCount(5)
  await page.getByRole('button', { name: '时间线视图', exact: true }).click()
  await page.getByLabel('证据排列顺序').selectOption('recent')
  await expect(page.locator('.evidence-timeline > button').first()).toContainText(
    postal[4].evidence.title,
  )
  await page.locator('.evidence-timeline > button').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.evidence-related button')).toHaveCount(4)
  await expect(page.getByRole('dialog')).not.toContainText(postal[5].evidence.title)
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await page.getByRole('button', { name: '存入手记，继续推理', exact: true }).click()
  await expect(page.getByLabel('手记标题')).toHaveValue('无人签收的邮局 · 证据对照')
  for (const puzzle of postal.slice(0, 5))
    await expect(page.getByLabel('手记正文')).toHaveValue(new RegExp(puzzle.evidence.title))
  await expect(page.getByRole('link', { name: /关联档案：/ })).toHaveAttribute('href', '#/case/x32')
  await page.reload()
  await expect(page.getByLabel('手记正文')).toHaveValue(/我的推理：/)
})

test('the evidence board, comparison and connected clues fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/#/evidence?collection=postoffice&from=x32')
  await expect(page.locator('.evidence-note')).toHaveCount(5)
  for (let i = 0; i < 3; i++) await page.locator('.evidence-note-bottom button').nth(i).click()
  await page.getByRole('button', { name: '对照台 · 3/6', exact: true }).click()
  await expect(page.getByRole('region', { name: '证据对照台', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const check = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      result.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
      })),
    ).toEqual([])
  }
  await check()
  await page
    .getByRole('button', { name: `查看证据：${postal[0].evidence.title}`, exact: true })
    .click()
  await check()
  await page.screenshot({ path: 'artifacts/evidence-mobile.png', fullPage: true })
})
