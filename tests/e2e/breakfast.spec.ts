import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const cases = JSON.parse(readFileSync('content/puzzles-20-breakfast.json', 'utf8'))

test('restore the serving order, measure the tea, repair the cat stamp and read the breakfast bill', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/#/case/x61')
  for (const [index, puzzle] of cases.entries()) {
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (index === 0) {
      const desired = ['奶油卷', '橙皮吐司', '肉桂卷', '芝麻贝果', '蜂蜜小圆包']
      for (const [destination, label] of desired.entries()) {
        const current = await page.locator('.sort-list li strong').allTextContents()
        for (let position = current.indexOf(label); position > destination; position--)
          await page.getByRole('button', { name: `将${label}向前移动`, exact: true }).click()
      }
      await expect(page.locator('.device-message')).toContainText('RISE')
    } else if (index === 1) {
      await page.getByRole('button', { name: '装满乙壶', exact: true }).click()
      await page.getByRole('button', { name: '撤回一步', exact: true }).click()
      await expect(
        page.getByRole('img', { name: '乙壶当前 0 升，容量 4 升', exact: true }),
      ).toBeVisible()
      for (const action of [
        '装满乙壶',
        '乙壶倒入甲壶',
        '装满乙壶',
        '乙壶倒入甲壶',
        '倒空甲壶',
        '乙壶倒入甲壶',
        '装满乙壶',
        '乙壶倒入甲壶',
      ])
        await page.getByRole('button', { name: action, exact: true }).click()
      await expect(
        page.getByRole('img', { name: '甲壶当前 5 升，容量 7 升', exact: true }),
      ).toBeVisible()
      await expect(page.locator('.device-message')).toContainText('WATER')
    } else if (index === 2) {
      for (const [cell, value] of puzzle.artifact.config.solution.entries())
        if (value) await page.locator('.nonogram-table td > button').nth(cell).click()
      await expect(page.locator('.device-message')).toContainText('PAWS')
    } else {
      await page.getByRole('button', { name: '打开维吉尼亚解码器', exact: true }).click()
      await page.getByLabel('字母密钥', { exact: true }).fill('RISEWATERPAWS')
      await page.getByRole('button', { name: '还原这段编码', exact: true }).click()
      await expect(page.locator('.decoded-output')).toContainText('BREAKFAST IS ON ME')
    }
    await page.locator('#case-answer').fill(puzzle.answers[0])
    await page.getByRole('button', { name: '验证线索', exact: true }).click()
    await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
    if (cases[index + 1])
      await page
        .getByRole('link', { name: `继续调查：${cases[index + 1].title}`, exact: true })
        .click()
  }
  await expect(page.getByRole('complementary', { name: '故事已完整复原' })).toContainText(
    '迟到也有早餐',
  )
})

test('breakfast controls and the seven-square nonogram fit a phone', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(
    (ids) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id: string) => [id, { at: '2026-09-14T02:40:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((puzzle: { id: string }) => puzzle.id),
  )
  for (const puzzle of cases) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (puzzle.id === 'x63') {
      const cells = page.locator('.nonogram-table td > button')
      await cells.first().focus()
      await page.keyboard.press('ArrowRight')
      await expect(cells.nth(1)).toBeFocused()
      await page.keyboard.press('x')
      await expect(cells.nth(1)).toHaveAttribute('aria-label', /已标空/)
      await page.keyboard.press('ArrowDown')
      await expect(cells.nth(8)).toBeFocused()
    }
    expect
      .soft(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        puzzle.id,
      )
      .toBe(true)
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect
      .soft(
        result.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
        })),
        puzzle.id,
      )
      .toEqual([])
  }
})
