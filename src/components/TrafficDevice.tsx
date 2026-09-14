import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { moveTraffic, trafficComplete, trafficInitial } from '../game/observatory'
import type { TrafficConfig } from '../game/observatory'
import { Icon } from './Icon'

export function TrafficDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as TrafficConfig
  const [history, setHistory] = useState<number[][]>([trafficInitial(config)])
  const [selected, setSelected] = useState(0)
  const [feedback, setFeedback] = useState('')
  const positions = history.at(-1)!
  const complete = trafficComplete(config, positions)
  const vehicle = config.vehicles[selected]
  const target = config.vehicles.find((item) => item.id === config.target)!
  const directions = [
    { key: 'ArrowLeft', label: '向左', axis: 'h', delta: -1, icon: 'arrowLeft' },
    { key: 'ArrowUp', label: '向上', axis: 'v', delta: -1, icon: 'arrowDown', turn: true },
    { key: 'ArrowDown', label: '向下', axis: 'v', delta: 1, icon: 'arrowDown' },
    { key: 'ArrowRight', label: '向右', axis: 'h', delta: 1, icon: 'arrowRight' },
  ]
  function move(index: number, delta: number) {
    if (complete) return
    const next = moveTraffic(config, positions, index, delta)
    if (!next) {
      setFeedback('这个方向已被其他轨架或边界挡住。先给它留出位置。')
      return
    }
    const item = config.vehicles[index]
    const direction = item.axis === 'h' ? (delta > 0 ? '右' : '左') : delta > 0 ? '下' : '上'
    setHistory([...history, next])
    setFeedback(`${item.id} 号轨架向${direction}移动一格。`)
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = directions.find((item) => item.key === event.key)
    if (!direction) return
    event.preventDefault()
    if (config.vehicles[index].axis !== direction.axis) {
      setFeedback('轨架不能转弯，只能沿自身的长边前后移动。')
      return
    }
    move(index, direction.delta)
  }
  return (
    <div className="traffic-device observatory-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="compass" size={15} />
          观测滑轨 · 主镜 T
        </span>
        <strong>{history.length - 1} 次移动</strong>
      </div>
      <p className="observatory-instruction">
        将珊瑚色主镜 T 移到右侧观测窗。轨架只能沿长边移动，不能旋转或越过彼此。
      </p>
      <div className="traffic-stage">
        <div
          className="traffic-board"
          style={{ '--traffic-size': config.size } as React.CSSProperties}
          role="group"
          aria-label="观测滑轨棋盘，选择轨架后用方向键或下方按钮移动"
        >
          {Array.from({ length: config.size * config.size }, (_, i) => (
            <i
              className="traffic-cell-number"
              key={i}
              style={{
                left: `${((i % config.size) / config.size) * 100}%`,
                top: `${(Math.floor(i / config.size) / config.size) * 100}%`,
              }}
              aria-hidden="true"
            >
              {Math.floor(i / config.size) + 1}·{(i % config.size) + 1}
            </i>
          ))}
          {config.vehicles.map((item, index) => {
            const row = item.axis === 'v' ? positions[index] : item.row
            const column = item.axis === 'h' ? positions[index] : item.column
            return (
              <button
                key={item.id}
                className={`traffic-vehicle axis-${item.axis} palette-${index % 4} ${item.id === config.target ? 'target' : ''} ${index === selected ? 'selected' : ''}`}
                style={{
                  left: `calc(${(column / config.size) * 100}% + 3px)`,
                  top: `calc(${(row / config.size) * 100}% + 3px)`,
                  width: `calc(${((item.axis === 'h' ? item.length : 1) / config.size) * 100}% - 6px)`,
                  height: `calc(${((item.axis === 'v' ? item.length : 1) / config.size) * 100}% - 6px)`,
                }}
                aria-label={`${item.id} 号轨架，${item.label}，${item.axis === 'h' ? '横向' : '纵向'}，第 ${row + 1} 行第 ${column + 1} 列，长 ${item.length} 格`}
                aria-pressed={index === selected}
                onClick={() => {
                  setSelected(index)
                  setFeedback('')
                }}
                onFocus={() => setSelected(index)}
                onKeyDown={(event) => key(event, index)}
              >
                <span>{item.id}</span>
                <i aria-hidden="true" />
                {item.id === config.target && <Icon name="search" size={18} />}
              </button>
            )
          })}
          <div
            className="traffic-exit"
            style={{ top: `${((target.row + 0.5) / config.size) * 100}%` }}
            aria-hidden="true"
          >
            <Icon name="arrowRight" size={15} />
            <span>观测窗</span>
          </div>
        </div>
      </div>
      <div className="traffic-selection">
        <span>
          <b>{vehicle.id}</b>
          {vehicle.label}
        </span>
        <small>{vehicle.axis === 'h' ? '沿横向滑轨左右移动' : '沿纵向滑轨上下移动'}</small>
      </div>
      <div className="traffic-directions">
        {directions.map((direction) => (
          <button
            key={direction.label}
            disabled={
              complete ||
              direction.axis !== vehicle.axis ||
              !moveTraffic(config, positions, selected, direction.delta)
            }
            onClick={() => move(selected, direction.delta)}
            aria-label={`轨架${direction.label}移动`}
          >
            <span className={direction.turn ? 'turn-up' : ''}>
              <Icon name={direction.icon} size={19} />
            </span>
            {direction.label}
          </button>
        ))}
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length <= 1}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setFeedback('已撤回上一次移动。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一步
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([trafficInitial(config)])
            setSelected(0)
            setFeedback('所有轨架回到了原位。')
          }}
        >
          <Icon name="reset" size={14} />
          重置滑轨
        </button>
      </div>
      <details className="traffic-log">
        <summary>查看移动记录</summary>
        {history.length === 1 ? (
          <p>选择一副轨架，开始安排观测路径。</p>
        ) : (
          <ol tabIndex={0} aria-label="轨架移动记录">
            {history.slice(1).map((next, i) => {
              const index = next.findIndex((position, n) => position !== history[i][n])
              const item = config.vehicles[index]
              const positive = next[index] > history[i][index]
              return (
                <li key={i}>
                  {item.id} 号轨架向
                  {item.axis === 'h' ? (positive ? '右' : '左') : positive ? '下' : '上'}移动一格
                </li>
              )
            })}
          </ol>
        )}
      </details>
      <div className={`device-result ${complete ? 'is-visible' : ''}`} role="status">
        {complete ? (
          <>
            <Icon name="check" size={17} />
            {config.message}
          </>
        ) : (
          feedback
        )}
      </div>
    </div>
  )
}
