import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateRawSync } from 'node:zlib'

const directory = new URL('../public/assets/evidence/', import.meta.url)
await mkdir(directory, { recursive: true })
const table = Array.from({ length: 256 }, (_, n) => {
  let value = n
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  return value >>> 0
})
const crcByte = (crc, byte) => ((crc >>> 8) ^ table[(crc ^ byte) & 255]) >>> 0
function checksum(data) {
  let crc = 0xffffffff
  for (const byte of data) crc = crcByte(crc, byte)
  return (crc ^ 0xffffffff) >>> 0
}
function encrypt(data, password) {
  let a = 0x12345678,
    b = 0x23456789,
    c = 0x34567890
  function update(byte) {
    a = crcByte(a, byte)
    b = (Math.imul((b + (a & 255)) >>> 0, 134775813) + 1) >>> 0
    c = crcByte(c, b >>> 24)
  }
  for (const byte of Buffer.from(password, 'utf8')) update(byte)
  return Buffer.from(
    [...data].map((byte) => {
      const temp = (c & 0xffff) | 2
      const encoded = byte ^ ((Math.imul(temp, temp ^ 1) >>> 8) & 255)
      update(byte)
      return encoded
    }),
  )
}
function zip(entries, archiveComment) {
  const localParts = [],
    centralParts = []
  let position = 0
  const time = (23 << 11) | (17 << 5)
  const date = ((1999 - 1980) << 9) | (11 << 5) | 17
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const content = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? '', 'utf8')
    const method = entry.store || entry.name.endsWith('/') ? 0 : 8
    const crc = checksum(content)
    let payload = method === 8 ? deflateRawSync(content, { level: 9 }) : content
    const encrypted = typeof entry.password === 'string'
    const flags = 0x800 | (encrypted || entry.falseFlag ? 1 : 0) | (entry.descriptor ? 8 : 0)
    if (encrypted) {
      const header = Buffer.alloc(12)
      createHash('sha256')
        .update(name)
        .update(content)
        .update(entry.password)
        .digest()
        .copy(header, 0, 0, 11)
      header[11] = entry.descriptor ? time >>> 8 : crc >>> 24
      payload = encrypt(Buffer.concat([header, payload]), entry.password)
    }
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(flags, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    if (!entry.descriptor) {
      local.writeUInt32LE(crc, 14)
      local.writeUInt32LE(payload.length, 18)
      local.writeUInt32LE(content.length, 22)
    }
    local.writeUInt16LE(name.length, 26)
    const descriptor = entry.descriptor ? Buffer.alloc(16) : Buffer.alloc(0)
    if (entry.descriptor) {
      descriptor.writeUInt32LE(0x08074b50, 0)
      descriptor.writeUInt32LE(crc, 4)
      descriptor.writeUInt32LE(payload.length, 8)
      descriptor.writeUInt32LE(content.length, 12)
    }
    localParts.push(local, name, payload, descriptor)
    const comment = Buffer.from(entry.comment ?? '', 'utf8')
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(flags, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(payload.length, 20)
    central.writeUInt32LE(content.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(comment.length, 32)
    central.writeUInt32LE(entry.name.endsWith('/') ? 0x10 : 0, 38)
    central.writeUInt32LE(position, 42)
    centralParts.push(central, name, comment)
    position += local.length + name.length + payload.length + descriptor.length
  }
  const directoryBytes = Buffer.concat(centralParts)
  const comment = Buffer.from(archiveComment, 'utf8')
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directoryBytes.length, 12)
  end.writeUInt32LE(position, 16)
  end.writeUInt16LE(comment.length, 20)
  return Buffer.concat([...localParts, directoryBytes, end, comment])
}
const approved =
  '明日版校样\n本刊更正：停电的缘由仍在核对。\n在查证之前，不能把责任归给某位居民。\n这句话从此留在第四版。\n'
