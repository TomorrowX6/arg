import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const cases = JSON.parse(readFileSync('content/puzzles-11-supply.json', 'utf8'))

test('complete the supply station using the scale, jugs, ferry and warehouse', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x13')
  for (const puzzle of cases) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (puzzle.kind === 'balance') {
        for (const index of [0, 1, 2]) await page.locator('.coin-grid > button').nth(index).click()
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '右盘', exact: true })
          .click()
        for (const index of [3, 4, 5]) await page.locator('.coin-grid > button').nth(index).click()
        await page.getByRole('button', { name: '进行称量', exact: true }).click()
        await expect(page.locator('.weighing-history')).toContainText('两盘平衡')
        await page.getByLabel('判断较重硬币').selectOption('7')
        await page.getByRole('button', { name: '提交判断', exact: true }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '现有称量还支持 3 个候选' }),
        ).toBeVisible()
        await page.getByRole('button', { name: '清空两盘', exact: true }).click()
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '左盘', exact: true })
          .click()
        await page.locator('.coin-grid > button').nth(6).click()
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '右盘', exact: true })
          .click()
        await page.locator('.coin-grid > button').nth(7).click()
        await page.getByRole('button', { name: '进行称量', exact: true }).click()
        await page.getByRole('button', { name: '提交判断', exact: true }).click()
      }
      if (puzzle.kind === 'jugs') {
        await expect(page.getByRole('button', { name: '甲壶倒入乙壶', exact: true })).toBeDisabled()
        await page.getByRole('button', { name: '装满甲壶', exact: true }).click()
        await page.getByRole('button', { name: '撤回一步', exact: true }).click()
        await expect(page.getByRole('img', { name: '甲壶当前 0 升，容量 5 升' })).toBeVisible()
        for (const action of [
          '装满甲壶',
          '甲壶倒入乙壶',
          '倒空乙壶',
          '甲壶倒入乙壶',
          '装满甲壶',
          '甲壶倒入乙壶',
        ])
          await page.getByRole('button', { name: action, exact: true }).click()
      }
      if (puzzle.kind === 'ferry') {
        await page.getByRole('button', { name: '🦊 狐狸', exact: true }).click()
        await page.getByRole('button', { name: '出航至东岸', exact: true }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '这次出航会把鹅与谷物' }),
        ).toBeVisible()
        for (const passenger of ['🪿 鹅', '空船', '🦊 狐狸', '🪿 鹅', '🌾 谷物', '空船', '🪿 鹅']) {
          await page.getByRole('button', { name: passenger, exact: true }).click()
          await page.getByRole('button', { name: /^出航至/ }).click()
        }
      }
      if (puzzle.kind === 'warehouse') {
        const board = page.getByRole('group', { name: '推箱子棋盘', exact: true })
        await board.focus()
        await board.press('ArrowUp')
        await expect(page.getByRole('status').filter({ hasText: '这个方向被挡住了' })).toBeVisible()
        for (const key of [
          'ArrowLeft',
          'ArrowUp',
          'ArrowUp',
          'ArrowLeft',
          'ArrowUp',
          'ArrowRight',
          'ArrowDown',
          'ArrowDown',
          'ArrowRight',
          'ArrowRight',
        ])
          await board.press(key)
      }
      await expect(page.locator('.device-message.revealed')).toContainText(puzzle.answers[0])
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。' })).toBeVisible()
      const next = cases[cases.indexOf(puzzle) + 1]
      if (next)
        await page.getByRole('link', { name: `继续调查：${next.title}`, exact: true }).click()
    })
  }
  expect(errors).toEqual([])
})
