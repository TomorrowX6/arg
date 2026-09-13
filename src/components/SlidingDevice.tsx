import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { slideTile } from '../game/mechanics'
import { Icon } from './Icon'

export function SlidingDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { size: number; initial: number[]; message: string }
  const [history, setHistory] = useState<number[][]>([config.initial])
  const [showReference, setShowReference] = useState(false)
  const [feedback, setFeedback] = useState('把 1 到 8 按顺序排列，右下角留空。')
  const board = history[history.length - 1]
  const blank = board.indexOf(0)
  const solved = board.every((tile, index) => tile === (index + 1) % (config.size * config.size))
  const image = `${import.meta.env.BASE_URL}assets/window.svg`
  function move(index: number) {
    const next = slideTile(board, config.size, index)
    if (next === board) {
      setFeedback('这块画片没有紧邻空格。只能移动空格上下左右的画片。')
      return
    }
    setHistory((previous) => [...previous.slice(-499), next])
    setFeedback('画片已移动。可以继续操作，或撤销上一步。')
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowUp: -config.size,
      ArrowDown: config.size,
      ArrowLeft: -1,
      ArrowRight: 1,
    }
    if (Object.hasOwn(offsets, event.key)) {
      event.preventDefault()
      move(blank + offsets[event.key])
    }
  }
  return (
    <div className="sliding-device">
      <div className="device-top">
        <span>
          MEMORY WINDOW / {config.size} × {config.size}
        </span>
        <span>{history.length - 1} 次移动</span>
      </div>
      <div
        className="sliding-grid"
        onKeyDown={keyDown}
        style={{ gridTemplateColumns: `repeat(${config.size},1fr)` }}
      >
        {board.map((tile, index) =>
          tile === 0 ? (
            <div key="blank" className="sliding-blank" aria-label="空格">
              <span>+</span>
            </div>
          ) : (
            <button
              key={tile}
              onClick={() => move(index)}
              className={`sliding-tile ${slideTile(board, config.size, index) !== board ? 'movable' : ''}`}
              aria-label={`画片 ${tile}`}
              style={{
                backgroundImage: `url("${image}")`,
                backgroundSize: `${config.size * 100}% ${config.size * 100}%`,
                backgroundPosition: `${(((tile - 1) % config.size) / (config.size - 1)) * 100}% ${(Math.floor((tile - 1) / config.size) / (config.size - 1)) * 100}%`,
              }}
            >
              <span>{tile}</span>
            </button>
          ),
        )}
      </div>
      <div className="sliding-controls">
        <button
          className="text-button"
          disabled={history.length === 1}
          onClick={() => setHistory((previous) => previous.slice(0, -1))}
        >
          <Icon name="arrowLeft" size={14} />
          撤销
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([config.initial])
            setFeedback('拼图已回到初始状态。')
          }}
        >
          <Icon name="reset" size={14} />
          重置拼图
        </button>
        <button
          className="text-button"
          onClick={() => setShowReference(!showReference)}
          aria-expanded={showReference}
        >
          <Icon name="eye" size={14} />
          {showReference ? '收起参考图' : '查看参考图'}
        </button>
      </div>
      {showReference && (
        <figure className="sliding-reference">
          <img src={image} alt="参考图：窗外是一座临海城市，一轮太阳从灯塔上方升起。" />
          <figcaption>数字从左到右：1、2、3 / 4、5、6 / 7、8、空格</figcaption>
        </figure>
      )}
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : feedback}
      </p>
      <p className="sliding-keyboard-note">画片获得焦点后，也可以用方向键移动空格。</p>
    </div>
  )
}
