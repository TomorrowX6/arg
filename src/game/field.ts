import { caesar } from './mechanics'
import { MORSE } from './audio'
import type { Artifact } from './types'

export interface FieldPuzzle {
  id: string
  title: string
  method: string
  briefing: string
  artifact: Artifact
  answer: string
  hints: string[]
  meaning: string
}
const words = [
  ['ECHO', '回声'],
  ['HARBOR', '港湾'],
  ['LANTERN', '灯笼'],
  ['DAWN', '黎明'],
  ['RETURN', '归返'],
  ['SIGNAL', '信号'],
  ['MEMORY', '记忆'],
  ['NORTH', '北方'],
  ['PAPER', '纸张'],
  ['ORBIT', '轨道'],
  ['WINDOW', '窗户'],
  ['SILENCE', '寂静'],
  ['LETTER', '信件'],
  ['RADIO', '收音机'],
  ['BIRD', '鸟'],
  ['LIGHT', '光'],
]
export function archiveDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export function seededRandom(seed: string): () => number {
  let a = 2166136261
  for (const char of seed) a = Math.imul(a ^ char.charCodeAt(0), 16777619)
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function generateFieldPuzzle(date: string, index: number): FieldPuzzle {
  const random = seededRandom(`echo-field-v1:${date}:${index}`)
  const [word, meaning] = words[Math.floor(random() * words.length)]
  const shift = 3 + Math.floor(random() * 10)
  const id = `field-${date}-${index}`
  const base = {
    id,
    answer: word,
    meaning,
    hints: [
      `电报还原后是一个英文单词，意思是「${meaning}」。`,
      `这个单词有 ${word.length} 个字母，以 ${word[0]} 开头。`,
      `完整校验词：${word}。`,
    ],
    artifact: {
      type: 'cipher' as const,
      label: `临时档案 / ${date} / ${String(index + 1).padStart(3, '0')}`,
    },
  }
  switch (index % 8) {
    case 0:
      return {
        ...base,
        title: '偏移的呼号',
        method: '凯撒密码',
        briefing: `电台把每个字母向后移动了 ${shift} 位。沿字母表向前退回同样的步数，还原呼号。字母表首尾相接。`,
        artifact: {
          ...base.artifact,
          code: caesar(word, shift),
          annotation: `加密方向 +${shift}，解密方向 −${shift}。`,
          config: { tool: 'caesar' },
        },
      }
    case 1:
      return {
        ...base,
        title: '长短电报',
        method: '摩斯电码',
        briefing:
          '接收器截获了一段长短信号。每组电码对应一个字母，斜线分隔字母。展开译码卡可以完成全部解码。',
        artifact: {
          ...base.artifact,
          type: 'morse',
          code: [...word].map((letter) => MORSE[letter]).join(' / '),
          annotation: '短音为点，长音为划。',
        },
      }
    case 2:
      return {
        ...base,
        title: '十六进制来信',
        method: 'ASCII / HEX',
        briefing: '信件经过十六进制 ASCII 编码。对照附带的字母表，把每个两位数还原成大写英文字母。',
        artifact: {
          ...base.artifact,
          code: [...word]
            .map((letter) => letter.charCodeAt(0).toString(16).toUpperCase())
            .join(' '),
          key: Array.from(
            { length: 26 },
            (_, i) => `${(65 + i).toString(16).toUpperCase()}=${String.fromCharCode(65 + i)}`,
          ).join('  '),
        },
      }
    case 3:
      return {
        ...base,
        title: '逆向回声',
        method: '倒序阅读',
        briefing: '录音带被从尾到头播放。将这一行字母的先后顺序完全反转，找回原本的单词。',
        artifact: {
          ...base.artifact,
          code: [...word].reverse().join(' '),
          annotation: '最后一个变成第一个，第一个变成最后一个。',
        },
      }
    case 4:
      return {
        ...base,
        title: '数字替身',
        method: 'A1Z26',
        briefing: '每个字母用它在英文字母表中的序号代替。A 从 1 开始，Z 是 26。',
        artifact: {
          ...base.artifact,
          code: [...word].map((letter) => letter.charCodeAt(0) - 64).join(' · '),
          key: 'A=1  B=2  C=3  D=4  E=5  F=6  G=7  H=8  I=9  J=10  K=11  L=12  M=13\nN=14  O=15  P=16  Q=17  R=18  S=19  T=20  U=21  V=22  W=23  X=24  Y=25',
        },
      }
    case 5:
      return {
        ...base,
        title: '镜面字母表',
        method: 'Atbash',
        briefing:
          '这套密码让字母表照了一次镜子：A 与 Z 互换，B 与 Y 互换，C 与 X 互换。使用下方的两行字母表逐个替换。',
        artifact: {
          ...base.artifact,
          code: [...word].map((letter) => String.fromCharCode(155 - letter.charCodeAt(0))).join(''),
          key: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nZYXWVUTSRQPONMLKJIHGFEDCBA',
        },
      }
    case 6:
      return {
        ...base,
        title: '邮政机器码',
        method: 'Base64',
        briefing: '自动邮政机将收件代号转换成了 Base64 编码。使用解码器还原，保留原来的字母顺序。',
        artifact: { ...base.artifact, code: btoa(word), config: { tool: 'base64' } },
      }
    default: {
      const odd = [...word].filter((_, i) => i % 2 === 0).join(' '),
        even = [...word].filter((_, i) => i % 2 === 1).join(' ')
      return {
        ...base,
        title: '交错的轨道',
        method: '交替重排',
        briefing:
          '两个频段交替发送同一单词。先取上排第一个，再取下排第一个，继续上下交替；如果上排多一个字母，最后读它。',
        artifact: {
          ...base.artifact,
          code: `上排：${odd}\n下排：${even}`,
          annotation: '上 1 → 下 1 → 上 2 → 下 2 → ……',
        },
      }
    }
  }
}
