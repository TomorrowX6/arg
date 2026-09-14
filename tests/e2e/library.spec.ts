import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const cases = JSON.parse(readFileSync('content/puzzles-19-library.json', 'utf8'))

test('read four library papers through the toolbox and return to the story shelf', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/#/case/x57')
  for (const [index, puzzle] of cases.entries()) {
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (index < 2) {
      await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
      await expect(page.getByLabel('输入资料')).toHaveValue(puzzle.artifact.code)
      await page
        .getByRole('button', { name: index === 0 ? '执行解码' : '开始转换', exact: true })
        .click()
      if (index === 1) {
        await expect(page.getByLabel('处理结果')).toHaveValue('43 23 15 31 21 / 44 23 42 15 15')
        await page.getByRole('button', { name: '使用结果继续', exact: true }).click()
        await page
          .locator('.tool-picker')
          .getByRole('button', { name: '五乘五方阵', exact: true })
          .click()
        await page.getByRole('button', { name: '执行解码', exact: true }).click()
      }
      await expect(page.getByLabel('处理结果')).toHaveValue(puzzle.answers[0])
      await page.locator('.tool-source-link').click()
    } else if (index === 2) {
      await expect(
        page.getByText('Many small rooms hold morning light.', { exact: true }),
      ).toBeVisible()
      await expect(page.getByText(puzzle.artifact.code, { exact: true })).toBeVisible()
    } else {
      await page.getByRole('button', { name: '打开逐字节异或工具', exact: true }).click()
      await page.getByLabel('十六进制密钥', { exact: true }).fill('4D 41 52 47 49 4E')
      await page.getByRole('button', { name: '还原这段编码', exact: true }).click()
      await expect(page.locator('.decoded-output')).toContainText('TAKE YOUR TIME')
    }
    await page.locator('#case-answer').fill(puzzle.answers[0])
    await page.getByRole('button', { name: '验证线索', exact: true }).click()
    await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
    if (cases[index + 1])
      await page
        .getByRole('link', { name: `继续调查：${cases[index + 1].title}`, exact: true })
        .click()
  }
  const completion = page.getByRole('complementary', { name: '故事已完整复原' })
  await expect(completion).toContainText('没有截止日的借书证')
  await expect(completion).toContainText('4 份档案，已完整复原')
  await completion.getByRole('link', { name: '回看这段故事的证据', exact: true }).click()
  await expect(page).toHaveURL(/evidence\?collection=library/)
  await page.goBack()
  await page.getByRole('link', { name: '挑选下一段故事', exact: true }).click()
  await expect(page.locator('#story-shelf-title')).toBeFocused()
  await page.getByRole('button', { name: /^已经复原/ }).click()
  await expect(page.locator('.story-book')).toHaveCount(1)
  await expect(page.locator('.story-book')).toContainText('没有截止日的借书证')
})

test('the library text and completion card remain readable on a phone', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(
    (ids) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id: string) => [id, { at: '2026-09-14T02:30:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((p: { id: string }) => p.id),
  )
  for (const puzzle of cases) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
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
          nodes: item.nodes.map((node) => node.target),
        })),
        puzzle.id,
      )
      .toEqual([])
  }
})
