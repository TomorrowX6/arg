import { createContext } from 'react'
import type { Dispatch } from 'react'
import type { GameState } from './types'
import type { Action } from './reducer'

export interface GameContextValue {
  state: GameState
  dispatch: Dispatch<Action>
  storageError: string | null
  storageBlocked: boolean
  clearStorageError: () => void
}
export const GameContext = createContext<GameContextValue | null>(null)
