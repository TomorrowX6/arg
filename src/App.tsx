import { Component, Suspense, lazy } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { GameProvider } from './game/GameContext'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import '@fontsource-variable/noto-serif-sc/wght.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './styles/base.css'
import './styles/dashboard.css'
import './styles/game.css'
import './styles/pages.css'
import './styles/responsive.css'

const Archives = lazy(() => import('./pages/Archives'))
const PuzzlePage = lazy(() => import('./pages/PuzzlePage'))
const Evidence = lazy(() => import('./pages/Evidence'))
const MapPage = lazy(() => import('./pages/MapPage'))
const Notes = lazy(() => import('./pages/Notes'))
const FieldStation = lazy(() => import('./pages/FieldStation'))
const Settings = lazy(() => import('./pages/Settings'))
const About = lazy(() => import('./pages/About'))
const Ending = lazy(() => import('./pages/Ending'))

class ArchiveBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Archive interface error', error, info.componentStack)
  }
  render() {
    return this.state.failed ? (
      <div className="recovery-screen">
        <span>THE ECHO ARCHIVE</span>
        <h1>信号暂时中断了。</h1>
        <p>已保存的调查进度仍保留在这个浏览器中。刷新页面，重新连接档案馆。</p>
        <button className="button button-dark" onClick={() => window.location.reload()}>
          重新连接
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
function Loading() {
  return (
    <div className="page-loading" role="status">
      <span className="loading-orbit" />
      <span>正在调取档案…</span>
    </div>
  )
}
export default function App() {
  return (
    <ArchiveBoundary>
      <GameProvider>
        <HashRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="archives" element={<Archives />} />
                <Route path="case/:id" element={<PuzzlePage />} />
                <Route path="evidence" element={<Evidence />} />
                <Route path="map" element={<MapPage />} />
                <Route path="notes" element={<Notes />} />
                <Route path="field" element={<FieldStation />} />
                <Route path="settings" element={<Settings />} />
                <Route path="about" element={<About />} />
                <Route path="ending" element={<Ending />} />
                <Route
                  path="*"
                  element={
                    <div className="page not-found">
                      <span className="eyebrow">404 / LOST SIGNAL</span>
                      <h1>这里没有留下信号。</h1>
                      <p>回到工作台，继续你未完成的调查。</p>
                      <Link to="/" className="button button-dark">
                        返回工作台
                      </Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </GameProvider>
    </ArchiveBoundary>
  )
}
