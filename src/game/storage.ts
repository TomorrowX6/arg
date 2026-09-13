import type { GameState, Note, Settings, SolveRecord } from './types'

export const STORAGE_KEY = 'echo-archive:v1'
export const RECOVERY_KEY = 'echo-archive:recovery'
export const MAX_SAVE_BYTES = 20 * 1024 * 1024
const MAX_NOTES = 200
export const defaultSettings: Settings = {
  sound: false,
  reducedMotion: false,
  highContrast: false,
  fontSize: 'standard',
}

export function createState(): GameState {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    solved: {},
    hints: {},
    attempts: {},
    bookmarked: [],
    notes: [],
    activePuzzle: null,
    settings: { ...defaultSettings },
    ending: null,
    dailySolved: {},
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
const safeKey = (key: string) =>
  /^[a-zA-Z0-9_-]{1,80}$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key)
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length < 40 && Number.isFinite(Date.parse(value))
const limitedNumber = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : 0
const string = (value: unknown, limit = 10000) =>
  typeof value === 'string' ? value.slice(0, limit) : ''

export function parseSave(input: unknown): GameState {
  if (!isRecord(input) || input.version !== 1)
    throw new Error('这不是可识别的余响档案馆存档，或存档版本暂不支持。')
  const fresh = createState()
  const solved: Record<string, SolveRecord> = {}
  if (isRecord(input.solved))
    for (const [id, value] of Object.entries(input.solved).slice(0, 3000)) {
      if (safeKey(id) && isRecord(value) && validDate(value.at))
        solved[id] = {
          at: value.at,
          hints: limitedNumber(value.hints, 3),
          attempts: limitedNumber(value.attempts, 99999),
        }
    }
  const numberMap = (value: unknown, max: number): Record<string, number> =>
    isRecord(value)
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => safeKey(key))
            .slice(0, 3000)
            .map(([key, amount]) => [key, limitedNumber(amount, max)]),
        )
      : {}
  const notes: Note[] = Array.isArray(input.notes)
    ? input.notes
        .filter(isRecord)
        .slice(0, MAX_NOTES)
        .map((note) => ({
          id: safeKey(string(note.id)) ? string(note.id) : crypto.randomUUID(),
          title: string(note.title, 120),
          text: string(note.text, 20000),
          updatedAt: validDate(note.updatedAt) ? note.updatedAt : fresh.startedAt,
          ...(typeof note.puzzleId === 'string' && safeKey(note.puzzleId)
            ? { puzzleId: note.puzzleId }
            : {}),
        }))
    : []
  const settings = isRecord(input.settings) ? input.settings : {}
  const dailySolved = isRecord(input.dailySolved)
    ? Object.fromEntries(
        Object.entries(input.dailySolved)
          .filter(([date, ids]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(ids))
          .map(([date, ids]) => [
            date,
            [
              ...new Set(
                (ids as unknown[]).filter(
                  (id): id is string => typeof id === 'string' && safeKey(id),
                ),
              ),
            ],
          ]),
      )
    : {}
  return {
    ...fresh,
    startedAt: validDate(input.startedAt) ? input.startedAt : fresh.startedAt,
    solved,
    hints: numberMap(input.hints, 3),
    attempts: numberMap(input.attempts, 99999),
    bookmarked: Array.isArray(input.bookmarked)
      ? [
          ...new Set(
            input.bookmarked.filter((id): id is string => typeof id === 'string' && safeKey(id)),
          ),
        ].slice(0, 3000)
      : [],
    notes,
    activePuzzle:
      typeof input.activePuzzle === 'string' && safeKey(input.activePuzzle)
        ? input.activePuzzle
        : null,
    settings: {
      sound: settings.sound === true,
      reducedMotion: settings.reducedMotion === true,
      highContrast: settings.highContrast === true,
      fontSize: settings.fontSize === 'large' ? 'large' : 'standard',
    },
    ending: typeof input.ending === 'string' ? input.ending.slice(0, 80) : null,
    dailySolved,
  }
}

export function readSave(): { state: GameState; error: string | null; writeBlocked: boolean } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    return {
      state: raw ? parseSave(JSON.parse(raw)) : createState(),
      error: null,
      writeBlocked: false,
    }
  } catch {
    if (raw) {
      try {
        localStorage.setItem(RECOVERY_KEY, raw)
      } catch {
        /* The original key stays untouched. */
      }
      return {
        state: createState(),
        writeBlocked: true,
        error:
          '旧存档暂时无法读取，原始数据已保留，自动保存已暂停。请到设置下载原始备份，再导入有效存档或重置。当前新进度仍可手动导出。',
      }
    }
    return {
      state: createState(),
      writeBlocked: false,
      error: '浏览器中的存档无法读取。你仍可游玩，建议使用「设置」中的导出功能保存进度。',
    }
  }
}

export function readRecoverySave(): string | null {
  try {
    const backup = localStorage.getItem(RECOVERY_KEY)
    if (backup) return backup
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      parseSave(JSON.parse(raw))
      return null
    } catch {
      return raw
    }
  } catch {
    return null
  }
}

export function serializeSave(state: GameState): string {
  return JSON.stringify(
    { ...state, exportedAt: new Date().toISOString(), application: '余响档案馆' },
    null,
    2,
  )
}
