/** The archive accepts case/spacing differences and conventional CTF wrappers. */
export function normalizeAnswer(value: string): string {
  let normalized = value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
  normalized = normalized.replace(/^(?:flag|arg|echo)\{(.*)\}$/u, '$1')
  return normalized.replace(/\s+/gu, '')
}

export async function hashAnswer(id: string, answer: string): Promise<string> {
  const bytes = new TextEncoder().encode(`echo-archive:${id}:${normalizeAnswer(answer)}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function checkAnswer(id: string, answer: string, hashes: string[]): Promise<boolean> {
  if (!answer.trim()) return false
  return hashes.includes(await hashAnswer(id, answer))
}
