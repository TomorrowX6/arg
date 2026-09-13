import { useCallback, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { readSave, RECOVERY_KEY, STORAGE_KEY } from './storage'
import { gameReducer } from './reducer'
import type { Action } from './reducer'
import { GameContext } from './context'

export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readSave)
  const [state, rawDispatch] = useReducer(gameReducer, initial.state)
  const [storageError, setStorageError] = useState(initial.error)
  const [writeBlocked, setWriteBlocked] = useState(initial.writeBlocked)
  const dispatch = useCallback((action: Action) => {
    if (action.type === 'import' || action.type === 'reset') {
      setWriteBlocked(false)
      setStorageError(null)
    }
    if (action.type === 'reset') {
      try {
        localStorage.removeItem(RECOVERY_KEY)
      } catch {
        /* A blocked storage API is reported by the persistence effect. */
      }
    }
    rawDispatch(action)
  }, [])
  useEffect(() => {
    if (writeBlocked) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // This effect reports an actual failure of the browser persistence API.
      // oxlint-disable-next-line react/set-state-in-effect
      setStorageError('浏览器暂时无法保存进度。请在设置中导出存档，避免关闭页面后丢失。')
    }
  }, [state, writeBlocked])
  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full'
    document.documentElement.dataset.contrast = state.settings.highContrast ? 'high' : 'normal'
    document.documentElement.dataset.fontSize = state.settings.fontSize
  }, [state.settings])
  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        storageError,
        storageBlocked: writeBlocked,
        clearStorageError: () => setStorageError(null),
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
