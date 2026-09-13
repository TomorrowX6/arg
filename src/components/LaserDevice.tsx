import { useId, useState } from 'react'
import type { Artifact } from '../game/types'
import { traceLaser } from '../game/fairground'
import type { BeamPoint, LaserBoard, MirrorTilt } from '../game/fairground'
import { Icon } from './Icon'

export function LaserDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as LaserBoard & { message: string }
  const [history, setHistory] = useState<MirrorTilt[][]>([
    config.mirrors.map((mirror) => mirror.tilt),
  ])
  const tilts = history.at(-1)!
  const trace = traceLaser(config, tilts)
  const glow = useId().replace(/:/g, '')
  const unit = 64,
    padding = 48,
    extent = config.size * unit + padding * 2
  const coordinate = (point: BeamPoint) => ({
    x: padding + (point.x + 0.5) * unit,
    y: padding + (point.y + 0.5) * unit,
  })
  const source = coordinate(config.source),
    exit = coordinate(config.exit)
  function port(point: BeamPoint) {
    if (point.y < 0) return `上侧第 ${point.x + 1} 列`
    if (point.y >= config.size) return `下侧第 ${point.x + 1} 列`
    return `${point.x < 0 ? '左' : '右'}侧第 ${point.y + 1} 行`
  }
  function flip(index: number) {
    if (config.mirrors[index].fixed) return
    setHistory((previous) => [
      ...previous.slice(-499),
      tilts.map((tilt, i) => (i === index ? (tilt === '/' ? '\\' : '/') : tilt)),
    ])
  }
  const description = trace.solved
    ? config.message
    : trace.ending === 'loop'
      ? '光线正在一条封闭回路中打转。翻转其中一面镜子，为它找到出口。'
      : trace.ending === 'wall'
        ? '光线被挡板截住了。沿着亮起的轨迹，找到需要调整的转角。'
        : trace.ending === 'exit'
          ? `光已到达出口，还有 ${config.receivers.length - trace.receivers.length} 个接收器没有亮起。`
          : '光线离开了棋盘，但还没有抵达出口。点击镜面，改变它的反射方向。'
  return (
    <div className="laser-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="sun" size={15} />
          光会记得来时的路
        </span>
        <strong>{history.length - 1} 次翻转</strong>
      </div>
      <div className="laser-ports">
        <span>光源：{port(config.source)}</span>
        <span>出口：{port(config.exit)}</span>
      </div>
      <div className={`laser-board ${trace.solved ? 'complete' : ''}`}>
        <svg className="laser-beam-layer" viewBox={`0 0 ${extent} ${extent}`} aria-hidden="true">
          <defs>
            <filter id={glow}>
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <polyline
            className="laser-glow"
            points={trace.points
              .map((point) => {
                const p = coordinate(point)
                return `${p.x},${p.y}`
              })
              .join(' ')}
            filter={`url(#${glow})`}
          />
          <polyline
            className="laser-beam"
            points={trace.points
              .map((point) => {
                const p = coordinate(point)
                return `${p.x},${p.y}`
              })
              .join(' ')}
          />
          <circle cx={source.x} cy={source.y} r="10" className="laser-source" />
          <circle cx={source.x} cy={source.y} r="3" fill="#fff4d1" />
          <rect
            x={exit.x - 10}
            y={exit.y - 10}
            width="20"
            height="20"
            rx="4"
            className={`laser-exit ${trace.ending === 'exit' ? 'lit' : ''}`}
          />
          {trace.ending === 'exit' && (
            <path
              d={`M${exit.x - 5} ${exit.y}l3 4l7 -8`}
              fill="none"
              stroke="#fff4d1"
              strokeWidth="2"
            />
          )}
        </svg>
        <div
          className="laser-grid"
          role="group"
          aria-label="镜面光路棋盘"
          style={{
            inset: `${(padding / extent) * 100}%`,
            gridTemplateColumns: `repeat(${config.size},1fr)`,
          }}
        >
          {Array.from({ length: config.size ** 2 }, (_, cell) => {
            const index = config.mirrors.findIndex((mirror) => mirror.cell === cell)
            const receiver = config.receivers.indexOf(cell)
            const position = `第 ${Math.floor(cell / config.size) + 1} 行第 ${(cell % config.size) + 1} 列`
            if (index >= 0) {
              const mirror = config.mirrors[index]
              const shape = (
                <>
                  <small>{cell + 1}</small>
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <line
                      x1="13"
                      y1={tilts[index] === '/' ? 51 : 13}
                      x2="51"
                      y2={tilts[index] === '/' ? 13 : 51}
                    />
                    <circle cx="32" cy="32" r="3" />
                  </svg>
                </>
              )
              return mirror.fixed ? (
                <div
                  key={cell}
                  className="laser-mirror fixed"
                  role="img"
                  aria-label={`${position}，固定镜面 ${tilts[index]}`}
                >
                  {shape}
                </div>
              ) : (
                <button
                  key={cell}
                  className="laser-mirror"
                  onClick={() => flip(index)}
                  aria-label={`镜面 ${cell + 1}，${position}，${tilts[index] === '/' ? '正斜线' : '反斜线'}，点击翻转`}
                >
                  {shape}
                </button>
              )
            }
            if (config.walls.includes(cell))
              return (
                <div key={cell} className="laser-wall" role="img" aria-label={`${position}，挡板`}>
                  <span>×</span>
                </div>
              )
            if (receiver >= 0)
              return (
                <div
                  key={cell}
                  className={`laser-receiver ${trace.receivers.includes(cell) ? 'lit' : ''}`}
                  role="img"
                  aria-label={`${position}，接收器 ${String.fromCharCode(65 + receiver)}，${trace.receivers.includes(cell) ? '已亮起' : '未亮起'}`}
                >
                  <span>{String.fromCharCode(65 + receiver)}</span>
                </div>
              )
            return (
              <div key={cell} className="laser-empty" aria-hidden="true">
                <span>·</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="laser-legend">
        <span>
          <i className="mirror" />
          镜面可翻转
        </span>
        <span>
          <i className="receiver" />
          接收器 {trace.receivers.length}/{config.receivers.length}
        </span>
        <span>
          <i className="beam" />
          光线轨迹
        </span>
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length === 1}
          onClick={() => setHistory((previous) => previous.slice(0, -1))}
        >
          <Icon name="arrowLeft" size={14} />
          撤回翻转
        </button>
        <button
          className="text-button"
          onClick={() => setHistory([config.mirrors.map((mirror) => mirror.tilt)])}
        >
          <Icon name="reset" size={14} />
          重置光路
        </button>
      </div>
      <p className={`device-message ${trace.solved ? 'revealed' : ''}`} role="status">
        {description}
      </p>
      <details className="laser-text-route">
        <summary>
          文字版光路与棋盘
          <Icon name="chevronDown" size={14} />
        </summary>
        <p>
          格子从左到右、从上到下编号。光源位于{port(config.source)}，出口位于{port(config.exit)}
          。斜线 / 与反斜线 \ 都将光反射 90°。
        </p>
        <p>当前经过：{trace.cells.map((cell) => cell + 1).join(' → ') || '尚未进入棋盘'}。</p>
        <p>
          接收器位于{' '}
          {config.receivers
            .map((cell, index) => `${String.fromCharCode(65 + index)}：${cell + 1} 号`)
            .join('；')}
          。
          {config.walls.length
            ? `挡板位于 ${config.walls.map((cell) => cell + 1).join('、')} 号。`
            : '没有挡板。'}
        </p>
      </details>
    </div>
  )
}
