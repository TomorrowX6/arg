import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const directory = resolve('dist')
let build = 1
let failWave = false
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
}
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (!pathname.startsWith('/arg/')) {
    response.writeHead(404).end()
    return
  }
  const filename = pathname === '/arg/' ? 'index.html' : pathname.slice(5)
  const path = resolve(directory, filename)
  if (!path.startsWith(directory + sep)) {
    response.writeHead(404).end()
    return
  }
  if (failWave && filename === 'assets/evidence/station-stereo.wav') {
    response.writeHead(503).end('A fixture deliberately interrupted this download.')
    return
  }
  try {
    let content: Buffer | string = await readFile(path)
    if (filename === 'sw.js')
      content = content
        .toString()
        .replace(
          /const VERSION = (["'])([^"']+)\1/,
          (_match, _quote, original) =>
            `const VERSION = ${JSON.stringify(`${original}:fixture-${build}`)}`,
        )
    if (filename === 'index.html')
      content = content.toString().replace('<body>', `<body data-test-build="${build}">`)
    response.setHeader('Content-Type', types[extname(filename)] ?? 'application/octet-stream')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Vary', 'Origin')
    if (request.headers.origin)
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
    response.writeHead(200).end(content)
  } catch {
    response.writeHead(404).end()
  }
})
let origin = ''
test.beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/arg/`
})
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

test('an update waits for a click, keeps another tab intact and survives a later incomplete download', async ({
  page,
  context,
}) => {
  build = 1
  failWave = false
  await page.goto(`${origin}#/settings`)
  await page.getByRole('button', { name: '准备离线档案', exact: true }).click()
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible({ timeout: 45000 })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const other = await context.newPage()
  await other.goto(`${origin}#/case/a01`)
  await other.locator('#case-answer').fill('尚未提交的猜想')
  await expect(other.locator('body')).toHaveAttribute('data-test-build', '1')

  build = 2
  await page.getByRole('button', { name: '检查档案更新', exact: true }).click()
  await expect(page.getByRole('button', { name: '载入新档案并刷新', exact: true })).toBeVisible({
    timeout: 45000,
  })
  await expect(page.locator('body')).toHaveAttribute('data-test-build', '1')
  await page.getByRole('button', { name: '载入新档案并刷新', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-test-build', '2')
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible()
  await expect(other.locator('body')).toHaveAttribute('data-test-build', '1')
  await expect(other.locator('#case-answer')).toHaveValue('尚未提交的猜想')
  expect(await page.evaluate(() => caches.keys().then((keys) => keys.length))).toBe(2)

  build = 3
  failWave = true
  await page.getByRole('button', { name: '检查档案更新', exact: true }).click()
  await expect(
    page.getByText('离线档案没有下载完整，请联网后重试。已有调查存档不受影响。', { exact: true }),
  ).toBeVisible({ timeout: 45000 })
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '载入新档案并刷新', exact: true })).toHaveCount(0)
  const keys = await page.evaluate(() => caches.keys())
  expect(keys).toHaveLength(2)
  expect(keys.some((key) => key.endsWith('fixture-3'))).toBe(false)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-test-build', '2')
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible()
  await other.getByRole('link', { name: '雾港地图', exact: true }).click()
  await expect(other.locator('main h1')).toBeVisible()
})

test('an incomplete first download can be retried without leaving a partial offline archive', async ({
  page,
}) => {
  build = 4
  failWave = true
  await page.goto(`${origin}#/settings`)
  await page.getByRole('button', { name: '准备离线档案', exact: true }).click()
  await expect(
    page.getByText('离线档案没有下载完整，请联网后重试。已有调查存档不受影响。', { exact: true }),
  ).toBeVisible({ timeout: 45000 })
  expect(await page.evaluate(() => caches.keys())).toEqual([])
  await expect(page.getByRole('button', { name: '准备离线档案', exact: true })).toBeEnabled()
  failWave = false
  await page.getByRole('button', { name: '准备离线档案', exact: true }).click()
  await expect(page.getByText('离线档案已就绪', { exact: true })).toBeVisible({ timeout: 45000 })
})
