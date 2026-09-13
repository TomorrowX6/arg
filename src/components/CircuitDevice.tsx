import { useState } from 'react'
import type { Artifact } from '../game/types'
import { rotateWire, traceCircuit } from '../game/mechanics'
import { Icon } from './Icon'

const arms = [
  { bit: 1, path: 'M50 50V0', name: '上' },
  { bit: 2, path: 'M50 50H100', name: '右' },
  { bit: 4, path: 'M50 50V100', name: '下' },
  { bit: 8, path: 'M50 50H0', name: '左' },
]
export function CircuitDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { size: number; initial: number[]; message: string }
  const [board, setBoard] = useState(config.initial)
  const [moves, setMoves] = useState(0)
  const { powered, connected } = traceCircuit(board, config.size)
  function rotate(index: number) {
    setBoard((previous) => previous.map((mask, i) => (i === index ? rotateWire(mask) : mask)))
    setMoves((count) => count + 1)
  }
  return (
    <div className="circuit-device">
      <div className="device-top">
        <span>
          SIGNAL ROUTER / {config.size} × {config.size}
        </span>
        <span>{moves} 次旋转</span>
      </div>
      <div className="circuit-housing">
        <span className="circuit-input-label">IN →</span>
        <div className="circuit-grid" style={{ gridTemplateColumns: `repeat(${config.size},1fr)` }}>
          {board.map((mask, index) => (
            <button
              key={index}
              className={powered.has(index) ? 'powered' : ''}
              onClick={() => rotate(index)}
              aria-label={`线路 ${index + 1}，第 ${Math.floor(index / config.size) + 1} 行第 ${(index % config.size) + 1} 列，连接${arms
                .filter((arm) => mask & arm.bit)
                .map((arm) => arm.name)
                .join('、')}，顺时针旋转`}
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                {arms
                  .filter((arm) => mask & arm.bit)
                  .map((arm) => (
                    <path key={arm.bit} d={arm.path} />
                  ))}
                <circle cx="50" cy="50" r="9" />
              </svg>
              <span>{String(index + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
        <span className={`circuit-output-label ${connected ? 'connected' : ''}`}>→ OUT</span>
      </div>
      <div className="device-controls">
        <span>
          <span className={`status-dot ${connected ? '' : 'dim'}`} />
          {connected ? '输出端已接通信号' : `${powered.size} 格线路已通电`}
        </span>
        <button
          className="text-button"
          onClick={() => {
            setBoard(config.initial)
            setMoves(0)
          }}
        >
          <Icon name="reset" size={14} />
          重置线路
        </button>
      </div>
      <p className={`device-message ${connected ? 'revealed' : ''}`} role="status">
        {connected
          ? config.message
          : '点击线块，顺时针旋转 90°。从左上角左侧输入，连接到右下角右侧输出；不必点亮每一格。'}
      </p>
    </div>
  )
}
