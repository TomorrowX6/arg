import { useSyncExternalStore } from 'react'

const query = '(max-width: 900px)'
const snapshot = () => window.matchMedia(query).matches
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export function useCompact() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
