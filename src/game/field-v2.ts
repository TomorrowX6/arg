import { fieldWords } from '../data/field-words'
import { MORSE } from './audio'
import {
  a1z26,
  atbash,
  bacon,
  bytesToHex,
  encodeBase64,
  polybius,
  railFence,
  rot47,
  vigenere,
} from './codecs'
import { seededRandom } from './field'
import type { FieldPuzzle } from './field'
import { caesar } from './mechanics'
import { solveJugs } from './miniGames'
import type { JugAction, JugState } from './miniGames'
import {
  makeCircuit,
  makeLights,
  makeSliding,
  makeWarehouse,
  nonogramPatterns,
  pick,
  shuffle,
  transformSquare,
} from './procedural'
import type { PuzzleKind } from './types'

export const FIELD_FAMILY_COUNT = 24
export const FIELD_MAX_INDEX = 999_999_999
export type FieldChannel = 'all' | 'cipher' | 'device'
export const fieldFamilyLabels = [
  '凯撒移位',
  '摩斯电码',
  '十六进制',
  '维吉尼亚',
  '坐标方阵',
  '培根密码',
  '字母序号',
  '循环异或',
  '栅栏密码',
  '镜像字母',
  '倒序 / Base64',
  'ROT47 / HEX',
  '二进制',
  '熄灯矩阵',
  '数织',
  '量水',
  '滑块拼图',
  '旋转线路',
  '推箱子',
  '天平',
  '记忆信号',
  '机械拨盘',
  '时间排序',
  '调频',
]

export function matchesChannel(index: number, channel: FieldChannel): boolean {
  const family = index % FIELD_FAMILY_COUNT
  return channel === 'all' || (channel === 'cipher' ? family <= 12 : family >= 13)
}
export function nextFieldIndex(
  index: number,
  channel: FieldChannel,
  direction: 1 | -1 = 1,
): number | null {
  let next = index + direction
  while (next >= 0 && next <= FIELD_MAX_INDEX) {
    if (matchesChannel(next, channel)) return next
    next += direction
  }
  return null
}
export function isArchiveDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const jugChoices: { capacity: JugState; target: number }[] = [
  { capacity: [5, 3], target: 4 },
  { capacity: [7, 4], target: 5 },
  { capacity: [8, 5], target: 4 },
  { capacity: [9, 4], target: 6 },
  { capacity: [7, 5], target: 1 },
]
const jugNames: Record<JugAction, string> = {
  fill0: '装满甲',
  fill1: '装满乙',
  empty0: '倒空甲',
  empty1: '倒空乙',
  pour01: '甲倒入乙',
  pour10: '乙倒入甲',
}
const directionNames = { up: '上', right: '右', down: '下', left: '左' }

