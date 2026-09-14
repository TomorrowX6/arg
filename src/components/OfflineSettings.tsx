import { useEffect, useState } from 'react'
import { activateOfflineUpdate, prepareOffline, removeOffline, useOffline } from '../game/offline'
import { Icon } from './Icon'

export function OfflineSettings() {
  const offline = useOffline()
  const [size, setSize] = useState('约 7 MB')
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}offline-info.json`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (info && typeof info.bytes === 'number')
          setSize(`${(info.bytes / 1048576).toFixed(1)} MB`)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  const ready = offline.phase === 'ready'
  const preparing = offline.phase === 'preparing' || offline.checking
  const progress = offline.total ? Math.round((offline.completed / offline.total) * 100) : 0
  return (
    <section className="settings-section offline-settings">
      <div className="settings-section-title">
        <Icon name="download" size={22} />
        <div>
          <h2>把档案馆带在身边</h2>
          <p>下载全部关卡与物证，断网时也能继续调查。</p>
        </div>
      </div>
      <div className="offline-package">
        <div className={`offline-seal ${ready ? 'is-ready' : ''}`}>
          <Icon name={ready ? 'checks' : 'archive'} size={29} strokeWidth={1.4} />
        </div>
        <div>
          <strong>
            {ready ? '离线档案已就绪' : preparing ? '正在收好每一份档案…' : '余响档案馆 · 随身副本'}
          </strong>
          <p>包含故事、交互机关、字体和可下载的原始物证 · {size}</p>
          <span>
            {offline.online ? '当前在线' : '当前离线'}
            {ready ? ' · 进度仍自动保存在此设备' : ''}
          </span>
        </div>
      </div>
      {preparing && (
        <div className="offline-progress">
          <progress
            max={100}
            value={offline.total ? progress : undefined}
            aria-label="离线档案下载进度"
          />
          <span role="status">
            {offline.total
              ? `${offline.completed} / ${offline.total} 份资源 · ${progress}%`
              : '正在核对档案清单…'}
          </span>
        </div>
      )}
      {offline.supported ? (
        <div className="offline-actions">
          {offline.updateReady ? (
            <button className="button button-dark" onClick={activateOfflineUpdate}>
              <Icon name="reset" size={16} />
              载入新档案并刷新
            </button>
          ) : (
            <button
              className="button button-dark"
              onClick={prepareOffline}
              disabled={!offline.online || preparing}
            >
              <Icon name={ready ? 'reset' : 'download'} size={16} />
              {ready ? '检查档案更新' : '准备离线档案'}
            </button>
          )}
          {ready && !preparing && (
            <button className="text-button" onClick={removeOffline} disabled={!offline.online}>
              移除离线档案包
            </button>
          )}
        </div>
      ) : (
        <p className="settings-note">
          {import.meta.env.DEV
            ? '离线下载在正式网站和构建预览中开放。'
            : '当前浏览器未开放离线存储，联网时仍可完整游玩。'}
        </p>
      )}
      <p className="settings-note">
        联网时会准备新的档案版本，由你决定何时刷新。清理浏览器数据会移除离线副本，请另行导出调查存档。
      </p>
      <p className="settings-message" role="status">
        {offline.message ||
          (offline.updateReady ? '新档案已经准备好，刷新后即可开始。未提交的答案请先记下。' : '')}
      </p>
    </section>
  )
}
