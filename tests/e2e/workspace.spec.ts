import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('notes and settings survive export, reset, import and reload', async ({ page }) => {
  await page.goto('/#/notes')
  await page.getByRole('button', { name: '新建手记', exact: true }).click()
  await page.getByLabel('手记标题').fill('雾港的第一个猜想')
  await page.getByLabel('手记正文').fill('也许他们还记得。\n23:17 是关键。')
  await page.goto('/#/settings')
  await page.getByRole('checkbox', { name: /减少动态效果/ }).check()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出存档', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  await page.getByRole('button', { name: '重置存档', exact: true }).click()
  await page.getByRole('button', { name: '确认重新开始', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /减少动态效果/ })).not.toBeChecked()
  await page.getByLabel('选择存档文件').setInputFiles(path!)
  await page.getByRole('button', { name: '确认导入', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /减少动态效果/ })).toBeChecked()
  await page.goto('/#/notes')
  await expect(page.getByLabel('手记标题')).toHaveValue('雾港的第一个猜想')
  await expect(page.getByLabel('手记正文')).toHaveValue('也许他们还记得。\n23:17 是关键。')
  await page.reload()
  await expect(page.getByLabel('手记正文')).toHaveValue('也许他们还记得。\n23:17 是关键。')
})

test('search closes after selecting a file and skip navigation keeps the route intact', async ({
  page,
}) => {
  await page.goto('/')
  const url = page.url()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  expect(page.url()).toBe(url)
  await page.keyboard.press('Control+k')
  await page.getByRole('textbox', { name: '搜索档案', exact: true }).fill('一封未寄出的信')
  await page.locator('.search-results>a').first().click()
  await expect(page.getByRole('dialog', { name: '搜索档案' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '一封未寄出的信', exact: true })).toBeVisible()
})

test('a corrupt existing save is preserved until an explicit reset', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('echo-archive:v1', '{"version":999,"notes":"keep me"}')
      sessionStorage.setItem('seeded', 'yes')
    }
  })
  await page.goto('/#/settings')
  await expect(page.getByRole('alert')).toContainText('自动保存已暂停')
  expect(await page.evaluate(() => localStorage.getItem('echo-archive:v1'))).toBe(
    '{"version":999,"notes":"keep me"}',
  )
  await expect(page.getByRole('button', { name: '下载旧存档原始备份' })).toBeVisible()
  await page.getByRole('button', { name: '重置存档', exact: true }).click()
  await page.getByRole('button', { name: '确认重新开始', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('echo-archive:v1')!).version),
  ).toBe(1)
})

test.describe('mobile workspace', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('navigation manages focus and all main screens fit a phone', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.sidebar')).toHaveAttribute('inert', '')
    await page.getByRole('button', { name: '打开导航', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '主导航' })).toBeVisible()
    await expect(page.getByRole('button', { name: '关闭导航', exact: true })).toBeFocused()
    await page.getByRole('link', { name: /档案目录/ }).click()
    await expect(page.locator('.sidebar')).toHaveAttribute('inert', '')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('每份档案')
    for (const route of ['/', '/archives', '/case/a01', '/notes', '/map', '/settings', '/field']) {
      await page.goto(`/#${route}`)
      await page.locator('main h1').waitFor()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        route,
      ).toBe(true)
    }
  })
  test('the opening case meets the checked WCAG A and AA rules', async ({ page }) => {
    await page.goto('/#/case/a01')
    await page.locator('#case-answer').waitFor()
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
  })
})