// Keep protocol v2's word order, family order and random draws stable after release.
export function generateFieldV2(date: string, index: number): FieldPuzzle {
  const random = seededRandom(`echo-field-v2:${date}:${index}`)
  const [word, meaning] = pick(fieldWords, random)
  const id = `field-v2-${date}-${index}`
  const label = `临时档案 / ${date} / ${String(index + 1).padStart(3, '0')}`
  const finalHint = `完整校验词：${word}（${meaning}）。`
  const base = { id, answer: word, meaning }
  function cipher(
    title: string,
    method: string,
    briefing: string,
    code: string,
    tool: string,
    key: string,
    firstHint: string,
  ): FieldPuzzle {
    return {
      ...base,
      title,
      method,
      briefing,
      artifact: { type: 'cipher', label, code, ...(key ? { key } : {}), config: { tool } },
      hints: [firstHint, `还原后有 ${word.length} 个英文字母，意思是「${meaning}」。`, finalHint],
    }
  }
  function device(
    title: string,
    method: string,
    briefing: string,
    type: PuzzleKind,
    config: Record<string, unknown>,
    hints: [string, string],
  ): FieldPuzzle {
    return {
      ...base,
      title,
      method,
      briefing,
      artifact: { type, label, config: { ...config, message: `信号恢复。校验词：${word}` } },
      hints: [...hints, finalHint],
    }
  }
  switch (index % FIELD_FAMILY_COUNT) {
    case 0: {
      const shift = 3 + Math.floor(random() * 23)
      return cipher(
        '晚到了几格的呼号',
        '凯撒移位',
        `发送端把每个英文字母向后移动 ${shift} 位。把它们向前退回同样的步数，字母表首尾相接。`,
        caesar(word, shift),
        'caesar',
        `加密位移 +${shift}；还原时使用 −${shift}。`,
        '先看位移方向。工具箱选择解码，并填写加密时使用的正数位移。',
      )
    }
    case 1:
      return {
        ...base,
        title: '长短之间的问候',
        method: '摩斯电码',
        briefing: '每组长短音对应一个字母，斜线分隔字母。可以播放信号，也可以只看电码和译码卡。',
        artifact: {
          type: 'morse',
          label,
          code: [...word].map((letter) => MORSE[letter]).join(' / '),
          annotation: '点是短音，划是长音。',
        },
        hints: [
          '展开译码卡，按每个斜线间的点划查找字母。',
          `这个词有 ${word.length} 个字母，意思是「${meaning}」。`,
          finalHint,
        ],
      }
    case 2:
      return cipher(
        '收据上的十六进制',
        'HEX / UTF-8',
        '每两位数是一个十六进制字节。按顺序还原为 UTF-8 文字；也可在工具箱选择十六进制解码。',
        bytesToHex(new TextEncoder().encode(word)),
        'hex',
        '41=A 42=B 43=C … 5A=Z',
        '英文大写字母通常对应十六进制 41–5A。每两位一组，不要把整行当成一个大整数。',
      )
    case 3: {
      const key = pick(['LARK', 'ECHO', 'DAWN', 'MIST', 'NOTE', 'TIDE'], random)
      return cipher(
        '轮班使用的字母钥匙',
        '维吉尼亚',
        `发送者反复使用密钥 ${key}，每个密钥字母提供一种位移：A=0，B=1，以此类推。选择维吉尼亚解码。`,
        vigenere(word, key, 'encode'),
        'vigenere',
        `密钥：${key}`,
        '密钥按原文逐字循环使用；解码方向是减去密钥带来的位移。',
      )
    }
    case 4:
      return cipher(
        '窗格上的坐标',
        '波利比奥斯方阵',
        '两位数字分别表示行、列，都从 1 开始。使用标准五乘五字母方阵，I/J 共用一格。',
        polybius(word, 'encode'),
        'polybius',
        '1: A B C D E\n2: F G H I/J K\n3: L M N O P\n4: Q R S T U\n5: V W X Y Z',
        '第一位找行，第二位找列；每对数字对应一个字母。',
      )
    case 5:
      return cipher(
        '只有两种记号的电报',
        '培根密码',
        'A 记号表示 0，B 记号表示 1。每五位读成一个二进制数，按 A=0 至 Z=25 还原现代 26 字母版本。',
        bacon(word, 'encode'),
        'bacon',
        '五位权重：16 8 4 2 1。字母从 A=0 开始。',
        '先将 A/B 换成 0/1，再按五位一组换成字母；不是传统合并 I/J 的版本。',
      )
    case 6:
      return cipher(
        '字母们排成一列',
        'A1Z26',
        '每个数字代表字母表中的顺序，从 A=1 到 Z=26。数字之间的空格用来分组。',
        a1z26(word, 'encode'),
        'a1z26',
        'A=1 · B=2 · C=3 · … · Z=26',
        '这是字母序号，不是 ASCII。1 应该变成 A。',
      )
    case 7: {
      const secret = [1 + Math.floor(random() * 254), 1 + Math.floor(random() * 254)],
        key = bytesToHex(Uint8Array.from(secret))
      const code = bytesToHex(
        Uint8Array.from([...word], (letter, i) => letter.charCodeAt(0) ^ secret[i % 2]),
      )
      return cipher(
        '一轻一重的双拍',
        '循环异或',
        `用十六进制密钥 ${key} 循环异或每个字节。密文也按十六进制显示，结果按 UTF-8 读取。`,
        code,
        'xor',
        `循环密钥：${key}`,
        '密钥有两个字节，第一、三、五…个字节使用第一个，第二、四、六…个使用第二个。',
      )
    }
    case 8: {
      const rails = 2 + Math.floor(random() * 3)
      return cipher(
        '分坐几条轨道的信',
        '栅栏密码',
        `原文沿 ${rails} 条轨道上下折返写入，再逐轨读出。用栅栏解码器填入轨道数 ${rails}，还原原来的字母顺序。`,
        railFence(word, rails, 'encode'),
        'rail',
        `轨道数：${rails}`,
        '先按各轨道占据的位置数把密文拆回去，再沿折返顺序读取；它改变顺序，不改变字母。',
      )
    }
    case 9:
      return cipher(
        '镜子另一面的字母',
        'Atbash',
        '把字母表左右翻转：A↔Z、B↔Y，逐一替换每个字母。',
        atbash(word),
        'atbash',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nZYXWVUTSRQPONMLKJIHGFEDCBA',
        '两行字母表按列对应。照两次镜子就能还原。',
      )
    case 10:
      return cipher(
        '从信封底部拆起',
        '倒序 / Base64',
        '原文先经过 Base64，再将整串字符从尾到头反转。先做倒序阅读，再把结果送入 Base64 解码。',
        [...encodeBase64(word)].reverse().join(''),
        'reverse',
        '拆封顺序：倒序 → Base64 解码',
        '开头的 = 可能原本是 Base64 末尾的补位。先恢复字符顺序。',
      )
    case 11:
      return cipher(
        '转轮里的字节',
        'ROT47 / HEX',
        '原文先转成十六进制字节，再对可见 ASCII 字符做 ROT47。先 ROT47，再十六进制解码；中间的空格不会被转动。',
        rot47(bytesToHex(new TextEncoder().encode(word))),
        'rot47',
        '拆封顺序：ROT47 → HEX 解码',
        'ROT47 还原后应当出现两位一组的十六进制数。把这个中间结果作为第二步输入。',
      )
    case 12:
      return cipher(
        '八位一组的夜色',
        '二进制字节',
        '每八个 0/1 组成一个字节，最高位在左。按 UTF-8 读取这些字节，还原校验词。',
        [...word].map((letter) => letter.charCodeAt(0).toString(2).padStart(8, '0')).join(' '),
        'binary',
        '位权：128 64 32 16 8 4 2 1',
        '按八位分组，先算每组的字节值，再对应字母；也可使用二进制字节工具。',
      )
    case 13: {
      const board = makeLights(random)
      return device(
        '熄掉多余的噪声',
        '熄灯矩阵',
        '点击一个灯，会翻转它与上下左右邻居的状态。让全部灯熄灭，接收器就会显示校验词。可以随时重置。',
        'lights',
        { size: 3, initial: board.initial },
        [
          '同一个位置按两次会抵消，操作顺序不影响最终结果。',
          `从初始状态点击格子 ${board.solution.map((n) => n + 1).join('、')}。格子从左到右、从上到下编号。`,
        ],
      )
    }
    case 14: {
      const pattern = pick(nonogramPatterns, random),
        turns = Math.floor(random() * 4),
        mirror = random() < 0.5
      const solution = transformSquare([...pattern.join('')].map(Number), 5, turns, mirror)
      const rows = Array.from({ length: 5 }, (_, r) =>
        solution
          .slice(r * 5, r * 5 + 5)
          .map((bit) => (bit ? '■' : '·'))
          .join(''),
      )
      return device(
        '从数字中找回图像',
        '数织',
        '每行每列的数字是连续黑格的长度，不同黑块之间至少留一格。复原这幅五乘五图案，取回它携带的词。',
        'nonogram',
        { size: 5, solution },
        [
          '优先处理数字 5、整列都满，或数字总长度很接近格数的行列。',
          `五行参考（■ 为黑格，· 为空格）：\n${rows.join('\n')}`,
        ],
      )
    }
    case 15: {
      const { capacity, target } = pick(jugChoices, random),
        solution = solveJugs(capacity, 0, target)!
      return device(
        '恰好需要的水量',
        '量水机关',
        `甲壶容量 ${capacity[0]} 升，乙壶容量 ${capacity[1]} 升。两壶起初都空，目标让甲壶恰好留下 ${target} 升。只可装满、倒空或倒至一方到达极限。`,
        'jugs',
        { capacity, targetJug: 0, target },
        [
          '利用两个容量的差，先在一只壶里留出确定的余量；可以撤回试验。',
          `从空壶开始：${solution.map((action) => jugNames[action]).join(' → ')}。`,
        ],
      )
    }
    case 16: {
      const board = makeSliding(random)
      return device(
        '重新打开这扇窗',
        '滑块拼图',
        '移动紧邻空格的画片，让数字按 1–8 顺序排列，右下角留空。每次只移动一块，可以撤销或查看参考图。',
        'sliding',
        { size: 3, initial: board.initial },
        [
          '先尝试把第一行摆好。只有与空格正交相邻的画片可以移动。',
          `从初始状态依次移动这些画片：${board.solution.join(' → ')}。`,
        ],
      )
    }
    case 17: {
      const size = random() < 0.35 ? 4 : 3,
        board = makeCircuit(random, size)
      const rotations = board.solution
        .flatMap((turns, i) => (turns ? [`${i + 1} 号 ${turns} 次`] : []))
        .join('；')
      return device(
        '在转角处接通信号',
        '旋转线路',
        '输入在左上角的左侧，输出在右下角的右侧。点击线块顺时针旋转 90°，让相邻端口相互对齐。只需接通输入与输出。',
        'circuit',
        { size, initial: board.initial },
        [
          `可用路线经过格子 ${board.path.map((cell) => cell + 1).join(' → ')}。`,
          `从初始状态顺时针旋转：${rotations}。`,
        ],
      )
    }
    case 18: {
      const board = makeWarehouse(random)
      return device(
        '把箱子送回它的位置',
        '仓库推箱',
        '绿色圆点是你。只能推箱子，不能拉，也不能同时推两只。把两只箱子都放到圆环目标格，推错时可以撤回。',
        'warehouse',
        { layout: board.layout },
        [
          '先观察箱子最后需要从哪个方向进入目标格，别把它推到无目标的角落。',
          `从初始状态依次移动：${board.solution.map((direction) => directionNames[direction]).join('、')}。`,
        ],
      )
    }
    case 19: {
      const heavy = 1 + Math.floor(random() * 9),
        group = heavy <= 3 ? [1, 2, 3] : heavy <= 6 ? [4, 5, 6] : [7, 8, 9]
      return device(
        '九枚币里的那一点重量',
        '天平称量',
        '九枚检验币只有一枚较重，其余完全相同。最多称两次；每次两边放相同枚数。让称量记录支持唯一候选，再提交判断。',
        'balance',
        { count: 9, heavy, maxWeighings: 2 },
        [
          '先分成三组三枚，称其中两组。左重、右重、平衡分别指向三个不同组。',
          `先称 1、2、3 对 4、5、6；本次重币落在 ${group.join('、')} 这组。再称 ${group[0]} 对 ${group[1]}，平衡则是 ${group[2]}。本次编号为 ${heavy}。`,
        ],
      )
    }
    case 20: {
      const symbols = shuffle(['海', '雨', '鸟', '灯', '月', '门', '星', '桥'], random).slice(0, 4)
      const sequence = Array.from({ length: 4 + Math.floor(random() * 2) }, () =>
        Math.floor(random() * symbols.length),
      )
      return device(
        '把记忆按原样还回去',
        '记忆信号',
        '先播放记忆，再按相同顺序选择符号。可以无限重播，也可以切换慢速；文字与亮起的符号都会提供线索。',
        'sequence',
        { symbols, sequence },
        [
          '把长序列分成两小组来记，遇到重复符号也要重复点击。',
          `正确顺序：${sequence.map((i) => symbols[i]).join(' → ')}。`,
        ],
      )
    }
    case 21: {
      const combination = String(1 + Math.floor(random() * 9999)).padStart(4, '0')
      return device(
        '背面抄下的拨盘号码',
        '机械拨盘',
        `便条上的四位数字是 ${[...combination].reverse().join('')}。值班人从最后一位抄到第一位，把顺序完全反转后再拨入。前导零也要保留。`,
        'dial',
        { digits: 4, combination },
        [
          '最后一位应当变成第一位，只反转先后顺序，不需要做数字镜像。',
          `拨盘应为 ${combination}。数字 0 往下减一格会变成 9，可以少转几次。`,
        ],
      )
    }
    case 22: {
      let minute = 19 * 60 + Math.floor(random() * 90)
      const items = ['资料到达', '登记编号', '完成校验', '装入信封', '正式归档'].map((name, i) => {
        minute += 3 + Math.floor(random() * 12)
        return {
          id: `record-${i}`,
          label: name,
          detail: `1999.11.17 · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
        }
      })
      const order = shuffle(items, random)
      if (order.every((item, i) => item.id === items[i].id))
        [order[0], order[1]] = [order[1], order[0]]
      return device(
        '把这一夜按时间排好',
        '时间排序',
        '记录全部发生在同一天。用箭头把五条记录从最早排到最晚，封条会在正确排序后显示校验词。',
        'sort',
        { items: order, correct: items.map((item) => item.id) },
        [
          '先比较小时，再比较分钟，不按现在的纸条位置判断。',
          `时间顺序：${items.map((item) => item.label).join(' → ')}。`,
        ],
      )
    }
    default: {
      const target = Number((88.1 + Math.floor(random() * 198) / 10).toFixed(1)),
        [whole, decimal] = target.toFixed(1).split('.')
      return device(
        '把频率读正一点',
        '频率调谐',
        `便条记下「${[...whole].reverse().join('')}.${decimal} MHz」。值班人把小数点前的数字从右向左抄了，只有整数部分需要反转；小数位保持不变。还原后调到正确频率。`,
        'frequency',
        { min: 88, max: 108, target },
        [
          '只反转小数点前的数字。小数点后的一位不要移动。',
          `正确频率为 ${target.toFixed(1)} MHz，可用滑杆或微调按钮。`,
        ],
      )
    }
  }
}
