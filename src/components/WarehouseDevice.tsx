import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { isWarehouseSolved, moveWarehouse, parseWarehouse } from '../game/miniGames'
import type { MoveDirection, WarehouseState } from '../game/miniGames'
import { Icon } from './Icon'

const directionKeys: Record<string, MoveDirection> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  d: 'right',
  s: 'down',
  a: 'left',
}
const controls: { direction: MoveDirection; label: string; icon: string }[] = [
  { direction: 'up', label: '向上移动', icon: 'arrowUpRight' },
  { direction: 'left', label: '向左移动', icon: 'arrowLeft' },
  { direction: 'down', label: '向下移动', icon: 'arrowDown' },
  { direction: 'right', label: '向右移动', icon: 'arrowRight' },
]

export function WarehouseDevice({ artifact }: { artifact: Artifact }) {
  const { layout, message } = artifact.config as { layout: string[]; message: string }
  const warehouse = useMemo(() => parseWarehouse(layout), [layout])
  const [history, setHistory] = useState<WarehouseState[]>([warehouse.start])
  const [feedback, setFeedback] = useState('')
  const state = history.at(-1)!
  const solved = isWarehouseSolved(warehouse, state)
  const placed = state.boxes.filter((box) => warehouse.goals.includes(box)).length
  function move(direction: MoveDirection) {
    if (solved) return
    const next = moveWarehouse(warehouse, state, direction)
    if (next === state) {
      setFeedback('这个方向被挡住了。箱子只能向空格推动，不能拉回。')
      return
    }
    setHistory([...history, next])
    setFeedback('')
  }
  function keyboard(event: KeyboardEvent) {
    const direction = directionKeys[event.key]
    if (direction && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      move(direction)
    }
  }
  return (
    <div className="warehouse-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="archive" size={15} />
          已入库 {placed} / {warehouse.goals.length}
        </span>
        <strong>{history.length - 1} 步</strong>
      </div>
      <p className="warehouse-instructions" id="warehouse-instructions">
        点方向按钮，或先选中棋盘再用方向键 /
        WASD。绿色圆点是你，木箱只能推动；把每个箱子推到圆环目标格。
      </p>
      <div
        className="warehouse-grid"
        style={{ gridTemplateColumns: `repeat(${warehouse.width},1fr)` }}
        tabIndex={0}
        onKeyDown={keyboard}
        role="group"
        aria-label="推箱子棋盘"
        aria-describedby="warehouse-instructions"
      >
        {Array.from({ length: warehouse.width * warehouse.height }, (_, position) => {
          const wall = warehouse.walls.includes(position),
            goal = warehouse.goals.includes(position),
            box = state.boxes.includes(position),
            player = state.player === position
          return (
            <div
              key={position}
              aria-hidden="true"
              className={`warehouse-cell ${wall ? 'warehouse-wall' : ''} ${goal ? 'warehouse-goal' : ''} ${box ? 'warehouse-box' : ''} ${player ? 'warehouse-player' : ''}`}
            >
              {wall ? (
                <span className="wall-lines" />
              ) : box ? (
                <span className={`warehouse-crate ${goal ? 'on-goal' : ''}`}>
                  <i />
                  <b>{goal ? '✓' : ''}</b>
                </span>
              ) : player ? (
                <span className="warehouse-agent">
                  <i />
                </span>
              ) : goal ? (
                <span className="warehouse-target" />
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        你在第 {Math.floor(state.player / warehouse.width) + 1} 行、第{' '}
        {(state.player % warehouse.width) + 1} 列。箱子位置：
        {state.boxes
          .map(
            (box) =>
              `${Math.floor(box / warehouse.width) + 1} 行 ${(box % warehouse.width) + 1} 列`,
          )
          .join('；')}
        。目标格：
        {warehouse.goals
          .map(
            (goal) =>
              `${Math.floor(goal / warehouse.width) + 1} 行 ${(goal % warehouse.width) + 1} 列`,
          )
          .join('；')}
        。
      </p>
      <div className="warehouse-lower">
        <div className="warehouse-legend">
          <span>
            <i className="legend-player" />
            档案员
          </span>
          <span>
            <i className="legend-box" />
            箱子
          </span>
          <span>
            <i className="legend-goal" />
            目标
          </span>
        </div>
        <div className="direction-pad" role="group" aria-label="移动方向">
          {controls.map((control) => (
            <button
              key={control.direction}
              className={`direction-${control.direction}`}
              aria-label={control.label}
              onClick={() => move(control.direction)}
              disabled={solved}
            >
              <Icon name={control.icon} size={22} />
            </button>
          ))}
        </div>
      </div>
      <p className="mini-feedback" role="status">
        {feedback}
      </p>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length === 1}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setFeedback('已撤回一步。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一步
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([warehouse.start])
            setFeedback('箱子已放回原位。')
          }}
        >
          <Icon name="reset" size={14} />
          重置仓库
        </button>
      </div>
      <output className={`device-message ${solved ? 'revealed' : ''}`} aria-live="polite">
        {solved ? message : '不要把箱子推入没有目标的角落；推错时可以撤回。'}
      </output>
    </div>
  )
}
