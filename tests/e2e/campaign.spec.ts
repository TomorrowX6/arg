import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'

const campaign = readdirSync('content')
  .filter((file) => /^puzzles.*\.json$/.test(file))
  .sort()
  .flatMap((file) => JSON.parse(readFileSync(`content/${file}`, 'utf8')))
  .filter((p) => !p.optional)

test('complete the campaign through real controls and keep the save after reloading', async ({
  page,
}) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/a01')
  for (const puzzle of campaign) {
    await test.step(`${puzzle.id}: ${puzzle.title}`, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      if (puzzle.id === 'a01') {
        await page.getByLabel('信里藏着哪四个字？').fill('错误线索')
        await page.getByRole('button', { name: '验证线索', exact: true }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '这条线索还没有对上' }),
        ).toBeVisible()
        await page.getByRole('button', { name: '展开第一条提示', exact: true }).click()
      }
      if (puzzle.id === 'a02') {
        const slider = page.getByRole('slider', { name: 'FM 频率' })
        await slider.focus()
        await slider.press('End')
        for (let i = 0; i < 43; i++) await slider.press('ArrowLeft')
        await expect(page.getByRole('status').filter({ hasText: '到「北岸」来' })).toBeVisible()
      }
      if (puzzle.id === 'a03') {
        await page.getByRole('button', { name: '展开译码卡' }).click()
        await expect(page.locator('.morse-table')).toBeVisible()
        await page.getByRole('button', { name: '播放电码' }).click()
        await page.getByRole('button', { name: '停止播放' }).click()
      }
      if (puzzle.id === 'a04') {
        await page.getByRole('button', { name: '打开字母移位器' }).click()
        const slider = page.getByRole('slider', { name: '字母位移' })
        for (let i = 0; i < 3; i++) await slider.press('ArrowLeft')
        await expect(page.locator('.decoded-output')).toHaveText('NORTH PIER')
      }
      if (puzzle.id === 'a05') {
        const terminal = page.getByRole('textbox', { name: '终端命令' })
        await terminal.fill('ls -a')
        await terminal.press('Enter')
        await terminal.fill('cat .operator')
        await terminal.press('Enter')
        await expect(page.locator('.terminal-entry').last()).toContainText('OPERATOR: LARK')
      }
      if (puzzle.id === 'b01') {
        for (const name of ['档案馆', '钟楼', '灯塔', '北码头'])
          await page.getByRole('button', { name, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '校验词：归航' })).toBeVisible()
      }
      if (puzzle.id === 'b04') {
        for (const index of [0, 2, 6, 8, 4])
          await page.locator('.lights-grid>button').nth(index).click()
        await expect(page.getByRole('status').filter({ hasText: '门禁口令：余温' })).toBeVisible()
      }
      if (puzzle.id === 'c02') {
        for (const name of [
          '将建立备份向前移动',
          '将建立备份向前移动',
          '将生成通行证向前移动',
          '将城市转移向前移动',
        ])
          await page.getByRole('button', { name, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '关键标记：见证' })).toBeVisible()
      }
      if (puzzle.id === 'c06') {
        await page.getByRole('button', { name: '打开维吉尼亚解码器' }).click()
        await page.getByRole('textbox', { name: '字母密钥' }).fill('LARK')
        await page.getByRole('button', { name: '还原这段编码' }).click()
        await expect(page.locator('.decoded-output')).toHaveText('CONSENT')
      }
      if (puzzle.id === 'd01') {
        for (const [index, times] of [
          [2, 9],
          [3, 1],
          [4, 7],
        ])
          for (let i = 0; i < times; i++)
            await page.getByRole('button', { name: `第 ${index} 位增加`, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '到站凭证：下潜' })).toBeVisible()
      }
      if (puzzle.id === 'd02') {
        await page.getByRole('button', { name: '重放记忆', exact: true }).click()
        await expect(page.getByRole('button', { name: '重放记忆', exact: true })).toBeEnabled()
        for (const symbol of ['海', '雨', '鸟', '灯', '海'])
          await page.getByRole('button', { name: `符号 ${symbol}`, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '同步识别词：同频' })).toBeVisible()
      }
      if (puzzle.id === 'd03') {
        for (let i = 0; i < puzzle.artifact.config.solution.length; i++)
          if (puzzle.artifact.config.solution[i])
            await page.locator('.nonogram-table td>button').nth(i).click()
        await expect(page.getByRole('status').filter({ hasText: '图像签名：守望' })).toBeVisible()
      }
      if (puzzle.id === 'd04') {
        await page.getByRole('button', { name: '打开逐字节异或工具' }).click()
        await page.getByRole('textbox', { name: '十六进制密钥' }).fill('17')
        await page.getByRole('button', { name: '还原这段编码' }).click()
        await expect(page.locator('.decoded-output')).toHaveText('BIRD')
      }
      if (puzzle.id === 'd05') {
        await page.getByRole('button', { name: '开启显影灯' }).click()
        await expect(page.locator('.uv-ink')).toContainText('KEEP THE ORIGINAL')
      }
      if (puzzle.id === 'e04') {
        for (const [index, times] of [
          [2, 2],
          [3, 3],
          [4, 1],
        ])
          for (let i = 0; i < times; i++)
            await page.getByRole('button', { name: `第 ${index} 位增加`, exact: true }).click()
        await expect(
          page.getByRole('status').filter({ hasText: '柜内封存的词：明日' }),
        ).toBeVisible()
      }
      if (puzzle.id === 'e06') {
        for (const tile of [7, 8, 3, 5, 6, 7, 4, 1, 2, 3, 5, 6, 8, 5, 6])
          await page.getByRole('button', { name: `画片 ${tile}`, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '天会亮' })).toBeVisible()
      }
      if (puzzle.id === 'f04') {
        for (const name of ['档案馆', '意愿核验', '中继站', '原稿库', '发射塔'])
          await page.getByRole('button', { name, exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: '接收确认词：听见' })).toBeVisible()
      }
      if (puzzle.id === 'f05') {
        for (const [tile, times] of [
          [1, 1],
          [5, 2],
          [6, 2],
          [7, 1],
          [8, 3],
          [9, 1],
          [10, 1],
          [11, 2],
          [16, 3],
        ])
          for (let i = 0; i < times; i++)
            await page.getByRole('button', { name: new RegExp(`^线路 ${tile}，`) }).click()
        await expect(page.getByRole('status').filter({ hasText: '执行令牌：放行' })).toBeVisible()
      }
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()
      const next = campaign[campaign.indexOf(puzzle) + 1]
      if (next)
        await page.getByRole('link', { name: `继续调查：${next.title}`, exact: true }).click()
    })
  }
  await page.reload()
  await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeVisible()
  const count = await page.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('echo-archive:v1')!).solved).length,
  )
  expect(count).toBe(campaign.length)
  await page.getByRole('link', { name: '查看你的结局', exact: true }).click()
  for (const [index, title] of ['把门打开', '留一盏灯', '听完最后一句'].entries()) {
    await page.getByRole('button', { name: '选择这条路', exact: true }).nth(index).click()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    if (index < 2) await page.getByRole('button', { name: '看看另一条路', exact: true }).click()
  }
  await page.reload()
  await expect(page.getByRole('heading', { name: '听完最后一句', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('locked cases explain their prerequisite instead of exposing the artifact', async ({
  page,
}) => {
  await page.goto('/#/case/a02')
  await expect(page.getByRole('heading', { name: '午夜调频', exact: true })).toBeVisible()
  await expect(page.getByText('这份档案仍在封存中。', { exact: false })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'FM 频率' })).toHaveCount(0)
  await page.getByRole('link', { name: '前往当前调查' }).click()
  await expect(page.locator('#case-answer')).toBeVisible()
})
