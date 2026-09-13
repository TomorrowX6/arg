import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const cases = JSON.parse(readFileSync('content/puzzles-10-side.json', 'utf8'))

test('recover real files and complete the independent side stories', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x01')
  for (const puzzle of cases) {
    await test.step(`${puzzle.id}: ${puzzle.title}`, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (puzzle.id === 'x01') {
        const originalDownload = page.waitForEvent('download')
        await page.getByRole('link', { name: '下载原始文件 pier-04.png' }).click()
        const originalPath = await (await originalDownload).path()
        expect([...readFileSync(originalPath!).subarray(0, 4)]).toEqual([0, 0, 0, 0])
        await page.getByRole('button', { name: '检查文件开头' }).click()
        await page.getByLabel('用新的 8 个字节替换文件开头').fill('89 50')
        await page.getByRole('button', { name: '应用修复' }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '需要完整的 8 个字节' }),
        ).toBeVisible()
        await page.getByLabel('用新的 8 个字节替换文件开头').fill('89 50 4E 47 0D 0A 1A 0A')
        await page.getByRole('button', { name: '应用修复' }).click()
        await page.getByRole('button', { name: '文件概览', exact: true }).click()
        await expect(page.locator('.forensic-preview img')).toBeVisible()
        expect(
          await page
            .locator('.forensic-preview img')
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        ).toBe(480)
        const restoredDownload = page.waitForEvent('download')
        await page.getByRole('link', { name: '下载已修复的照片' }).click()
        const restoredPath = await (await restoredDownload).path()
        expect([...readFileSync(restoredPath!).subarray(0, 8)]).toEqual([
          137, 80, 78, 71, 13, 10, 26, 10,
        ])
      }
      if (puzzle.id === 'x02') {
        await page.getByRole('button', { name: '数据块', exact: true }).click()
        await page.locator('.chunk-list button').filter({ hasText: 'tEXt' }).nth(2).click()
        await expect(page.locator('.chunk-detail')).toContainText('QkxVRSAw')
        await page.getByRole('button', { name: '尝试 Base64 解码' }).click()
        await expect(page.locator('.chunk-decoded')).toHaveText('BLUE 0')
      }
      if (puzzle.id === 'x03') {
        await page.getByRole('button', { name: '像素通道', exact: true }).click()
        await page.getByLabel('颜色通道').selectOption('2')
        await page.getByLabel('位编号').selectOption('0')
        await page.getByRole('button', { name: '提取所选位平面' }).click()
        await expect(page.locator('.pixel-result output')).toHaveText('FERRY AT SIX')
      }
      if (puzzle.id === 'x11') {
        for (const [index, value] of puzzle.artifact.config.solution.entries())
          if (value) await page.locator('.nonogram-table td > button').nth(index).click()
        await expect(page.getByRole('status').filter({ hasText: '总有人记得' })).toBeVisible()
      }
      if (puzzle.id === 'x12') {
        await page.getByRole('textbox', { name: '终端命令' }).fill('cat index.html')
        await page.getByRole('textbox', { name: '终端命令' }).press('Enter')
        await expect(page.locator('.terminal-entry').last()).toContainText('SEE YOU TOMORROW')
      }
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。' })).toBeVisible()
      const next = cases[cases.indexOf(puzzle) + 1]
      if (next)
        await page.getByRole('link', { name: `继续调查：${next.title}`, exact: true }).click()
    })
  }
  await page.goto('/#/archives?chapter=side')
  await expect(page.locator('.archive-case-grid .status-solved')).toHaveCount(cases.length)
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: '接收第一条线索', exact: true })).toHaveAttribute(
    'href',
    '#/case/a01',
  )
  await expect(page.locator('.home-case-grid .puzzle-card')).toHaveCount(3)
  await page.reload()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('echo-archive:v1')!))
  expect(Object.keys(saved.solved)).toHaveLength(cases.length)
  expect(saved.ending).toBeNull()
  expect(errors).toEqual([])
})

test('the forensic bench fits a phone and remains keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/case/x01')
  await page.getByRole('button', { name: '检查文件开头' }).click()
  await page.getByLabel('用新的 8 个字节替换文件开头').fill('89 50 4E 47 0D 0A 1A 0A')
  await page.getByLabel('用新的 8 个字节替换文件开头').press('Enter')
  await page.getByRole('button', { name: '文件概览', exact: true }).click()
  await expect(page.locator('.forensic-preview img')).toBeVisible()
  for (const name of ['十六进制', '数据块', '像素通道']) {
    await page.getByRole('button', { name, exact: true }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
})
