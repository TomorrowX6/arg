import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { parsePcap } from '../../src/game/packets'

const cases = JSON.parse(readFileSync('content/puzzles-14-postoffice.json', 'utf8'))
const serverFlow = '198.51.100.17:80 → 192.0.2.14:43017'
const bitmap = [
  '01110011110011111010001',
  '10001010001010000011001',
  '10001010001010000011001',
  '10001011110011110010101',
  '10001010000010000010011',
  '10001010000010000010011',
  '01110010000011111010001',
]
  .map((line) => [...line].map((bit) => (bit === '1' ? '█' : '·')).join(''))
  .join('\n')

test('investigate six postal cases using real DNS, TCP, Unicode, stereo and gzip evidence', async ({
  page,
}) => {
  test.setTimeout(150000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x27')
  for (const puzzle of cases) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (puzzle.id === 'x27') {
        await expect(page.locator('.packet-row')).toHaveCount(12)
        await page.getByLabel('筛选记录', { exact: true }).fill('drop.wugang.invalid')
        await expect(page.locator('.packet-row')).toHaveCount(8)
        await page.locator('.packet-row').first().click()
        await expect(page.locator('.packet-dns-fields')).toContainText(
          '03.303137.drop.wugang.invalid',
        )
        const downloaded = page.waitForEvent('download')
        await page
          .getByRole('link', { name: '下载原始文件 post-office-dns.pcap', exact: true })
          .click()
        const file = await downloaded
        expect(parsePcap(readFileSync((await file.path())!)).packets).toHaveLength(12)
        await page.getByRole('button', { name: 'DNS 拼接', exact: true }).click()
        await page.getByLabel('片段域名后缀').fill('wrong.invalid')
        await page.getByRole('button', { name: '拼接编号片段', exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '没有找到这个后缀' })).toBeVisible()
        await page.getByLabel('片段域名后缀').fill('drop.wugang.invalid')
        await page.getByRole('button', { name: '拼接编号片段', exact: true }).click()
        await expect(page.getByLabel('拼接后的十六进制')).toHaveValue('42 4F 58 20 30 31 37')
        await page.getByRole('link', { name: '带入十六进制解码器', exact: true }).click()
        await page.getByRole('button', { name: '执行解码', exact: true }).click()
        await expect(page.getByLabel('处理结果')).toHaveValue('BOX 017')
        await page.locator('.tool-source-link').click()
      }
      if (puzzle.id === 'x28' || puzzle.id === 'x31') {
        await page.getByRole('button', { name: 'TCP 追踪', exact: true }).click()
        await page.getByLabel('要追踪的数据流').selectOption(serverFlow)
        await page.getByRole('button', { name: '按序列号重组', exact: true }).click()
        await expect(page.locator('.packet-stream-stats')).toContainText('1 个相同重传')
        await expect(page.getByLabel('重组后的原文')).toHaveValue(/HTTP\/1.1 200 OK/)
        await page
          .getByRole('button', {
            name: puzzle.id === 'x28' ? '读取 HTTP 正文' : '解压 GZIP 正文',
            exact: true,
          })
          .click()
        await expect(page.getByRole('textbox', { name: 'HTTP 正文', exact: true })).toHaveValue(
          new RegExp(puzzle.answers[0]),
        )
      }
      if (puzzle.id === 'x29') {
        await page.getByRole('button', { name: '逐字符检查', exact: true }).click()
        await expect(page.getByRole('list', { name: '特殊字符清单' })).toContainText('U+200B')
        await page.getByRole('button', { name: '显示隐藏字符', exact: true }).click()
        await expect(page.locator('.unicode-letter mark')).toHaveCount(96)
        await page.getByLabel('代表 1 的字符').selectOption(String(0x200b))
        await page.getByRole('button', { name: '提取隐藏字节', exact: true }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '需要对应两种不同字符' }),
        ).toBeVisible()
        await page.getByLabel('代表 1 的字符').selectOption(String(0x200c))
        await page.getByRole('button', { name: '提取隐藏字节', exact: true }).click()
        await expect(page.getByLabel('隐藏文字', { exact: true })).toHaveValue('WINDOW SEVEN')
      }
      if (puzzle.id === 'x30') {
        await page.getByText('把频带读成像素', { exact: true }).click()
        await page.getByRole('button', { name: '读取频带像素', exact: true }).click()
        await expect(page.getByLabel('频带像素图')).not.toHaveText(bitmap)
        await page.getByRole('button', { name: '差分 L − R', exact: true }).click()
        await expect(page.locator('.wave-pixel-result')).toHaveCount(0)
        await page.getByLabel('声谱显示范围').selectOption('band')
        await page.getByRole('button', { name: '读取频带像素', exact: true }).click()
        await expect(page.getByLabel('频带像素图')).toHaveText(bitmap)
        await page.getByRole('button', { name: '播放所选声道', exact: true }).click()
        await page.getByRole('button', { name: '停止播放', exact: true }).click()
        await page.getByText('查看 WAV 文件备注', { exact: true }).click()
        await expect(page.locator('.wave-metadata')).toContainText('160 ms per column')
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

test('postal evidence remains readable and operable on narrow screens', async ({ page }) => {
  test.setTimeout(120000)
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
  for (const id of ['x27', 'x28', 'x29', 'x30', 'x31', 'x32']) {
    await page.goto(`/#/case/${id}`)
    await expect(
      page.getByRole('heading', {
        name: cases.find((puzzle: { id: string }) => puzzle.id === id).title,
        exact: true,
      }),
    ).toBeVisible()
    if (id === 'x27') {
      await expect(page.locator('.packet-row')).toHaveCount(12)
      await page.getByRole('button', { name: 'DNS 拼接', exact: true }).click()
      await page.getByLabel('片段域名后缀').fill('drop.wugang.invalid')
      await page.getByRole('button', { name: '拼接编号片段', exact: true }).click()
    }
    if (id === 'x28' || id === 'x31') {
      await page.getByRole('button', { name: 'TCP 追踪', exact: true }).click()
      await page.getByLabel('要追踪的数据流').selectOption(serverFlow)
      await page.getByRole('button', { name: '按序列号重组', exact: true }).click()
      await page
        .getByRole('button', {
          name: id === 'x28' ? '读取 HTTP 正文' : '解压 GZIP 正文',
          exact: true,
        })
        .click()
      await expect(page.getByRole('textbox', { name: 'HTTP 正文', exact: true })).not.toHaveValue(
        '',
      )
    }
    if (id === 'x29') {
      await page.getByRole('button', { name: '逐字符检查', exact: true }).click()
      await page.getByRole('button', { name: '显示隐藏字符', exact: true }).click()
      await page.getByRole('button', { name: '提取隐藏字节', exact: true }).click()
    }
    if (id === 'x30') {
      await page.getByRole('button', { name: '差分 L − R', exact: true }).click()
      await page.getByLabel('声谱显示范围').selectOption('band')
      await page.getByText('把频带读成像素', { exact: true }).click()
      await page.getByRole('button', { name: '读取频带像素', exact: true }).click()
    }
    expect
      .soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id)
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
        id,
      )
      .toEqual([])
  }
})
