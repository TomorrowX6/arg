import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { extractZipEntry, parseZip } from '../../src/game/zip'

const cases = JSON.parse(readFileSync('content/puzzles-16-press.json', 'utf8'))

test('trace the six press clues through real ZIP extraction, repairs and nested archives', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/case/x41')
  for (const [index, puzzle] of cases.entries()) {
    await test.step(puzzle.title, async () => {
      await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
      await expect(
        page.getByRole('link', { name: `下载原始文件 ${puzzle.artifact.config.filename}` }),
      ).toBeVisible()
      if (puzzle.id === 'x41') {
        await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/批注/)
        await page.getByText('查看压缩包批注', { exact: true }).click()
        await expect(page.locator('.zip-archive-comment')).toContainText(
          'PASSWORD_HEX=70 72 6F 6F 66',
        )
        await expect(page.getByRole('link', { name: '用十六进制读批注' })).toHaveAttribute(
          'href',
          /method=hex/,
        )
      }
      if (puzzle.id === 'x42') {
        await page.locator('#zip-password').fill('PROOF')
        await page.getByRole('button', { name: '解密并读取', exact: true }).click()
        await expect(page.locator('.zip-message')).toContainText('密码不正确')
        await page.locator('#zip-password').fill('proof')
        await page.locator('#zip-password').press('Enter')
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/DESK=LINE SEVEN/)
      }
      if (puzzle.id === 'x43') {
        await page.getByText('检查文件头与标记', { exact: true }).click()
        await expect(
          page.getByRole('region', { name: '条目原始载荷十六进制', exact: true }),
        ).toContainText('CORRECTION')
        await page.getByRole('button', { name: '按未加密读取此条目', exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/CORRECTION=PAGE 4/)
        const waiting = page.waitForEvent('download')
        await page.getByRole('button', { name: '下载解除错误标记的 ZIP', exact: true }).click()
        const download = await waiting
        expect(download.suggestedFilename()).toBe('flagged-proof-repaired.zip')
        const repaired = parseZip(new Uint8Array(readFileSync((await download.path())!)))
        expect(repaired.entries[0].encrypted).toBe(false)
        expect(
          new TextDecoder().decode(await extractZipEntry(repaired, repaired.entries[0])),
        ).toContain('PAGE 4')
      }
      if (puzzle.id === 'x44') {
        await expect(page.locator('.zip-prefix')).toContainText('60 字节')
        await page
          .getByRole('button', { name: '查看条目 envelope/layout.bin', exact: true })
          .click()
        await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
        await page.getByRole('button', { name: '继续打开内部压缩包', exact: true }).click()
        await expect(
          page.getByRole('navigation', { name: '压缩包层级', exact: true }),
        ).toContainText('第 2 层')
        await page
          .getByRole('button', { name: '查看条目 plate-withdrawn.txt', exact: true })
          .click()
        await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/STATUS=WITHDRAWN/)
        await page.getByRole('button', { name: '查看条目 plate-current.txt', exact: true }).click()
        await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/DELIVERY=WEST WINDOW/)
        await page.getByRole('button', { name: '返回上一层封套', exact: true }).click()
        await expect(
          page.getByRole('navigation', { name: '压缩包层级', exact: true }),
        ).toContainText('第 1 层')
      }
      if (puzzle.id === 'x45') {
        await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
        const fingerprint = (
          await page.getByRole('textbox', { name: '解出的文件正文', exact: true }).inputValue()
        ).match(/[a-f0-9]{64}/)![0]
        for (const edition of ['甲', '乙']) {
          await page
            .getByRole('button', { name: `查看条目 版面-${edition}.txt`, exact: true })
            .click()
          await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
          if (edition === '乙')
            await expect(
              page.getByRole('textbox', { name: '文件 SHA-256', exact: true }),
            ).toHaveValue(fingerprint)
          else
            await expect(
              page.getByRole('textbox', { name: '文件 SHA-256', exact: true }),
            ).not.toHaveValue(fingerprint)
        }
      }
      if (puzzle.id === 'x46') {
        await page.getByRole('button', { name: '查看条目 editorial.txt', exact: true }).click()
        await page.locator('#zip-password').fill('proof-lineseven-4-west-乙')
        await page.getByRole('button', { name: '解密并读取', exact: true }).click()
        await expect(
          page.getByRole('textbox', { name: '解出的文件正文', exact: true }),
        ).toHaveValue(/允许更正拒绝抹去/)
      }
      await page.locator('#case-answer').fill(puzzle.answers[0])
      await page.getByRole('button', { name: '验证线索', exact: true }).click()
      await expect(page.getByRole('heading', { name: '档案已复原。', exact: true })).toBeFocused()
      if (cases[index + 1])
        await page
          .getByRole('link', { name: `继续调查：${cases[index + 1].title}`, exact: true })
          .click()
    })
  }
  expect(errors).toEqual([])
})

test('ZIP directories, decrypted text and metadata fit a phone with accessible contrast', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.addInitScript(
    (ids) =>
      localStorage.setItem(
        'echo-archive:v1',
        JSON.stringify({
          version: 1,
          solved: Object.fromEntries(
            ids.map((id: string) => [id, { at: '2026-09-14T01:00:00Z', hints: 0, attempts: 1 }]),
          ),
        }),
      ),
    cases.map((puzzle: { id: string }) => puzzle.id),
  )
  for (const puzzle of cases) {
    await page.goto(`/#/case/${puzzle.id}`)
    await expect(page.getByRole('heading', { name: puzzle.title, exact: true })).toBeVisible()
    if (puzzle.id === 'x42' || puzzle.id === 'x46') {
      if (puzzle.id === 'x46')
        await page.getByRole('button', { name: '查看条目 editorial.txt', exact: true }).click()
      await page
        .locator('#zip-password')
        .fill(puzzle.id === 'x42' ? 'proof' : 'proof-lineseven-4-west-乙')
      await page.getByRole('button', { name: '解密并读取', exact: true }).click()
    } else if (puzzle.id === 'x43') {
      await page.getByText('检查文件头与标记', { exact: true }).click()
      await page.getByRole('button', { name: '按未加密读取此条目', exact: true }).click()
    } else await page.getByRole('button', { name: '读取并校验文件', exact: true }).click()
    await expect(page.getByRole('textbox', { name: '解出的文件正文', exact: true })).toBeVisible()
    if (puzzle.id === 'x41') await page.getByText('查看压缩包批注', { exact: true }).click()
    expect
      .soft(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        puzzle.id,
      )
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
        puzzle.id,
      )
      .toEqual([])
  }
})
