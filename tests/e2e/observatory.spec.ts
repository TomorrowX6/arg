import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { solveSudoku, solveTraffic } from '../../src/game/observatory'

const cases = JSON.parse(readFileSync('content/puzzles-15-observatory.json', 'utf8'))
const starPaths: Record<string, string[]> = {
  x34: ['B', 'E', 'C', 'B', 'D', 'A', 'C', 'D'],
  x37: ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'F', 'D', 'B'],
}

test('restore all eight observatory records through calendars, star trails, rail rooms, clocks and stencils', async ({
  page,
}) => {
  test.setTimeout(150000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x33')
  for (const puzzle of cases) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      const config = puzzle.artifact.config
      if (puzzle.kind === 'sudoku') {
        if (puzzle.id === 'x33') {
          await page.locator('.sudoku-cell').nth(1).click()
          await page.keyboard.press('3')
          await expect(page.locator('.sudoku-cell.conflict')).toHaveCount(2)
          await page.getByRole('button', { name: '撤回一笔', exact: true }).click()
          await page.getByRole('button', { name: '铅笔候选', exact: true }).click()
          await page.locator('.sudoku-cell').nth(1).click()
          await page.keyboard.press('4')
          await expect(page.locator('.sudoku-cell').nth(1)).toHaveAttribute('aria-label', /候选 4/)
          await page.keyboard.press('Delete')
          await page.getByRole('button', { name: '铅笔候选', exact: true }).click()
          await page.getByRole('button', { name: '显示可填候选', exact: true }).click()
          await expect(page.locator('.sudoku-assistance')).toContainText('可以填：4')
          await page.locator('.sudoku-cell').nth(1).focus()
          await page.keyboard.press('ArrowRight')
          await expect(page.locator('.sudoku-cell').nth(2)).toBeFocused()
        }
        const solved = solveSudoku(config)[0]
        for (let i = 0; i < solved.length; i++)
          if (!config.givens[i]) {
            await page.locator('.sudoku-cell').nth(i).click()
            await page.keyboard.press(String(solved[i]))
          }
        await expect(page.locator('.device-result')).toContainText(config.message)
      }
      if (puzzle.kind === 'constellation') {
        if (puzzle.id === 'x34') {
          await page.getByRole('button', { name: /^星点 E，/ }).click()
          await expect(page.locator('.device-result')).toContainText('只能沿一条还没走过的连线')
          await page.getByRole('button', { name: /^星点 B，/ }).click()
          await page.getByRole('button', { name: '撤回一步', exact: true }).click()
        }
        for (const id of starPaths[puzzle.id])
          await page.getByRole('button', { name: new RegExp(`^星点 ${id}，`) }).click()
        await expect(page.locator('.device-result')).toContainText(config.message)
        await page.getByText('查看文字版星轨', { exact: true }).click()
        await expect(page.locator('.constellation-text li span')).toHaveText(
          Array(config.edges.length).fill('已走过'),
        )
      }
      if (puzzle.kind === 'traffic') {
        if (puzzle.id === 'x35') {
          await page.getByRole('button', { name: /^T 号轨架/ }).focus()
          await page.keyboard.press('ArrowRight')
          await expect(page.locator('.device-result')).toContainText('这个方向已被')
        }
        const solution = solveTraffic(config)!
        for (const [step, move] of solution.entries()) {
          const vehicle = config.vehicles[move.vehicle]
          await page.getByRole('button', { name: new RegExp(`^${vehicle.id} 号轨架，`) }).click()
          const direction =
            vehicle.axis === 'h' ? (move.delta > 0 ? '右' : '左') : move.delta > 0 ? '下' : '上'
          if (step % 2 === 0)
            await page.keyboard.press(
              `Arrow${{ 右: 'Right', 左: 'Left', 下: 'Down', 上: 'Up' }[direction]}`,
            )
          else
            await page.getByRole('button', { name: `轨架向${direction}移动`, exact: true }).click()
        }
        await expect(page.locator('.device-result')).toContainText(config.message)
        await expect(page.locator('.mini-statusbar')).toContainText(`${solution.length} 次移动`)
      }
      if (puzzle.kind === 'orbital') {
        await page.getByRole('spinbutton', { name: '已经过多少分钟', exact: true }).fill('4')
        await page.getByRole('button', { name: '+ 7 分钟', exact: true }).click()
        await expect(page.locator('.orbital-state')).toContainText('甲钟：0 · 乙钟：0 · 丙钟：6')
        await page.getByRole('button', { name: '+ 63 分钟', exact: true }).click()
        await page.getByRole('button', { name: '+ 63 分钟', exact: true }).click()
        await expect(
          page.getByRole('spinbutton', { name: '已经过多少分钟', exact: true }),
        ).toHaveValue('137')
        await expect(page.locator('.device-result')).toContainText('三针共同归零')
        await page.getByRole('button', { name: '撤回推进', exact: true }).click()
        await expect(
          page.getByRole('spinbutton', { name: '已经过多少分钟', exact: true }),
        ).toHaveValue('74')
        await page.getByRole('button', { name: '+ 63 分钟', exact: true }).click()
      }
      if (puzzle.kind === 'stencil') {
        await page.getByRole('button', { name: '叠片 1，寻星', exact: true }).click()
        await page.getByRole('button', { name: '读取像素文字', exact: true }).click()
        await expect(page.locator('.device-result')).toContainText('目前还不是完整的像素字')
        await page.getByRole('button', { name: '叠片 3，远行', exact: true }).click()
        await page.getByRole('button', { name: '叠片 7，候光', exact: true }).click()
        await page.getByRole('button', { name: '读取像素文字', exact: true }).click()
        await expect(page.locator('.device-result')).toContainText('DAWN')
        await page.getByText('查看逐格零一矩阵', { exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '叠片结果，零一矩阵', exact: true }),
        ).toHaveValue(/^11110001110010001010001/)
      }
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
      const next = cases[cases.indexOf(puzzle) + 1]
      if (next)
        await page.getByRole('link', { name: `继续调查：${next.title}`, exact: true }).click()
    })
  }
  await page.reload()
  await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('observatory controls and feedback remain readable on a narrow phone', async ({ page }) => {
  test.setTimeout(150000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(
    (ids) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id: string) => [id, { at: '2026-09-14T00:00:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((puzzle: { id: string }) => puzzle.id),
  )
  for (const puzzle of cases) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (puzzle.kind === 'sudoku') {
      await page.getByRole('button', { name: '铅笔候选', exact: true }).click()
      await page.getByRole('button', { name: '显示可填候选', exact: true }).click()
      await page.locator('.sudoku-cell').nth(puzzle.artifact.config.givens.indexOf(0)).click()
      await page.keyboard.press('4')
    }
    if (puzzle.kind === 'constellation')
      await page.getByText('查看文字版星轨', { exact: true }).click()
    if (puzzle.kind === 'orbital')
      await page.getByRole('spinbutton', { name: '已经过多少分钟', exact: true }).fill('137')
    if (puzzle.kind === 'stencil') {
      for (const i of [0, 2, 6]) await page.locator('.stencil-layers > button').nth(i).click()
      await page.getByRole('button', { name: '读取像素文字', exact: true }).click()
      await page.getByText('查看逐格零一矩阵', { exact: true }).click()
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
