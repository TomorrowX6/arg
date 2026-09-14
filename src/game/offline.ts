import { useSyncExternalStore } from 'react'

type OfflinePhase = 'idle' | 'preparing' | 'ready' | 'error'
interface OfflineState {
  supported: boolean
  online: boolean
  phase: OfflinePhase
  completed: number
  total: number
  updateReady: boolean
  checking: boolean
  message: string
}
let state: OfflineState = {
  supported: import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator,
  online: navigator.onLine,
  phase: 'idle',
  completed: 0,
  total: 0,
  updateReady: false,
  checking: false,
  message: '',
}
const listeners = new Set<() => void>()
const base = new URL(import.meta.env.BASE_URL, window.location.href)
let registration: ServiceWorkerRegistration | undefined
let initialized = false
let reloadOnActivation = false
const watched = new WeakSet<ServiceWorker>()
const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>()
function update(value: Partial<OfflineState>) {
  state = { ...state, ...value }
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function useOffline() {
  return useSyncExternalStore(subscribe, () => state)
}
function watchWorker(worker: ServiceWorker, current: ServiceWorkerRegistration) {
  if (watched.has(worker)) return
  watched.add(worker)
  const refresh = () => {
    if (worker.state === 'installing') {
      update({ phase: current.active ? 'ready' : 'preparing', checking: true })
    }
    if (worker.state === 'installed') {
      update({
        phase: current.active ? 'ready' : 'preparing',
        updateReady: Boolean(current.active),
        checking: false,
        message: '',
      })
    }
    if (worker.state === 'activated') {
      update({
        phase: 'ready',
        updateReady: Boolean(current.waiting),
        checking: false,
        message: '',
      })
      worker.removeEventListener('statechange', refresh)
    }
    if (worker.state === 'redundant') {
      update({
        phase: current.active ? 'ready' : 'error',
        checking: false,
        message: '离线档案没有下载完整，请联网后重试。已有调查存档不受影响。',
      })
    }
  }
  worker.addEventListener('statechange', refresh)
  refresh()
}
function watchRegistration(current: ServiceWorkerRegistration) {
  registration = current
  if (watchedRegistrations.has(current)) return
  watchedRegistrations.add(current)
  update({
    phase: current.active ? 'ready' : current.installing ? 'preparing' : 'idle',
    updateReady: Boolean(current.waiting),
  })
  if (current.installing) watchWorker(current.installing, current)
  current.addEventListener('updatefound', () => {
    if (current.installing) {
      update({ completed: 0, total: 0, message: '' })
      watchWorker(current.installing, current)
    }
  })
}
export async function initializeOffline() {
  if (initialized) return
  initialized = true
  window.addEventListener('online', () => update({ online: true }))
  window.addEventListener('offline', () => update({ online: false }))
  if (!state.supported) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data?.archiveOffline) return
    if (event.data.type === 'progress') {
      update({ completed: event.data.completed, total: event.data.total })
    }
    if (event.data.type === 'ready') {
      update({ phase: 'ready', checking: false, updateReady: false, message: '' })
    }
    if (event.data.type === 'failed') {
      update({
        phase: registration?.active ? 'ready' : 'error',
        checking: false,
        message: '离线档案没有下载完整，请联网后重试。已有调查存档不受影响。',
      })
    }
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnActivation) window.location.reload()
  })
  try {
    const current = await navigator.serviceWorker.getRegistration(base.href)
    if (current?.scope === base.href) {
      watchRegistration(current)
      if (navigator.onLine) await current.update()
    }
  } catch {
    // Offline or browser-restricted update checks should not interrupt reading.
  }
}
export async function prepareOffline() {
  if (!state.supported || state.checking || state.phase === 'preparing') return
  update({
    phase: registration?.active ? 'ready' : 'preparing',
    checking: true,
    message: '',
    completed: 0,
    total: 0,
  })
  try {
    if (registration?.active) {
      await registration.update()
      if (!registration.installing && !registration.waiting) {
        update({ checking: false, message: '离线档案已经是当前版本。' })
      }
    } else {
      const current = await navigator.serviceWorker.register(new URL('sw.js', base), {
        scope: base.pathname,
        updateViaCache: 'none',
      })
      watchRegistration(current)
    }
  } catch {
    update({
      phase: registration?.active ? 'ready' : 'error',
      checking: false,
      message: '暂时无法准备离线档案，请检查网络或浏览器的存储权限后重试。',
    })
  }
}
export function activateOfflineUpdate() {
  if (!registration?.waiting) return
  reloadOnActivation = true
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
}
export async function removeOffline() {
  if (!state.supported || state.checking || state.phase === 'preparing') return
  try {
    await registration?.unregister()
    const prefix = `echo-archive-offline:${encodeURIComponent(base.href)}:`
    const names = (await caches.keys()).filter((name) => name.startsWith(prefix))
    await Promise.all(names.map((name) => caches.delete(name)))
    registration = undefined
    update({
      phase: 'idle',
      updateReady: false,
      completed: 0,
      total: 0,
      message: '离线档案包已移除。调查进度、笔记和收藏仍然保留。',
    })
  } catch {
    update({ message: '浏览器暂时无法移除离线档案，请稍后重试。' })
  }
}
