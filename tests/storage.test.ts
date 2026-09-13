import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createState,
  parseSave,
  readSave,
  RECOVERY_KEY,
  serializeSave,
  STORAGE_KEY,
} from '../src/game/storage'
import { gameReducer } from '../src/game/reducer'

afterEach(() => vi.unstubAllGlobals())

describe('save persistence and recovery', () => {
  it('round-trips notes, settings, hints and progress without losing player work', () => {
    let state = createState()
    state = gameReducer(state, { type: 'hint', id: 'a01' })
    state = gameReducer(state, { type: 'attempt', id: 'a01' })
    state = gameReducer(state, { type: 'solve', id: 'a01' })
    state = gameReducer(state, { type: 'bookmark', id: 'a02' })
    state = gameReducer(state, {
      type: 'note',
      note: {
        id: 'note-one',
        title: '我的猜想',
        text: '23:17 是时间，不是日期。',
        updatedAt: new Date().toISOString(),
        puzzleId: 'a06',
      },
    })
    state = gameReducer(state, {
      type: 'settings',
      settings: { reducedMotion: true, fontSize: 'large' },
    })
    expect(parseSave(JSON.parse(serializeSave(state)))).toEqual(state)
    expect(state.solved.a01).toMatchObject({ hints: 1, attempts: 2 })
    expect(gameReducer(state, { type: 'solve', id: 'a01' })).toBe(state)
  })
  it('rejects unsupported versions and sanitizes malformed imported values', () => {
    expect(() => parseSave({ version: 2 })).toThrow()
    expect(() => parseSave(null)).toThrow()
    const imported = parseSave(
      JSON.parse(
        '{"version":1,"hints":{"a01":99,"__proto__":2},"attempts":{"a01":-9},"bookmarked":["a01","a01",4],"settings":{"sound":"yes","fontSize":"giant"}}',
      ),
    )
    expect(imported.hints).toEqual({ a01: 3 })
    expect(imported.attempts.a01).toBe(0)
    expect(imported.bookmarked).toEqual(['a01'])
    expect(imported.settings.sound).toBe(false)
    expect(imported.settings.fontSize).toBe('standard')
    expect(Object.hasOwn(imported.hints, '__proto__')).toBe(false)
  })
  it('preserves long-running reception logs beyond 366 dates and 500 signals per date', () => {
    const state = createState()
    for (let day = 0; day < 400; day++) {
      const date = new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10)
      state.dailySolved[date] = Array.from(
        { length: day === 0 ? 700 : 1 },
        (_, i) => `field-v2-${date}-${i}`,
      )
    }
    expect(parseSave(JSON.parse(serializeSave(state))).dailySolved).toEqual(state.dailySolved)
    state.dailySolved['2026-01-01'].push('field-v2-2026-01-01-0', '__proto__')
    expect(parseSave(state).dailySolved['2026-01-01']).toHaveLength(700)
  })
  it('keeps a corrupt or future-version save untouched and pauses overwrites', () => {
    const data = new Map<string, string>([[STORAGE_KEY, '{"version":2,"future":"precious"}']])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    })
    const result = readSave()
    expect(result.writeBlocked).toBe(true)
    expect(result.error).toContain('原始数据已保留')
    expect(data.get(STORAGE_KEY)).toBe('{"version":2,"future":"precious"}')
    expect(data.get(RECOVERY_KEY)).toBe(data.get(STORAGE_KEY))
  })
  it('keeps the original even when the backup cannot be written', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{broken',
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(readSave().writeBlocked).toBe(true)
  })
  it('lets play continue when browser storage itself is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    const result = readSave()
    expect(result.state.version).toBe(1)
    expect(result.error).toBeTruthy()
  })
})
