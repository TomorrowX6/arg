import { caesar, decodeBase64, parseHex } from './mechanics'
import { MORSE } from './audio'

export type ToolMethod =
  | 'base64'
  | 'hex'
  | 'binary'
  | 'decimal'
  | 'url'
  | 'caesar'
  | 'atbash'
  | 'vigenere'
  | 'a1z26'
  | 'polybius'
  | 'bacon'
  | 'rail'
  | 'reverse'
  | 'rot47'
  | 'morse'
  | 'xor'
  | 'sha256'
  | 'modpow'
export type ToolMode = 'decode' | 'encode'
export const MAX_TOOL_INPUT = 8192
const square = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export function encodeBase64(text: string): string {
  return btoa(Array.from(encoder.encode(text), (byte) => String.fromCharCode(byte)).join(''))
}
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}
export function atbash(text: string): string {
  return text.replace(/[a-z]/gi, (letter) =>
    String.fromCharCode((letter === letter.toUpperCase() ? 155 : 219) - letter.charCodeAt(0)),
  )
}
export function rot47(text: string): string {
  return text.replace(/[!-~]/g, (char) =>
    String.fromCharCode(33 + ((char.charCodeAt(0) - 33 + 47) % 94)),
  )
}
export function vigenere(text: string, key: string, mode: ToolMode): string {
  const normalized = key.normalize('NFKC').replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]+$/.test(normalized)) throw new Error('密钥需要英文字母，例如 KEY。')
  let index = 0
  return text.replace(/[a-z]/gi, (letter) => {
    const shift = normalized.charCodeAt(index++ % normalized.length) - 65
    return caesar(letter, mode === 'encode' ? shift : -shift)
  })
}
export function railFence(text: string, rails: number, mode: ToolMode): string {
  if (!Number.isInteger(rails) || rails < 2 || rails > 12)
    throw new Error('轨道数需要是 2 至 12 的整数。')
  const chars = Array.from(text),
    period = 2 * (rails - 1)
  const route = chars.map((_, index) => {
    const offset = index % period
    return offset < rails ? offset : period - offset
  })
  if (mode === 'encode')
    return Array.from({ length: rails }, (_, row) =>
      chars.filter((_, index) => route[index] === row).join(''),
    ).join('')
  let offset = 0
  const rows = Array.from({ length: rails }, (_, row) => {
    const length = route.filter((r) => r === row).length
    const result = chars.slice(offset, offset + length)
    offset += length
    return result
  })
  const positions = Array(rails).fill(0)
  return route.map((row) => rows[row][positions[row]++]).join('')
}

function alphabetWords(text: string): string[] {
  const cleaned = text.trim().toUpperCase()
  if (!/^[A-Z\s]+$/.test(cleaned)) throw new Error('这种编码使用英文字母与空格；请先移除其他符号。')
  return cleaned.split(/\s+/)
}

export function polybius(text: string, mode: ToolMode): string {
  if (mode === 'encode')
    return alphabetWords(text)
      .map((word) =>
        [...word.replace(/J/g, 'I')]
          .map((letter) => {
            const index = square.indexOf(letter)
            return `${Math.floor(index / 5) + 1}${(index % 5) + 1}`
          })
          .join(' '),
      )
      .join(' / ')
  return text
    .trim()
    .split(/\s*\/\s*/)
    .map((word) => {
      const compact = word.replace(/\s+/g, '')
      if (!compact || compact.length % 2 || !/^[1-5]+$/.test(compact))
        throw new Error('坐标需要两位一组，行列均为 1 至 5。I/J 共用一格。')
      return compact
        .match(/../g)!
        .map((pair) => square[(Number(pair[0]) - 1) * 5 + Number(pair[1]) - 1])
        .join('')
    })
    .join(' ')
}

export function bacon(text: string, mode: ToolMode): string {
  if (mode === 'encode')
    return alphabetWords(text)
      .map((word) =>
        [...word]
          .map((letter) =>
            (letter.charCodeAt(0) - 65)
              .toString(2)
              .padStart(5, '0')
              .replace(/0/g, 'A')
              .replace(/1/g, 'B'),
          )
          .join(' '),
      )
      .join(' / ')
  return text
    .trim()
    .toUpperCase()
    .split(/\s*\/\s*/)
    .map((word) => {
      const compact = word.replace(/\s+/g, '')
      if (!compact || compact.length % 5 || !/^[AB]+$/.test(compact))
        throw new Error('培根密码使用 A/B 记号，每五个一组。')
      return compact
        .match(/.{5}/g)!
        .map((group) => {
          const value = parseInt(group.replace(/A/g, '0').replace(/B/g, '1'), 2)
          if (value > 25) throw new Error('这组记号超过 0–25，不能对应现代 26 字母版本。')
          return String.fromCharCode(65 + value)
        })
        .join('')
    })
    .join(' ')
}

export function a1z26(text: string, mode: ToolMode): string {
  if (mode === 'encode')
    return alphabetWords(text)
      .map((word) => [...word].map((letter) => letter.charCodeAt(0) - 64).join(' '))
      .join(' / ')
  return text
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .split(/[\s,·-]+/)
        .map((number) => {
          if (!/^\d+$/.test(number) || Number(number) < 1 || Number(number) > 26)
            throw new Error('每个数字需要在 1 至 26 之间，以空格、逗号或短横线分隔。')
          return String.fromCharCode(Number(number) + 64)
        })
        .join(''),
    )
    .join(' ')
}

