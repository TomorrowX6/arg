import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { generateFieldPuzzle } from '../../src/game/field'
import { generateFieldV2, FIELD_MAX_INDEX } from '../../src/game/field-v2'
import { solveJugs } from '../../src/game/miniGames'
import type { JugState } from '../../src/game/miniGames'

const date = '2026-09-14'

test('restore every v2 signal family through the generated controls and preserve the log', async ({
  page,
}) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`/#/field?date=${date}&n=0&v=2`)
  for (let index = 0; index < 24; index++) {
    const puzzle = generateFieldV2(date, index)
    const config = puzzle.artifact.config!
    await test.step(puzzle.method, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (index === 13) {
        for (const cell of puzzle.hints[1].match(/\d+/g)!)
          await page
            .locator('.lights-grid > button')
            .nth(Number(cell) - 1)
            .click()
      }
      if (index === 14) {
        for (const [cell, bit] of (config.solution as number[]).entries())
          if (bit) await page.locator('.nonogram-table td > button').nth(cell).click()
      }
      if (index === 15) {
        const names = {
          fill0: '装满甲壶',
          fill1: '装满乙壶',
          empty0: '倒空甲壶',
          empty1: '倒空乙壶',
          pour01: '甲壶倒入乙壶',
          pour10: '乙壶倒入甲壶',
        }
        for (const action of solveJugs(config.capacity as JugState, 0, config.target as number)!)
          await page.getByRole('button', { name: names[action], exact: true }).click()
      }
      if (index === 16) {
        for (const tile of puzzle.hints[1].match(/\d+/g)!)
          await page.getByRole('button', { name: `画片 ${tile}`, exact: true }).click()
      }
      if (index === 17) {
        for (const [, tile, times] of puzzle.hints[1].matchAll(/(\d+) 号 (\d+) 次/g))
          for (let turn = 0; turn < Number(times); turn++)
            await page.getByRole('button', { name: new RegExp(`^线路 ${tile}，`) }).click()
      }
      if (index === 18) {
        const names = { 上: 'ArrowUp', 下: 'ArrowDown', 左: 'ArrowLeft', 右: 'ArrowRight' }
        const board = page.getByRole('group', { name: '推箱子棋盘', exact: true })
        await board.focus()
        for (const direction of puzzle.hints[1].split('：')[1].replace('。', '').split('、'))
          await board.press(names[direction as keyof typeof names])
      }
      if (index === 19) {
        for (const coin of [0, 1, 2]) await page.locator('.coin-grid > button').nth(coin).click()
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '右盘', exact: true })
          .click()
        for (const coin of [3, 4, 5]) await page.locator('.coin-grid > button').nth(coin).click()
        await page.getByRole('button', { name: '进行称量', exact: true }).click()
        await page.getByRole('button', { name: '清空两盘', exact: true }).click()
        const group = Math.floor(((config.heavy as number) - 1) / 3) * 3
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '左盘', exact: true })
          .click()
        await page.locator('.coin-grid > button').nth(group).click()
        await page
          .locator('.coin-destination')
          .getByRole('button', { name: '右盘', exact: true })
          .click()
        await page
          .locator('.coin-grid > button')
          .nth(group + 1)
          .click()
        await page.getByRole('button', { name: '进行称量', exact: true }).click()
        await page.getByLabel('判断较重硬币').selectOption(String(config.heavy))
        await page.getByRole('button', { name: '提交判断', exact: true }).click()
      }
      if (index === 20) {
        await page.getByRole('button', { name: '重放记忆', exact: true }).click()
        await expect(page.getByRole('button', { name: '重放记忆', exact: true })).toBeEnabled()
        for (const symbol of config.sequence as number[])
          await page
            .getByRole('button', {
              name: `符号 ${(config.symbols as string[])[symbol]}`,
              exact: true,
            })
            .click()
      }
      if (index === 21) {
        for (const [digit, count] of [...String(config.combination)].entries())
          for (let step = 0; step < Number(count); step++)
            await page.getByRole('button', { name: `第 ${digit + 1} 位增加`, exact: true }).click()
      }
      if (index === 22) {
        const items = config.items as { id: string; label: string }[]
        const order = items.map((item) => item.id)
        for (const [position, id] of (config.correct as string[]).entries()) {
          const current = order.indexOf(id)
          for (let move = current; move > position; move--)
            await page
              .getByRole('button', {
                name: `将${items.find((item) => item.id === id)!.label}向前移动`,
                exact: true,
              })
              .click()
          order.splice(current, 1)
          order.splice(position, 0, id)
        }
      }
      if (index === 23) {
        const slider = page.getByRole('slider', { name: 'FM 频率' })
        await slider.press('Home')
        for (
          let step = 0;
          step < Math.round(((config.target as number) - (config.min as number)) * 10);
          step++
        )
          await slider.press('ArrowRight')
      }
      if (index >= 13)
        await expect(page.locator('.device-message.revealed')).toContainText(puzzle.answer)
      if (index === 0) {
        await page.getByLabel('输入还原后的英文校验词').fill('WRONG')
        await page.getByRole('button', { name: '校验电报', exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '信号尚未对齐' })).toBeVisible()
      }
      await page.getByLabel('输入还原后的英文校验词').fill(puzzle.answer.toLowerCase())
      await page.getByRole('button', { name: '校验电报', exact: true }).click()
      await expect(page.locator('.field-solved')).toContainText(puzzle.answer)
      if (index < 23) await page.getByRole('button', { name: '接收下一份', exact: true }).click()
    })
  }
  await page.reload()
  await expect(page.locator('.field-solved')).toContainText(generateFieldV2(date, 23).answer)
  await expect(page.locator('.page-count > strong')).toHaveText('24')
  expect(errors).toEqual([])
})

