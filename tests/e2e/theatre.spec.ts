import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

const cases = JSON.parse(readFileSync('content/puzzles-18-theatre.json', 'utf8'))
const solutions = [
  [
    [20, 20],
    [80, 20],
    [80, 80],
    [65, 35],
  ],
  [
    [50, 12],
    [88, 84],
    [12, 84],
    [50, 38],
    [67, 70],
    [33, 70],
  ],
  [
    [12, 12],
    [88, 12],
    [88, 88],
    [12, 88],
    [35, 35],
    [65, 35],
    [65, 65],
    [35, 65],
  ],
]
async function coordinates(page: Page, id: string, x: number, y: number) {
  await page.locator(`.untangle-node[data-node="${id}"]`).click()
  await page.getByRole('spinbutton', { name: '绳结横坐标', exact: true }).fill(String(x))
  await page.getByRole('spinbutton', { name: '绳结纵坐标', exact: true }).fill(String(y))
  await page.getByRole('button', { name: '移动到坐标', exact: true }).click()
}

test('untangle three real graphs by dragging, keyboard and coordinates, then decode the invitation', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x53')
  for (const [index, puzzle] of cases.entries()) {
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (index === 0) {
      await page.locator('.untangle-node[data-node="A"]').click()
      await expect(page.getByRole('spinbutton', { name: '绳结横坐标', exact: true })).toBeDisabled()
      await page.keyboard.press('ArrowRight')
      await expect(page.locator('.untangle-node[data-node="A"]')).toHaveAttribute(
        'aria-label',
        /横坐标 20/,
      )
      await page.locator('.untangle-board').scrollIntoViewIfNeeded()
      const board = (await page.locator('.untangle-board').boundingBox())!
      const node = (await page.locator('.untangle-node[data-node="D"]').boundingBox())!
      await page.mouse.move(node.x + node.width / 2, node.y + node.height / 2)
      await page.mouse.down()
      await page.mouse.move(board.x + board.width * 0.65, board.y + board.height * 0.35, {
        steps: 12,
      })
      await page.mouse.up()
      await expect(page.locator('.device-result')).toContainText('BELL')
      await expect(page.locator('.untangle-actions')).toContainText('可撤回 1 步')
      await page.getByRole('button', { name: '撤回一次移动', exact: true }).click()
      await expect(page.locator('.untangle-node[data-node="D"]')).toHaveAttribute(
        'aria-label',
        /横坐标 20，纵坐标 80/,
      )
      await coordinates(page, 'D', 65, 35)
    } else if (index < 3) {
      if (index === 1) {
        await page.locator('.untangle-node[data-node="A"]').focus()
        await page.keyboard.press('ArrowDown')
        await expect(page.locator('.untangle-node[data-node="A"]')).toHaveAttribute(
          'aria-label',
          /纵坐标 14/,
        )
        await page.getByRole('button', { name: '撤回一次移动', exact: true }).click()
        await page.getByRole('spinbutton', { name: '绳结横坐标', exact: true }).fill('99')
        await page.getByRole('button', { name: '移动到坐标', exact: true }).click()
        await expect(page.locator('.device-result')).toContainText('8 到 92')
      }
      for (const [node, [x, y]] of solutions[index].entries())
        await coordinates(page, String.fromCharCode(65 + node), x, y)
      await expect(page.locator('.device-result')).toContainText(puzzle.answers[0])
    } else {
      await page.getByRole('button', { name: '打开维吉尼亚解码器', exact: true }).click()
      await page.getByLabel('字母密钥', { exact: true }).fill('BELLWINGROW')
      await page.getByRole('button', { name: '还原这段编码', exact: true }).click()
      await expect(page.locator('.decoded-output')).toContainText('LEAVE ONE SEAT')
    }
    await page.locator('#case-answer').fill(puzzle.answers[0])
    await page.getByRole('button', { name: '验证线索', exact: true }).click()
    await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
    if (cases[index + 1])
      await page
        .getByRole('link', { name: `继续调查：${cases[index + 1].title}`, exact: true })
        .click()
  }
  expect(errors).toEqual([])
})

test('theatre supports actual touch dragging and readable phone controls', async ({
  page,
  context,
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
            ids.map((id: string) => [id, { at: '2026-09-14T02:00:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((p: { id: string }) => p.id),
  )
  for (const [index, puzzle] of cases.entries()) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (index === 0) {
      await page.locator('.untangle-board').scrollIntoViewIfNeeded()
      const board = (await page.locator('.untangle-board').boundingBox())!
      const node = (await page.locator('.untangle-node[data-node="D"]').boundingBox())!
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: node.x + node.width / 2, y: node.y + node.height / 2, id: 1 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: board.x + board.width * 0.65, y: board.y + board.height * 0.35, id: 1 }],
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect(page.locator('.device-result')).toContainText('BELL')
      await cdp.detach()
    } else if (index < 3) {
      for (const [node, [x, y]] of solutions[index].entries())
        await coordinates(page, String.fromCharCode(65 + node), x, y)
      await expect(page.locator('.device-result')).toContainText(puzzle.answers[0])
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
