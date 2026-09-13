export function toggleLights(board: number[], size: number, index: number): number[] {
  const next = [...board]
  const row = Math.floor(index / size),
    col = index % size
  for (const [r, c] of [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]) {
    if (r >= 0 && r < size && c >= 0 && c < size) next[r * size + c] = next[r * size + c] ? 0 : 1
  }
  return next
}

export function caesar(text: string, shift: number): string {
  return text.replace(/[a-z]/gi, (letter) => {
    const base = letter === letter.toUpperCase() ? 65 : 97
    return String.fromCharCode(((((letter.charCodeAt(0) - base + shift) % 26) + 26) % 26) + base)
  })
}

export function decodeBase64(input: string): string {
  const cleaned = input.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) || cleaned.length % 4 === 1)
    throw new Error('请输入有效的 Base64 编码。')
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0)),
  )
}

export function runTerminal(command: string, files: Record<string, string>): string {
  const [name, ...args] = command.trim().split(/\s+/)
  const filename = args
    .join(' ')
    .replace(/^\.\//, '')
    .replace(/^\/archive\//, '')
  switch (name) {
    case 'help':
      return '可用命令：\n  ls          列出文件\n  ls -a       包括隐藏文件\n  cat 文件名  阅读文件（支持 Tab 补全）\n  grep 词 文件名  在文件中查找文字\n  pwd         当前目录\n  whoami      当前身份\n  clear       清空屏幕\n\n这是一台离线档案终端，只能读取本关的虚构文件。'
    case 'ls':
      return (
        Object.keys(files)
          .filter((file) => args.includes('-a') || args.includes('-la') || !file.startsWith('.'))
          .map((file) => (file.startsWith('.') ? `${file}  [hidden]` : file))
          .join('\n') || '目录为空。'
      )
    case 'cat':
      return Object.hasOwn(files, filename)
        ? files[filename]
        : `无法读取：${filename || '请指定文件名'}\n输入 ls -a 查看可读取的文件。`
    case 'grep': {
      const [term, ...rest] = args
      const file = rest.join(' ')
      if (!term || !Object.hasOwn(files, file)) return '用法：grep 关键词 文件名'
      return (
        files[file]
          .split('\n')
          .filter((line) => line.toLowerCase().includes(term.toLowerCase()))
          .join('\n') || '未找到匹配内容。'
      )
    }
    case 'pwd':
      return '/archive'
    case 'whoami':
      return 'guest_014 / 临时档案员'
    case 'echo':
      return args.join(' ')
    case 'clear':
      return ''
    case '':
      return ''
    default:
      return `未知命令：${name}。输入 help 查看可用命令。`
  }
}

export function isConnected(from: string, to: string, edges: string[][]): boolean {
  return edges.some(([a, b]) => (a === from && b === to) || (a === to && b === from))
}

export function nonogramClues(cells: number[]): number[] {
  const clues: number[] = []
  let run = 0
  for (const cell of [...cells, 0]) {
    if (cell === 1) run += 1
    else if (run) {
      clues.push(run)
      run = 0
    }
  }
  return clues.length ? clues : [0]
}

export function decodeVigenere(input: string, key: string): string {
  const cleanKey = key.normalize('NFKC').replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]+$/.test(cleanKey)) throw new Error('密钥只能包含英文字母。')
  let index = 0
  return input.replace(/[a-z]/gi, (letter) => {
    const result = caesar(letter, -(cleanKey.charCodeAt(index % cleanKey.length) - 65))
    index += 1
    return result
  })
}

export function parseHex(input: string): number[] {
  const clean = input.replace(/\s+/g, '')
  if (!clean || clean.length % 2 || !/^[a-fA-F0-9]+$/.test(clean))
    throw new Error('十六进制数据需要每两位一组，例如 4F 50 45 4E。')
  return clean.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
}

export function decodeXor(input: string, key: string): string {
  const normalized = key.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (!/^[a-fA-F0-9]{1,128}$/.test(normalized) || (normalized.length > 1 && normalized.length % 2))
    throw new Error('请输入十六进制密钥，例如 17 或 17 A3。多个字节会循环使用。')
  const secret = normalized.length === 1 ? [parseInt(normalized, 16)] : parseHex(normalized)
  const bytes = parseHex(input).map((byte, index) => byte ^ secret[index % secret.length])
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
  } catch {
    throw new Error('这把密钥尚未得到可读文字，请检查密钥。')
  }
}

export function slideTile(board: number[], size: number, index: number): number[] {
  const blank = board.indexOf(0)
  if (
    index < 0 ||
    index >= board.length ||
    Math.abs(Math.floor(blank / size) - Math.floor(index / size)) +
      Math.abs((blank % size) - (index % size)) !==
      1
  )
    return board
  const next = [...board]
  ;[next[blank], next[index]] = [next[index], next[blank]]
  return next
}

export function isSlidingSolvable(board: number[], size: number): boolean {
  const values = board.filter((value) => value !== 0)
  let inversions = 0
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) if (values[i] > values[j]) inversions++
  if (size % 2 === 1) return inversions % 2 === 0
  const blankRowFromBottom = size - Math.floor(board.indexOf(0) / size)
  return (inversions + blankRowFromBottom) % 2 === 1
}

export function rotateWire(mask: number): number {
  return ((mask << 1) & 15) | ((mask >> 3) & 1)
}

export function traceCircuit(
  board: number[],
  size: number,
): { powered: Set<number>; connected: boolean } {
  const powered = new Set<number>()
  if (!(board[0] & 8)) return { powered, connected: false }
  const queue = [0]
  powered.add(0)
  const directions = [
    { bit: 1, opposite: 4, dr: -1, dc: 0 },
    { bit: 2, opposite: 8, dr: 0, dc: 1 },
    { bit: 4, opposite: 1, dr: 1, dc: 0 },
    { bit: 8, opposite: 2, dr: 0, dc: -1 },
  ]
  while (queue.length) {
    const index = queue.shift()!
    const row = Math.floor(index / size),
      col = index % size
    for (const direction of directions) {
      if (!(board[index] & direction.bit)) continue
      const r = row + direction.dr,
        c = col + direction.dc
      if (r < 0 || r >= size || c < 0 || c >= size) continue
      const neighbor = r * size + c
      if (board[neighbor] & direction.opposite && !powered.has(neighbor)) {
        powered.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return { powered, connected: powered.has(board.length - 1) && !!(board[board.length - 1] & 2) }
}