test('keep old shared signals stable and make v2 channel, lookup, share and toolbox navigation exact', async ({
  page,
}) => {
  await page.goto(`/#/field?date=${date}&n=10`)
  await expect(
    page.getByRole('heading', { name: generateFieldPuzzle(date, 10).title, exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: '进入新频道', exact: true }).click()
  await page.getByRole('button', { name: '机关信号', exact: true }).click()
  await expect(page).toHaveURL(/n=13&v=2&channel=device/)
  await expect(page.getByRole('button', { name: '接收上一份', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '接收下一份', exact: true }).click()
  await expect(page).toHaveURL(/n=14&v=2&channel=device/)
  await page.getByText('调取指定日期与编号', { exact: true }).click()
  await page.getByLabel('电报编号', { exact: true }).fill('11')
  await page.getByRole('button', { name: '调取电报', exact: true }).click()
  await expect(page).toHaveURL(/n=10&v=2$/)
  await expect(page.getByRole('button', { name: '全部信号', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('link', { name: '把这段资料带到解码工具箱', exact: true }).click()
  await expect(page.getByLabel('输入资料')).toHaveValue(generateFieldV2(date, 10).artifact.code!)
  await page.getByRole('button', { name: '开始转换', exact: true }).click()
  await page.getByRole('button', { name: '使用结果继续', exact: true }).click()
  await page.locator('.tool-picker').getByRole('button', { name: 'Base64', exact: true }).click()
  await page.getByRole('button', { name: '执行解码', exact: true }).click()
  await expect(page.getByLabel('处理结果')).toHaveValue(generateFieldV2(date, 10).answer)
  await page.locator('.tool-source-link').click()
  await expect(page).toHaveURL(/field\?date=2026-09-14&n=10&v=2$/)
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    }),
  )
  await page.getByRole('button', { name: '分享这份电报', exact: true }).click()
  await expect(page.getByLabel('这份电报的完整链接')).toHaveValue(page.url())
  await page.goto(`/#/field?date=${date}&n=${FIELD_MAX_INDEX}&v=2`)
  await expect(page.getByRole('button', { name: '接收下一份', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '密码电报', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`n=${FIELD_MAX_INDEX - 3}&v=2&channel=cipher`))
})

test('generated devices and the date tuner fit narrow screens and have accessible controls', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 390, height: 844 })
  for (let index = 13; index < 24; index++) {
    await page.goto(`/#/field?date=${date}&n=${index}&v=2`)
    await expect(
      page.getByRole('heading', { name: generateFieldV2(date, index).title, exact: true }),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(scan.violations, generateFieldV2(date, index).method).toEqual([])
  }
  await page.getByText('调取指定日期与编号', { exact: true }).click()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
