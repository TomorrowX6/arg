import { useState } from 'react'
import type { Artifact } from '../game/types'
import { Icon } from './Icon'

export function RevealDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { text: string; message: string }
  const [lit, setLit] = useState(false)
  return (
    <div className="reveal-device">
      <div className={`uv-paper ${lit ? 'lit' : ''}`}>
        <div className="uv-corners" />
        <span className="uv-paper-id">MAINTENANCE NOTE / 023</span>
        <div className="uv-ink" aria-hidden={!lit}>
          {config.text.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        {!lit && <span className="uv-blank">普通光照下，纸面没有可辨认的字迹。</span>}
        <span className="uv-wavelength">{lit ? 'UV 365nm / ACTIVE' : 'VISIBLE LIGHT / 550nm'}</span>
      </div>
      <div className="device-controls">
        <button
          className={`button ${lit ? 'button-ghost' : 'button-dark'} button-small`}
          onClick={() => setLit(!lit)}
          aria-pressed={lit}
        >
          <Icon name={lit ? 'sun' : 'eye'} size={16} />
          {lit ? '关闭显影灯' : '开启显影灯'}
        </button>
        <span>{lit ? '隐藏批注已显影' : '整页扫描 · 无需拖动'}</span>
      </div>
      <p className={`device-message ${lit ? 'revealed' : ''}`} role="status">
        {lit ? config.message : '把灯打开。也许这张纸比看上去更诚实。'}
      </p>
    </div>
  )
}