export function morse(text: string, mode: ToolMode): string {
  if (mode === 'encode') {
    if (!/^[a-z\d\s]+$/i.test(text.trim()))
      throw new Error('摩斯编码工具支持英文字母、数字与空格。')
    return text
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .map((word) => [...word].map((letter) => MORSE[letter]).join(' / '))
      .join(' // ')
  }
  const letters = Object.fromEntries(Object.entries(MORSE).map(([letter, code]) => [code, letter]))
  return text
    .trim()
    .split(/\s*\/\/\s*/)
    .map((word) =>
      word
        .split(/[\s/]+/)
        .map((code) => {
          if (!letters[code])
            throw new Error(`无法识别电码 ${code}。字母用 / 分隔，单词用 // 分隔。`)
          return letters[code]
        })
        .join(''),
    )
    .join(' ')
}

export function modularPower(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (exponent < 0n || modulus < 1n) throw new Error('指数需要非负，模数需要大于 0。')
  let result = 1n % modulus,
    factor = ((base % modulus) + modulus) % modulus,
    power = exponent
  while (power > 0n) {
    if (power & 1n) result = (result * factor) % modulus
    factor = (factor * factor) % modulus
    power >>= 1n
  }
  return result
}

function integer(input: string, label: string): bigint {
  const text = input.trim()
  if (!/^-?\d{1,128}$/.test(text)) throw new Error(`${label}需要十进制整数，最多 128 位。`)
  return BigInt(text)
}

export async function runTool(
  method: ToolMethod,
  input: string,
  mode: ToolMode,
  key = '',
  auxiliary = '',
): Promise<string> {
  if (input.length > MAX_TOOL_INPUT)
    throw new Error(`单次最多处理 ${MAX_TOOL_INPUT.toLocaleString()} 个字符。`)
  if (!input.length && method !== 'sha256') throw new Error('先放入一段需要处理的资料。')
  try {
    switch (method) {
      case 'base64':
        return mode === 'encode' ? encodeBase64(input) : decodeBase64(input)
      case 'hex':
        return mode === 'encode'
          ? bytesToHex(encoder.encode(input))
          : decoder.decode(Uint8Array.from(parseHex(input)))
      case 'binary': {
        if (mode === 'encode')
          return Array.from(encoder.encode(input), (byte) =>
            byte.toString(2).padStart(8, '0'),
          ).join(' ')
        const compact = input.replace(/\s+/g, '')
        if (!/^[01]+$/.test(compact) || compact.length % 8)
          throw new Error('二进制字节只含 0 和 1，每八位一组。')
        return decoder.decode(Uint8Array.from(compact.match(/.{8}/g)!, (byte) => parseInt(byte, 2)))
      }
      case 'decimal': {
        if (mode === 'encode') return Array.from(encoder.encode(input)).join(' ')
        const values = input.trim().split(/[\s,]+/)
        if (values.some((value) => !/^\d+$/.test(value) || Number(value) > 255))
          throw new Error('十进制字节需要在 0 至 255 之间，用空格分隔。')
        return decoder.decode(Uint8Array.from(values, Number))
      }
      case 'url':
        return mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input)
      case 'caesar': {
        if (!/^-?\d{1,4}$/.test(key.trim()))
          throw new Error('请输入整数位移，例如 3；解码时会自动反向移动。')
        return caesar(input, Number(key) * (mode === 'encode' ? 1 : -1))
      }
      case 'atbash':
        return atbash(input)
      case 'vigenere':
        return vigenere(input, key, mode)
      case 'a1z26':
        return a1z26(input, mode)
      case 'polybius':
        return polybius(input, mode)
      case 'bacon':
        return bacon(input, mode)
      case 'rail':
        return railFence(input, Number(key), mode)
      case 'reverse':
        return Array.from(
          new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(input),
          (part) => part.segment,
        )
          .reverse()
          .join('')
      case 'rot47':
        return rot47(input)
      case 'morse':
        return morse(input, mode)
      case 'xor': {
        const secret = parseHex(key.replace(/^0x/i, ''))
        if (secret.length > 64) throw new Error('异或密钥最多 64 字节。')
        const bytes = mode === 'encode' ? encoder.encode(input) : Uint8Array.from(parseHex(input))
        const result = bytes.map((byte, index) => byte ^ secret[index % secret.length])
        return mode === 'encode' ? bytesToHex(result) : decoder.decode(result)
      }
      case 'sha256': {
        const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(input))
        return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join(
          '',
        )
      }
      case 'modpow':
        return modularPower(
          integer(input, '底数'),
          integer(key, '指数'),
          integer(auxiliary, '模数'),
        ).toString()
    }
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error('这些字节暂时不能组成有效的 UTF-8 文字，请检查编码方式或密钥。')
    if (error instanceof URIError)
      throw new Error('百分号编码不完整，请检查每个 % 后的两个十六进制字符。')
    throw error
  }
}
