const labels: Record<number, string> = {
  0x200b: '零宽空格',
  0x200c: '零宽不连字',
  0x200d: '零宽连字',
  0x2060: '词连接符',
  0xfeff: '零宽不换行空格',
  0x00a0: '不换行空格',
}
export function invisibleCharacters(
  text: string,
): { value: number; label: string; count: number }[] {
  const counts = new Map<number, number>()
  for (const char of text) {
    const value = char.codePointAt(0)!
    if (Object.hasOwn(labels, value)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, label: labels[value], count }))
}
export function extractInvisibleText(
  text: string,
  zero = 0x200b,
  one = 0x200c,
): { bits: string; text: string } {
  if (zero === one) throw new Error('0 与 1 需要对应两种不同字符。')
  const bits = [...text]
    .flatMap((char) =>
      char.codePointAt(0) === zero ? ['0'] : char.codePointAt(0) === one ? ['1'] : [],
    )
    .join('')
  if (!bits.length) throw new Error('没有找到选择的两种隐藏字符。')
  if (bits.length % 8) throw new Error(`提取到 ${bits.length} 位，不能组成完整的八位字节。`)
  const bytes = Uint8Array.from(bits.match(/.{8}/g)!, (byte) => parseInt(byte, 2))
  try {
    return {
      bits: bits.match(/.{8}/g)!.join(' '),
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    }
  } catch {
    throw new Error('提取到的字节不能组成 UTF-8 文字。请检查 0 与 1 的映射。')
  }
}
