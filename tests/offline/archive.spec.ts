import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('prepare a complete archive under a subdirectory and investigate without a network', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { name: '把档案馆带在身边', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((items) => items.length),
    ),
  ).toBe(0)
  await page.getByRole('button', { name: '准备离线档案', exact: true }).click()
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible({ timeout: 45000 })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const cached = await page.evaluate(async () => {
    const names = await caches.keys()
    const cache = await caches.open(names.find((name) => name.startsWith('echo-archive-offline:'))!)
    return (await cache.keys()).map((request) => new URL(request.url).pathname)
  })
  expect(cached).toContain('/arg/assets/evidence/station-stereo.wav')
  expect(cached).toContain('/arg/assets/evidence/post-office-dns.pcap')
  expect(cached).toContain('/arg/index.html')
  expect(cached.filter((path) => path.endsWith('.woff2')).length).toBeGreaterThan(0)

  await context.setOffline(true)
  await expect(page.getByText('当前离线', { exact: false }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible()
  await page.goto('./#/case/x27')
  await expect(page.locator('.packet-row')).toHaveCount(12)
  await page.getByRole('button', { name: 'DNS 拼接', exact: true }).click()
  await page.getByLabel('片段域名后缀').fill('drop.wugang.invalid')
  await page.getByRole('button', { name: '拼接编号片段', exact: true }).click()
  await expect(page.getByLabel('拼接后的十六进制')).toHaveValue('42 4F 58 20 30 31 37')
  await page.getByRole('link', { name: '带入十六进制解码器', exact: true }).click()
  await page.getByRole('button', { name: '执行解码', exact: true }).click()
  await expect(page.getByLabel('处理结果')).toHaveValue('BOX 017')
  await page.locator('.tool-source-link').click()
  await page.locator('#case-answer').fill('BOX 017')
  await page.getByRole('button', { name: '验证线索', exact: true }).click()
  await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()

  // None of these screens or files were visited before disconnecting.
  await page.goto('./#/map')
  await expect(page.locator('main h1')).toBeVisible()
  await page.goto('./#/field')
  await expect(page.locator('main h1')).toBeVisible()
  const wave = await page.evaluate(async () => {
    const response = await fetch('./assets/evidence/station-stereo.wav')
    const bytes = new Uint8Array(await response.arrayBuffer())
    return {
      status: response.status,
      header: String.fromCharCode(...bytes.slice(0, 4)),
      length: bytes.length,
    }
  })
  expect(wave.status).toBe(200)
  expect(wave.header).toBe('RIFF')
  expect(wave.length).toBeGreaterThan(100000)
  await page.goto('./#/notes')
  await page.getByRole('button', { name: '新建手记', exact: true }).click()
  await page.getByLabel('手记标题').fill('写在断网的夜里')
  await page.getByLabel('手记正文').fill('邮局仍然在这里。')

  await context.setOffline(false)
  await page.goto('./#/settings')
  await page.setViewportSize({ width: 360, height: 800 })
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() =>
    caches
      .open('another-app-cache')
      .then((cache) => cache.put('/another-app/saved', new Response('keep this'))),
  )
  await page.getByRole('button', { name: '移除离线档案包', exact: true }).click()
  await expect(page.getByText('离线档案包已移除。调查进度、笔记和收藏仍然保留。')).toBeVisible()
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('echo-archive:v1')!))
  expect(save.solved.x27).toBeTruthy()
  expect(save.notes[0].title).toBe('写在断网的夜里')
  expect(await page.evaluate(() => caches.keys())).toEqual(['another-app-cache'])
  expect(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((items) => items.length),
    ),
  ).toBe(0)
  expect(errors).toEqual([])
})
