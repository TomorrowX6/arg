import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useGame } from '../game/useGame'
import { MAX_SAVE_BYTES, parseSave, readRecoverySave, serializeSave } from '../game/storage'
import type { GameState } from '../game/types'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'

export default function Settings() {
  const { state, dispatch } = useGame()
  const [resetOpen, setResetOpen] = useState(false)
  const [pending, setPending] = useState<GameState | null>(null)
  const [message, setMessage] = useState('')
  const [recovery, setRecovery] = useState(readRecoverySave)
  const fileRef = useRef<HTMLInputElement>(null)
  function exportSave() {
    const blob = new Blob([serializeSave(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `echo-archive-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('存档已导出。请妥善保留下载的 JSON 文件。')
  }
  async function importSave(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_SAVE_BYTES) {
      setMessage('存档文件过大，请选择小于 20 MB 的 JSON 存档。')
      return
    }
    try {
      setPending(parseSave(JSON.parse(await file.text())))
      setMessage('')
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes('存档')
          ? error.message
          : '存档格式无法读取，请选择从余响档案馆导出的 JSON 文件。',
      )
    }
  }
  return (
    <div className="page settings-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">YOUR WORKSPACE / PREFERENCES</div>
          <h1>按照你的节奏。</h1>
          <p>调整环境，保管进度。让调查更舒适一点。</p>
        </div>
        <Icon name="settings" size={35} strokeWidth={1.2} />
      </header>
      <section className="settings-section">
        <div className="settings-section-title">
          <Icon name="headphones" size={22} />
          <div>
            <h2>阅读与体验</h2>
            <p>任何选项都不会影响解谜内容。</p>
          </div>
        </div>
        <label className="setting-row">
          <div>
            <strong>交互音效</strong>
            <p>开关、调频和成功解谜时播放轻微声音。默认关闭。</p>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={state.settings.sound}
            onChange={(event) =>
              dispatch({ type: 'settings', settings: { sound: event.target.checked } })
            }
          />
        </label>
        <label className="setting-row">
          <div>
            <strong>减少动态效果</strong>
            <p>关闭波形、呼吸光和装饰动画。</p>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={state.settings.reducedMotion}
            onChange={(event) =>
              dispatch({ type: 'settings', settings: { reducedMotion: event.target.checked } })
            }
          />
        </label>
        <label className="setting-row">
          <div>
            <strong>增强文字对比度</strong>
            <p>加深说明文字与分隔线，减少视觉干扰。</p>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={state.settings.highContrast}
            onChange={(event) =>
              dispatch({ type: 'settings', settings: { highContrast: event.target.checked } })
            }
          />
        </label>
        <label className="setting-row">
          <div>
            <strong>较大阅读字号</strong>
            <p>增大谜面、文档和正文中的文字。</p>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={state.settings.fontSize === 'large'}
            onChange={(event) =>
              dispatch({
                type: 'settings',
                settings: { fontSize: event.target.checked ? 'large' : 'standard' },
              })
            }
          />
        </label>
      </section>
      <section className="settings-section">
        <div className="settings-section-title">
          <Icon name="archive" size={22} />
          <div>
            <h2>你的调查存档</h2>
            <p>进度保存在当前浏览器中。换设备前，可以先导出。</p>
          </div>
        </div>
        <div className="save-overview">
          <span>
            <strong>{Object.keys(state.solved).length}</strong>份档案已复原
          </span>
          <span>
            <strong>{state.notes.length}</strong>篇调查手记
          </span>
          <span>
            <strong>{state.bookmarked.length}</strong>份收藏档案
          </span>
        </div>
        <div className="save-actions">
          <button className="button button-dark" onClick={exportSave}>
            <Icon name="download" size={17} />
            导出存档
          </button>
          <button className="button button-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={17} />
            导入存档
          </button>
          <input
            type="file"
            ref={fileRef}
            accept="application/json,.json"
            aria-label="选择存档文件"
            onChange={importSave}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
        <p className="settings-note">
          <Icon name="shield" size={15} />
          存档和笔记留在你的设备，不会上传到服务器。
        </p>
        <p className="settings-message" role="status">
          {message}
        </p>
        {recovery && (
          <div className="recovery-download">
            <p>检测到一份无法读取的旧存档，原始数据仍然保留。重置前可先下载备份。</p>
            <button
              className="button button-ghost button-small"
              onClick={() => {
                const url = URL.createObjectURL(new Blob([recovery], { type: 'application/json' }))
                const link = document.createElement('a')
                link.href = url
                link.download = 'echo-archive-recovery.json'
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
              }}
            >
              <Icon name="download" size={15} />
              下载旧存档原始备份
            </button>
          </div>
        )}
      </section>
      <section className="settings-section reset-section">
        <div>
          <h2>重新开始调查</h2>
          <p>清空此设备上的进度、笔记和收藏，从第一封信开始。</p>
        </div>
        <button className="button button-ghost" onClick={() => setResetOpen(true)}>
          <Icon name="reset" size={16} />
          重置存档
        </button>
      </section>
      {resetOpen && (
        <Modal title="从第一封信重新开始？" onClose={() => setResetOpen(false)}>
          <p className="modal-description">
            当前的 {Object.keys(state.solved).length} 份通关记录、{state.notes.length}{' '}
            篇手记和全部收藏将被清除。建议先导出存档；重置后无法在这里撤销。
          </p>
          <div className="modal-actions">
            <button
              className="button button-ghost"
              onClick={() => {
                exportSave()
                setResetOpen(false)
              }}
            >
              先导出存档
            </button>
            <button
              className="button button-coral"
              onClick={() => {
                dispatch({ type: 'reset' })
                setRecovery(null)
                setResetOpen(false)
                setMessage('存档已重置。第一封信正在等你。')
              }}
            >
              确认重新开始
            </button>
          </div>
        </Modal>
      )}
      {pending && (
        <Modal title="导入这份调查存档？" onClose={() => setPending(null)}>
          <p className="modal-description">
            这份存档包含 {Object.keys(pending.solved).length} 份通关记录、{pending.notes.length}{' '}
            篇手记。导入会替换当前设备上的进度。
          </p>
          <div className="modal-actions">
            <button className="button button-ghost" onClick={() => setPending(null)}>
              取消
            </button>
            <button
              className="button button-dark"
              onClick={() => {
                dispatch({ type: 'import', state: pending })
                setPending(null)
                setMessage('存档已导入，欢迎回来。')
              }}
            >
              确认导入
              <Icon name="upload" size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
