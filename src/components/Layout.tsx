import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { mainPuzzles, puzzles, getStatus } from '../data/archive'
import { useGame } from '../game/useGame'
import { useCompact } from '../game/useCompact'
import { useOffline } from '../game/offline'

const nav = [
  { to: '/', icon: 'grid', label: '调查工作台', end: true },
  { to: '/archives', icon: 'archive', label: '档案目录' },
  { to: '/evidence', icon: 'fingerprint', label: '证据墙' },
  { to: '/map', icon: 'map', label: '雾港地图' },
  { to: '/notes', icon: 'book', label: '调查手记' },
]
const names: Record<string, string> = {
  '/': '调查工作台',
  '/archives': '档案目录',
  '/evidence': '证据墙',
  '/map': '雾港地图',
  '/notes': '调查手记',
  '/settings': '偏好设置',
  '/field': '异常接收站',
  '/about': '入馆须知',
  '/ending': '明天的选择',
  '/tools': '解码工具箱',
}

export function Layout() {
  const { state, dispatch, storageError, storageBlocked, clearStorageError } = useGame()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const compact = useCompact()
  const offline = useOffline()
  const sidebarRef = useRef<HTMLElement>(null)
  const completed = mainPuzzles.filter((puzzle) => state.solved[puzzle.id]).length
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, location.search])
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMobileOpen(false)
        setSearchOpen((open) => !open)
      }
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
  useEffect(() => {
    const close = () => {
      setMobileOpen(false)
      setSearchOpen(false)
    }
    window.addEventListener('popstate', close)
    window.addEventListener('hashchange', close)
    return () => {
      window.removeEventListener('popstate', close)
      window.removeEventListener('hashchange', close)
    }
  }, [])
  useEffect(() => {
    if (!compact || !mobileOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const controls = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      )
    controls()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = controls(),
        first = elements[0],
        last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', trap)
      previousFocus?.focus()
    }
  }, [compact, mobileOpen])
  const results = puzzles
    .filter((puzzle) =>
      `${puzzle.title}${puzzle.subtitle}${puzzle.tags.join('')}${puzzle.id}${String(puzzle.number).padStart(3, '0')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 10)
  const title = location.pathname.startsWith('/case/')
    ? '档案阅览室'
    : (names[location.pathname] ?? '余响档案馆')
  return (
    <div className={`app-shell ${location.pathname.startsWith('/case/') ? 'reading-case' : ''}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        跳到主要内容
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="点击遮罩关闭导航"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? 'is-open' : ''}`}
        aria-label="主导航"
        inert={compact && !mobileOpen}
        aria-hidden={compact && !mobileOpen ? true : undefined}
        role={compact && mobileOpen ? 'dialog' : undefined}
        aria-modal={compact && mobileOpen ? true : undefined}
        onClick={(event) => {
          if ((event.target as Element).closest('a')) setMobileOpen(false)
        }}
      >
        {compact && (
          <button
            className="mobile-nav-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="关闭导航"
          >
            <Icon name="x" size={18} />
          </button>
        )}
        <Link to="/" className="brand" aria-label="余响档案馆首页">
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>
              余响档案馆<span className="brand-dot">.</span>
            </strong>
            <small>THE ECHO ARCHIVE</small>
          </span>
        </Link>
        <div className="sidebar-label">
          调查空间 <span>WORKSPACE</span>
        </div>
        <nav className="main-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.to === '/archives' && (
                <small>{puzzles.length.toString().padStart(2, '0')}</small>
              )}
              {item.to === '/evidence' && Object.keys(state.solved).length > 0 && (
                <span className="nav-dot" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">
          保持好奇 <span>EXPLORE</span>
        </div>
        <NavLink to="/field" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="radio" size={19} />
          <span>异常接收站</span>
          <span className="tiny-live">LIVE</span>
        </NavLink>
        <NavLink to="/tools" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="key" size={19} />
          <span>解码工具箱</span>
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="help" size={19} />
          <span>入馆须知</span>
          <Icon name="arrowUpRight" size={14} />
        </NavLink>
        <div className="sidebar-transmission">
          <div className="transmission-label">
            <span className="status-dot" />
            持续监听中<span>103.7 FM</span>
          </div>
          <div className="waveform">
            {Array.from({ length: 37 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${10 + ((i * 17 + i * i * 7) % 31)}px`,
                  animationDelay: `${i * -0.11}s`,
                }}
              />
            ))}
          </div>
          <p>“如果你听见了，请不要离开。”</p>
          <small>最后接收于 23:17:00</small>
        </div>
        <div className="sidebar-bottom">
          <div className="agent-avatar">临</div>
          <div>
            <strong>临时档案员</strong>
            <span>NO. 014 — 夜班</span>
          </div>
          <Link to="/settings" className="sidebar-settings" aria-label="偏好设置">
            <Icon name="settings" size={18} />
          </Link>
        </div>
      </aside>
      <div className="workspace" inert={compact && mobileOpen}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="打开导航"
              aria-expanded={mobileOpen}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb-root">雾港调查计划</span>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-current">{title}</span>
          </div>
          <div className="topbar-right">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="搜索档案"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Icon name="search" size={16} />
              <span>搜索档案</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button sound-toggle"
              onClick={() =>
                dispatch({ type: 'settings', settings: { sound: !state.settings.sound } })
              }
              aria-label={state.settings.sound ? '关闭音效' : '开启音效'}
              aria-pressed={state.settings.sound}
            >
              <Icon name={state.settings.sound ? 'volume' : 'muted'} size={18} />
            </button>
            <Link
              to="/settings"
              className={`connection ${offline.online ? '' : 'is-offline'}`}
              aria-label={offline.online ? '在线浏览，打开离线设置' : '当前离线，打开离线设置'}
            >
              <span className="status-dot" />
              <span>
                {offline.online ? (offline.updateReady ? '新档案已就绪' : '在线浏览') : '离线浏览'}
              </span>
            </Link>
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            <Icon name="help" size={18} />
            <span>{storageError}</span>
            <button className="icon-button" onClick={clearStorageError} aria-label="关闭存档提醒">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <span className="loading-orbit" />
                正在调取档案…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <footer className="site-footer">
          <span>
            © 余响档案馆 <span className="footer-dot">·</span> 一个关于记忆的互动谜案
          </span>
          <span className="footer-status">
            <span className="status-dot" />
            {storageBlocked || storageError ? '请手动导出调查存档' : '档案自动保存于此设备'}{' '}
            <span className="footer-dot">·</span> {completed}/{mainPuzzles.length} 已复原
          </span>
          <Link to="/about">
            保持怀疑，保持好奇 <Icon name="arrowUpRight" size={13} />
          </Link>
        </footer>
      </div>
      {searchOpen && (
        <Modal title="搜索档案" onClose={() => setSearchOpen(false)} className="search-modal">
          <label className="search-field">
            <Icon name="search" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="档案名称、编号或关键词…"
              aria-label="搜索档案"
            />
          </label>
          <div className="search-results">
            {results.length ? (
              results.map((puzzle) => (
                <Link
                  to={`/case/${puzzle.id}`}
                  key={puzzle.id}
                  onClick={() => setSearchOpen(false)}
                >
                  <span className="mono">{String(puzzle.number).padStart(3, '0')}</span>
                  <div>
                    <strong>{puzzle.title}</strong>
                    <small>{puzzle.tags.join(' / ')}</small>
                  </div>
                  <Icon
                    name={getStatus(puzzle, state) === 'locked' ? 'lock' : 'arrowRight'}
                    size={16}
                  />
                </Link>
              ))
            ) : (
              <p className="empty-search">没有找到这份档案。试试「信号」「密码」或编号。</p>
            )}
          </div>
          <p className="modal-footnote">按 Esc 关闭 · 已封存的档案需要先完成前置调查</p>
        </Modal>
      )}
    </div>
  )
}