const fingerprint = createHash('sha256').update(approved).digest('hex')
const nested = zip(
  [
    {
      name: 'readme.txt',
      content: '版样有两版。WITHDRAWN 表示已撤回，只有 APPROVED 的投递位置仍有效。\n',
    },
    {
      name: 'plate-withdrawn.txt',
      content: 'STATUS=WITHDRAWN\nDELIVERY=EAST WINDOW\n这份版样已经撤回，请保留记录，不要付印。\n',
    },
    {
      name: 'plate-current.txt',
      content: 'STATUS=APPROVED\nDELIVERY=WEST WINDOW\n明日版请在西侧窗口交接。\n',
      comment: '保留撤回版本，避免把旧指令误认为新的承诺。',
    },
  ],
  'THE NEXT EDITION / 两份记录，一次更正。',
)
const files = {
  'editor-envelope.zip': zip(
    [
      {
        name: '00-readme.txt',
        content:
          '给夜班校对员：校样口令不在任何一页正文里。请查看压缩包自己的批注，把最后一行十六进制还原成小写英文。\n',
      },
      { name: 'composing-room.txt', content: '铅字已收齐，今晚不再删掉任何人的更正申请。\n' },
      { name: 'type/', content: '', store: true },
      { name: 'type/inventory.txt', content: '纸张：充足\n墨色：深绿\n编辑台：等待校样\n' },
    ],
    '给夜班校对员：别只看纸面。\nPASSWORD_HEX=70 72 6F 6F 66',
  ),
  'locked-proof.zip': zip(
    [
      {
        name: 'proof.txt',
        password: 'proof',
        descriptor: true,
        content:
          'WUGANG PRESS / PROOF COPY\nDESK=LINE SEVEN\n第七排的排字架上，放着一份需要公开刊出的更正。\n校样通过后，也请保留原稿供复核。\n',
      },
    ],
    '提取密码是上一封编辑信封中的小写口令。这个条目的内容确实经过传统 ZIP 加密。',
  ),
  'flagged-proof.zip': zip(
    [
      {
        name: 'correction.txt',
        store: true,
        falseFlag: true,
        content:
          'CORRECTION=PAGE 4\n这份更正应该刊在第四版。\n文件头上贴错了加密标记，实际文字没有经过加密。\n更正需要说明原因，不能只把旧版悄悄换走。\n',
      },
    ],
    '包装上的标记，未必能代替内容本身。请比对载荷、长度与 CRC。',
  ),
  'old-press.dat': Buffer.concat([
    Buffer.from('WUGANG PRESS / WORKING ENVELOPE\nFORMAT LABELS MAY BE WRONG\n\n'),
    zip(
      [
        {
          name: 'manifest.txt',
          content:
            '最外层只是工作信封。版样放在 envelope/layout.bin 里，它的扩展名曾被临时改过。请按实际内容继续打开。\n',
        },
        { name: 'envelope/', store: true },
        {
          name: 'envelope/layout.bin',
          content: nested,
          store: true,
          comment: '按内部文件签名识别，不要仅凭后缀。',
        },
      ],
      '雾港印刷所 / 旧工作封套',
    ),
  ]),
  'approved-edition.zip': zip(
    [
      {
        name: 'fingerprint.txt',
        content: `编辑留下的获批校样指纹：\nSHA256=${fingerprint}\n请对完整文件字节计算，不要复制到编辑器后重新排版。\n`,
      },
      { name: '版面-甲.txt', content: approved.replace('某位', '某\u2060位') },
      { name: '版面-乙.txt', content: approved },
    ],
    '两份文字看起来相同，一份多了不可见字符。请用留存指纹确认获批校样。CRC 只负责检查读取是否完整。',
  ),
  'morning-editorial.zip': zip(
    [
      {
        name: 'instruction.txt',
        content:
          '最终口令的五段依次来自前五份记录：\n1. 编辑信封口令，小写；\n2. 排字架英文名，去空格并转小写；\n3. 更正应刊版数，只留数字；\n4. 当前版样交接窗口，取第一个英文单词并转小写；\n5. 获批校样的中文标记（甲或乙）。\n用一个半角连字符 - 连接各段，不加其他空白。\n',
      },
      {
        name: 'editorial.txt',
        password: 'proof-lineseven-4-west-乙',
        content:
          '雾港明日版 / 编者按\n\n允许更正，拒绝抹去。\n\n本刊撤回此前未经核实的归责，并在第四版刊出更正。旧版留作审阅，不再当作事实传播。\n一份报纸可以承认自己错了，而不要求被误解的人再次证明自己值得被听见。\n\n八字编辑原则：允许更正拒绝抹去\n',
      },
    ],
    '把五份证据放在一起，再读最后一页。',
  ),
}
for (const [name, bytes] of Object.entries(files)) await writeFile(new URL(name, directory), bytes)
console.log(
  `Press evidence generated: ${Object.keys(files).length} ZIP containers, including an encrypted proof and a nested envelope.`,
)
