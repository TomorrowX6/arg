import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const cases = JSON.parse(readFileSync('content/puzzles-13-fairground.json', 'utf8'))

test('complete the six fairground cases through the symbol lock, mirrors, bridge and ticket finale', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x21')
  for (const puzzle of cases) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (puzzle.kind === 'codebreak') {
        for (let i = 0; i < 4; i++)
          await page.getByRole('button', { name: '填入圆', exact: true }).click()
        await page.getByRole('button', { name: '验证组合', exact: true }).click()
        await page.getByLabel('辅助推理：显示剩余候选数量').check()
        await expect(page.locator('.codebreak-assist strong')).toHaveText('625 组')
        await page.getByRole('button', { name: '验证组合', exact: true }).click()
        await expect(page.locator('.codebreak-log li')).toHaveCount(1)
        await expect(
          page.getByRole('status').filter({ hasText: '这个组合已经记录过了' }),
        ).toBeVisible()
        for (const symbol of ['星', '波', '星', '月'])
          await page.getByRole('button', { name: `填入${symbol}`, exact: true }).click()
        await page.getByRole('button', { name: '验证组合', exact: true }).click()
        await expect(page.locator('.codebreak-assist strong')).toHaveText('1 组')
      }
      if (puzzle.kind === 'laser') {
        const flips = puzzle.id === 'x22' ? [12, 24] : [9, 25, 29, 14, 6]
        await page.getByRole('button', { name: new RegExp(`^镜面 ${flips[0]}，`) }).click()
        await page.getByRole('button', { name: '撤回翻转', exact: true }).click()
        for (const cell of flips)
          await page.getByRole('button', { name: new RegExp(`^镜面 ${cell}，`) }).click()
        await page.getByText('文字版光路与棋盘', { exact: true }).click()
        await expect(page.locator('.laser-text-route')).toContainText('当前经过')
        await expect(page.locator('.laser-receiver.lit')).toHaveCount(
          puzzle.artifact.config.receivers.length,
        )
      }
      if (puzzle.kind === 'bridge') {
        for (const group of [['阿禾', '宁婆'], ['阿禾'], ['小满', '秦叔']]) {
          for (const name of group)
            await page.getByRole('button', { name: new RegExp(`^${name}，`) }).click()
          await page.locator('.bridge-plan > button').click()
        }
        await page.getByRole('button', { name: /^小满，/ }).click()
        await page.locator('.bridge-plan > button').click()
        await expect(page.getByRole('status').filter({ hasText: '灯油只剩 1 分钟' })).toBeVisible()
        await expect(page.locator('.bridge-history > li')).toHaveCount(3)
        await page.getByRole('button', { name: '重新安排', exact: true }).click()
        for (const group of [
          ['阿禾', '小满'],
          ['阿禾'],
          ['秦叔', '宁婆'],
          ['小满'],
          ['阿禾', '小满'],
        ]) {
          for (const name of group)
            await page.getByRole('button', { name: new RegExp(`^${name}，`) }).click()
          await page.locator('.bridge-plan > button').click()
        }
        await expect(page.locator('.bridge-history > li')).toHaveCount(5)
        await expect(page.getByRole('meter', { name: '剩余灯油', exact: true })).toHaveAttribute(
          'aria-valuenow',
          '0',
        )
      }
      if (['codebreak', 'laser', 'bridge'].includes(puzzle.kind))
        await expect(page.locator('.device-message.revealed')).toContainText(puzzle.answers[0])
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

test('fairground controls fit a phone and expose the optical, code and lamp states accessibly', async ({
  page,
}) => {
  test.setTimeout(90000)
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
  for (const id of ['x21', 'x22', 'x23', 'x25', 'x26']) {
    await page.goto(`/#/case/${id}`)
    await expect(
      page.getByRole('heading', {
        name: cases.find((puzzle: { id: string }) => puzzle.id === id).title,
        exact: true,
      }),
    ).toBeVisible()
    if (id === 'x21') {
      for (let i = 0; i < 4; i++)
        await page.getByRole('button', { name: '填入圆', exact: true }).click()
      await page.getByRole('button', { name: '验证组合', exact: true }).click()
    }
    if (id === 'x23') {
      for (const person of ['阿禾', '小满'])
        await page.getByRole('button', { name: new RegExp(`^${person}，`) }).click()
      await page.locator('.bridge-plan > button').click()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          reason: node.failureSummary,
        })),
      })),
      id,
    ).toEqual([])
  }
})
