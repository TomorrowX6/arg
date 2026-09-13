import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const cases = JSON.parse(readFileSync('content/puzzles-12-cipherlab.json', 'utf8'))

test('carry evidence into the workbench, decode successive layers and preserve the result in notes', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.goto('/#/case/x17')
  await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
  await expect(page.getByLabel('输入资料')).toHaveValue(cases[0].artifact.code)
  await page.getByRole('button', { name: '开始转换', exact: true }).click()
  await expect(page.getByLabel('处理结果')).toHaveValue('Q09NRSBIT01F')
  await page.getByRole('button', { name: '使用结果继续', exact: true }).click()
  await page.locator('.tool-picker').getByRole('button', { name: 'Base64', exact: true }).click()
  await page.getByRole('button', { name: '执行解码', exact: true }).click()
  await expect(page.getByLabel('处理结果')).toHaveValue('COME HOME')
  await page.getByRole('button', { name: '收进手记', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: '处理过程已保存到调查手记' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '返回档案：半圈之后，还有一层 原始资料已带入' }).click()
  for (const puzzle of cases) {
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (puzzle.id === 'x18') {
      await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
      await page.getByLabel('十六进制密钥').fill('17 A3')
      await page.getByRole('button', { name: '执行解码', exact: true }).click()
      await expect(page.getByLabel('处理结果')).toHaveValue('SWITCHBOARD')
      await page.locator('.tool-source-link').click()
    }
    if (puzzle.id === 'x19') {
      await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
      await page.getByRole('button', { name: '执行解码', exact: true }).click()
      await expect(page.getByLabel('处理结果')).toHaveValue('13-5-5-20/1-20/4-1-23-14')
      await page.getByRole('button', { name: '使用结果继续', exact: true }).click()
      await page
        .locator('.tool-picker')
        .getByRole('button', { name: '字母序号', exact: true })
        .click()
      await page.getByRole('button', { name: '执行解码', exact: true }).click()
      await expect(page.getByLabel('处理结果')).toHaveValue('MEET AT DAWN')
      await page.locator('.tool-source-link').click()
    }
    if (puzzle.id === 'x20') {
      await page.getByRole('link', { name: '换一种读法 把这段资料带到解码工具箱' }).click()
      await page.getByLabel('输入资料').fill('LISTEN')
      await page.getByRole('button', { name: '计算摘要', exact: true }).click()
      await expect(page.getByLabel('处理结果')).toHaveValue(puzzle.artifact.code)
      await page.locator('.tool-source-link').click()
    }
    await page.locator('#case-answer').fill(puzzle.answers[0])
    await page.getByRole('button', { name: '验证线索', exact: true }).click()
    await expect(page.getByRole('heading', { name: '档案已复原。' })).toBeFocused()
    const next = cases[cases.indexOf(puzzle) + 1]
    if (next) await page.getByRole('link', { name: `继续调查：${next.title}`, exact: true }).click()
  }
  await page.goto('/#/notes')
  await expect(page.getByText('半圈之后，还有一层 · Base64', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('半圈之后，还有一层 · Base64', { exact: true })).toBeVisible()
})

test('mobile story groups, quick actions and the compact toolbox remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/archives?chapter=side')
  await page.getByRole('button', { name: /摄影师的三张照片 真实文件/ }).click()
  await expect(page.locator('.archive-case-grid .puzzle-card')).toHaveCount(3)
  await page.goto('/#/case/x01')
  await page.locator('.case-dock').getByRole('button', { name: '提示 0/3' }).click()
  await expect(page.locator('#case-hints')).toBeFocused()
  await page.getByRole('button', { name: '展开第一条提示', exact: true }).click()
  await page.locator('.case-dock').getByRole('button', { name: '提交发现', exact: true }).click()
  await expect(page.locator('#case-findings')).toBeFocused()
  await expect(page.locator('.chapter-case-list > a')).toHaveCount(3)
  await page.goto('/#/tools')
  await page.getByRole('combobox', { name: '选择解码工具', exact: true }).selectOption('modpow')
  await page.getByLabel('底数').fill('48')
  await page.getByLabel('指数', { exact: true }).fill('27')
  await page.getByLabel('模数', { exact: true }).fill('55')
  await page.getByRole('button', { name: '计算余数', exact: true }).click()
  await expect(page.getByLabel('处理结果')).toHaveValue('27')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/#/case/constructor')
  await expect(page.getByRole('heading', { name: '这份档案尚未归档。' })).toBeVisible()
})
