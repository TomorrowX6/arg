import type { GameState, Note, Settings } from './types'
import { createState } from './storage'

export type Action =
  | { type: 'solve'; id: string }
  | { type: 'hint'; id: string }
  | { type: 'attempt'; id: string }
  | { type: 'bookmark'; id: string }
  | { type: 'note'; note: Note }
  | { type: 'deleteNote'; id: string }
  | { type: 'active'; id: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'import'; state: GameState }
  | { type: 'reset' }
  | { type: 'ending'; ending: string }
  | { type: 'daily'; date: string; id: string }

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'solve':
      return state.solved[action.id]
        ? state
        : {
            ...state,
            solved: {
              ...state.solved,
              [action.id]: {
                at: new Date().toISOString(),
                hints: state.hints[action.id] ?? 0,
                attempts: (state.attempts[action.id] ?? 0) + 1,
              },
            },
          }
    case 'hint':
      return {
        ...state,
        hints: { ...state.hints, [action.id]: Math.min(3, (state.hints[action.id] ?? 0) + 1) },
      }
    case 'attempt':
      return {
        ...state,
        attempts: {
          ...state.attempts,
          [action.id]: Math.min(99999, (state.attempts[action.id] ?? 0) + 1),
        },
      }
    case 'bookmark':
      return {
        ...state,
        bookmarked: state.bookmarked.includes(action.id)
          ? state.bookmarked.filter((id) => id !== action.id)
          : [...state.bookmarked, action.id],
      }
    case 'note':
      return {
        ...state,
        notes: state.notes.some((note) => note.id === action.note.id)
          ? state.notes.map((note) => (note.id === action.note.id ? action.note : note))
          : [action.note, ...state.notes].slice(0, 200),
      }
    case 'deleteNote':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.id) }
    case 'active':
      return state.activePuzzle === action.id ? state : { ...state, activePuzzle: action.id }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'import':
      return action.state
    case 'reset':
      return createState()
    case 'ending':
      return { ...state, ending: action.ending }
    case 'daily':
      return {
        ...state,
        dailySolved: {
          ...state.dailySolved,
          [action.date]: [...new Set([...(state.dailySolved[action.date] ?? []), action.id])],
        },
      }
  }
}
