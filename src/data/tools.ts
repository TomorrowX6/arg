import type { ToolMethod } from '../game/codecs'

export interface ArchiveTool {
  id: ToolMethod
  group: string
  name: string
  caption: string
  description: string
  example: string
  plain: string
  key?: { label: string; value: string }
  auxiliary?: { label: string; value: string }
  single?: boolean
}
export const archiveTools: ArchiveTool[] = [
  {
    id: 'base64',
    group: '字符与编码',
    name: 'Base64',
    caption: 'TEXT ↔ BASE64',
    description:
      '把 UTF-8 文字与 Base64 编码互相转换。通常会看到大小写字母、数字、+、/ 和结尾的 =。',
    example: '5Zue5aOw',
    plain: '回声',
  },
  {
    id: 'hex',
    group: '字符与编码',
    name: '十六进制',
    caption: 'TEXT ↔ HEX BYTES',
    description: '两位十六进制数字构成一个字节。英文常以 41–5A 表示 A–Z；中文按 UTF-8 字节读取。',
    example: '45 43 48 4F',
    plain: 'ECHO',
  },
  {
    id: 'binary',
    group: '字符与编码',
    name: '二进制字节',
    caption: 'TEXT ↔ BINARY',
    description: '每八位组成一个字节，高位在左。字节之间可以有空格或换行。',
    example: '01000101 01000011 01001000 01001111',
    plain: 'ECHO',
  },
  {
    id: 'decimal',
    group: '字符与编码',
    name: '十进制字节',
    caption: 'TEXT ↔ DECIMAL',
    description: '用 0–255 的十进制数表示字节，以空格分隔。它与 A1Z26 的字母编号不同。',
    example: '69 67 72 79',
    plain: 'ECHO',
  },
  {
    id: 'url',
    group: '字符与编码',
    name: '百分号编码',
    caption: 'TEXT ↔ URL COMPONENT',
    description: '还原 %20、%E5 等 URL 百分号编码。加号会保持原样；空格编码为 %20。',
    example: '%E5%9B%9E%E5%A3%B0',
    plain: '回声',
  },
  {
    id: 'caesar',
    group: '古典密码',
    name: '凯撒移位',
    caption: 'CAESAR SHIFT',
    description: '英文字母沿字母表循环移动。填写加密时的正向位移；选择解码后，工具会向反方向还原。',
    example: 'HFKR',
    plain: 'ECHO',
    key: { label: '加密位移', value: '3' },
  },
  {
    id: 'atbash',
    group: '古典密码',
    name: '镜像字母表',
    caption: 'ATBASH',
    description: 'A 与 Z、B 与 Y、C 与 X 互换。再次镜像会还原原文，其他符号保持不变。',
    example: 'VXSL',
    plain: 'ECHO',
    single: true,
  },
  {
    id: 'vigenere',
    group: '古典密码',
    name: '维吉尼亚',
    caption: 'VIGENÈRE',
    description: '密钥的字母重复使用，A 对应 0 位移，B 对应 1 位移。空格与标点不消耗密钥字母。',
    example: 'OGFY',
    plain: 'ECHO',
    key: { label: '字母密钥', value: 'KEY' },
  },
  {
    id: 'a1z26',
    group: '古典密码',
    name: '字母序号',
    caption: 'A1Z26',
    description: 'A=1，B=2，一直到 Z=26。数字以空格分隔，单词之间可使用斜线。',
    example: '5 3 8 15',
    plain: 'ECHO',
  },
  {
    id: 'polybius',
    group: '古典密码',
    name: '五乘五方阵',
    caption: 'POLYBIUS SQUARE',
    description:
      '使用标准 ABCDE / FGHIK / LMNOP / QRSTU / VWXYZ 方阵，行在前、列在后，从 1 开始。I 与 J 合并为 I。',
    example: '15 13 23 34',
    plain: 'ECHO',
  },
  {
    id: 'bacon',
    group: '古典密码',
    name: '两种记号',
    caption: 'BACON · 26 LETTERS',
    description:
      '现代 26 字母培根密码：A 记号=0、B 记号=1，每五位组成一个数，0 对应 A、25 对应 Z。',
    example: 'AABAA AAABA AABBB ABBBA',
    plain: 'ECHO',
  },
  {
    id: 'rail',
    group: '古典密码',
    name: '栅栏重排',
    caption: 'RAIL FENCE',
    description: '文字沿多条轨道上下折返写入，再逐轨读出。此工具保留所有字符，包括空格与标点。',
    example: 'BGRNTAIE',
    plain: 'BRINGTEA',
    key: { label: '轨道数（2–12）', value: '3' },
  },
  {
    id: 'reverse',
    group: '古典密码',
    name: '倒序阅读',
    caption: 'REVERSE ORDER',
    description: '把最后一个字符放到最前面；中文与表情符号也可以倒序。',
    example: 'OHCE',
    plain: 'ECHO',
    single: true,
  },
  {
    id: 'rot47',
    group: '古典密码',
    name: '可见字符转轮',
    caption: 'ROT47',
    description: '在 ASCII 33–126 的 94 个可见字符中移动 47 位。转换两次回到原文，空格保持不变。',
    example: 'trw~',
    plain: 'ECHO',
    single: true,
  },
  {
    id: 'morse',
    group: '信号与计算',
    name: '摩斯电码',
    caption: 'MORSE CODE',
    description:
      '与档案里的电码格式一致：字母用 / 分隔，单词用 // 分隔，也可用空格分隔字母。支持 A–Z 和 0–9。',
    example: '. / -.-. / .... / ---',
    plain: 'ECHO',
  },
  {
    id: 'xor',
    group: '信号与计算',
    name: '循环异或',
    caption: 'REPEATING KEY XOR',
    description:
      '文字先转为 UTF-8 字节，再与十六进制密钥逐字节异或。多字节密钥会循环使用，密文按十六进制显示。',
    example: '52 E0 5F EC',
    plain: 'ECHO',
    key: { label: '十六进制密钥', value: '17 A3' },
  },
  {
    id: 'sha256',
    group: '信号与计算',
    name: 'SHA-256 摘要',
    caption: 'SHA-256 / UTF-8',
    description:
      '为原样输入的文字计算摘要，包括空格与换行。摘要不能逆向解码；可以计算候选词，再逐一比较。',
    example: 'ECHO',
    plain: 'ECHO',
    single: true,
  },
  {
    id: 'modpow',
    group: '信号与计算',
    name: '模幂计算',
    caption: 'BASE ^ EXPONENT MOD N',
    description: '计算底数的指定次幂除以模数的余数。适合教学 RSA 和同余题；使用整数运算。',
    example: '27',
    plain: '27',
    key: { label: '指数', value: '3' },
    auxiliary: { label: '模数', value: '55' },
    single: true,
  },
]
export const toolById = Object.fromEntries(archiveTools.map((tool) => [tool.id, tool])) as Record<
  ToolMethod,
  ArchiveTool
>
