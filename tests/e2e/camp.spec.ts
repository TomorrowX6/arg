import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { loopEdges, solveLoop, solveTents } from '../../src/game/camp'

const cases = JSON.parse(readFileSync('content/puzzles-17-camp.json', 'utf8'))

test('follow the camp through unique tent placements, loops and a two-stage cipher ending', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x47')
  for (const [index, puzzle] of cases.entries()) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      const config = puzzle.artifact.config
      if (puzzle.kind === 'tents') {
        if (puzzle.id === 'x47') {
          await page.locator('.tent-cell[data-cell="0"]').click()
          await page.keyboard.press('ArrowRight')
          await expect(page.locator('.tent-cell[data-cell="1"]')).toBeFocused()
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('t')
          await expect(page.locator('.tent-cell.conflict')).toHaveCount(2)
          await page.getByRole('button', { name: '检查营地', exact: true }).click()
          await expect(page.locator('.device-result')).toContainText('红框')
          await page.getByRole('button', { name: '撤回一步', exact: true }).click()
          await page.getByRole('button', { name: '标草地', exact: true }).click()
          await page.locator('.tent-cell[data-cell="6"]').click()
          await expect(page.locator('.tent-cell[data-cell="6"]')).toHaveAttribute(
            'aria-label',
            /草地标记/,
          )
          await page.keyboard.press('Delete')
          await page.getByRole('button', { name: '搭帐篷', exact: true }).click()
          await page.getByRole('button', { name: '重置营地', exact: true }).click()
        }
        for (const cell of solveTents(config)[0])
          await page.locator(`.tent-cell[data-cell="${cell}"]`).click()
        await expect(page.locator('.device-result')).toContainText(config.message)
        await expect(page.locator('.tent-pairing line')).toHaveCount(config.trees.length)
      }
      if (puzzle.kind === 'loop') {
        if (puzzle.id === 'x48') {
          await page.locator('.loop-edge[data-edge="h0-0"]').focus()
          await page.keyboard.press('x')
          await expect(page.locator('.loop-drawing .excluded')).toHaveCount(1)
          await page.keyboard.press('Delete')
          await expect(page.locator('.loop-drawing .excluded')).toHaveCount(0)
          await page.keyboard.press('ArrowDown')
          await expect(page.locator('.loop-edge[data-edge="v0-0"]')).toBeFocused()
          await page.keyboard.press('l')
          await expect(page.locator('.loop-edge[data-edge="v0-0"]')).toHaveAttribute(
            'aria-pressed',
            'true',
          )
          await page.getByRole('button', { name: '重画步道', exact: true }).click()
        }
        if (puzzle.id === 'x50') {
          await page.locator('.loop-edge[data-edge="h3-0"]').click()
          await page.getByRole('button', { name: '检查环线', exact: true }).click()
          await expect(page.locator('.device-result')).toContainText('红色数字')
          await page.getByRole('button', { name: '撤回一笔', exact: true }).click()
        }
        const solution = solveLoop(config)[0]
        for (const [edgeIndex, edge] of loopEdges(config).entries())
          if (solution[edgeIndex]) await page.locator(`.loop-edge[data-edge="${edge.id}"]`).click()
        await expect(page.locator('.device-result')).toContainText(config.message)
        await expect(page.locator('.loop-board')).toHaveClass(/complete/)
      }
      if (puzzle.id === 'x51') {
        const input = cases
          .slice(0, 4)
          .map((item: { answers: string[] }) => item.answers[0].toLowerCase())
          .join('-')
        const digest = createHash('sha256').update(input).digest('hex')
        await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
        await page.getByLabel('输入资料').fill(input)
        await page.getByRole('button', { name: '计算摘要', exact: true }).click()
        await expect(page.getByLabel('处理结果')).toHaveValue(digest)
        await page.locator('.tool-source-link').click()
        await expect(page.getByRole('row').filter({ hasText: digest.slice(0, 12) })).toContainText(
          'DUCK',
        )
      }
      if (puzzle.id === 'x52') {
        await page.getByRole('button', { name: '打开维吉尼亚解码器', exact: true }).click()
        await page.getByLabel('字母密钥', { exact: true }).fill('DUCK')
        await page.getByRole('button', { name: '还原这段编码', exact: true }).click()
        await expect(page.locator('.decoded-output')).toContainText('BRING BISCUITS')
      }
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
      if (cases[index + 1])
        await page
          .getByRole('link', { name: `继续调查：${cases[index + 1].title}`, exact: true })
          .click()
    })
  }
  await page.reload()
  await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('camp maps and their completed state fit a phone and have readable feedback', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(
    (ids) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id: string) => [id, { at: '2026-09-14T01:00:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((puzzle: { id: string }) => puzzle.id),
  )
  for (const puzzle of cases) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    const config = puzzle.artifact.config
    if (puzzle.kind === 'tents') {
      for (const cell of solveTents(config)[0])
        await page.locator(`.tent-cell[data-cell="${cell}"]`).click()
      await expect(page.locator('.device-result')).toContainText(config.message)
    }
    if (puzzle.kind === 'loop') {
      const solution = solveLoop(config)[0]
      for (const [index, edge] of loopEdges(config).entries())
        if (solution[index]) await page.locator(`.loop-edge[data-edge="${edge.id}"]`).click()
      await expect(page.locator('.device-result')).toContainText(config.message)
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
