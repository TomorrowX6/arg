import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { tentStatus } from '../game/camp'
import type { TentConfig } from '../game/camp'
import { Icon } from './Icon'

export function TentDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as TentConfig
  const { size, trees } = config
  const [history, setHistory] = useState<number[][]>([Array(size * size).fill(0)])
  const [mode, setMode] = useState(1)
  const [selected, setSelected] = useState(0)
  const [feedback, setFeedback] = useState('')
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const board = history.at(-1)!
  const tents = board.flatMap((value, cell) => (value === 1 ? [cell] : []))
  const status = tentStatus(config, tents)
  function mark(cell: number, value = mode) {
    if (status.complete) return
    if (trees.includes(cell)) {
      setFeedback('树木的位置已经固定，请在旁边的空地搭帐篷。')
      return
    }
    const next = [...board]
    next[cell] = next[cell] === value ? 0 : value
    if (next[cell] === board[cell]) return
    setHistory([...history.slice(-199), next])
    setFeedback('')
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    const row = Math.floor(cell / size),
      column = cell % size
    const targets: Record<string, number> = {
      ArrowLeft: row * size + ((column + size - 1) % size),
      ArrowRight: row * size + ((column + 1) % size),
      ArrowUp: ((row + size - 1) % size) * size + column,
      ArrowDown: ((row + 1) % size) * size + column,
      Home: row * size,
      End: row * size + size - 1,
    }
    if (event.key in targets) {
      event.preventDefault()
      setSelected(targets[event.key])
      buttons.current[targets[event.key]]?.focus()
    } else if (['t', 'g', 'Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault()
      mark(cell, event.key === 't' ? 1 : event.key === 'g' ? 2 : 0)
    }
  }
  function check() {
    if (status.conflicts.length)
      setFeedback('红框内的帐篷相互接触、占了树的位置，或没有上下左右相邻的树。请先调整这些位置。')
    else if (
      status.rowTotals.some((total, row) => total > config.rowCounts[row]) ||
      status.columnTotals.some((total, column) => total > config.columnCounts[column])
    )
      setFeedback('有一行或一列的帐篷超过标注数量，红色计数指出了位置。')
    else if (status.pairs.length < tents.length)
      setFeedback('目前有帐篷无法分配到独立的一棵树。每棵树只能配一顶，请调整位置。')
    else
      setFeedback(
        `目前没有违反已检查的规则，还需要搭 ${trees.length - tents.length} 顶帐篷。草地标记只是手记，不影响完成判断。`,
      )
  }
  return (
    <div className="camp-device tents-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="tent" size={16} />
          树下营地 · {size} × {size}
        </span>
        <strong>
          {tents.length} / {trees.length} 顶帐篷
        </strong>
      </div>
      <p className="camp-instruction">
        每棵树配一顶上下左右相邻的帐篷。帐篷彼此不能接触，斜角也不行；行列外的数字是需要的顶数。
      </p>
      <div className="camp-marking-tools" role="group" aria-label="选择营地标记">
        <button aria-pressed={mode === 1} onClick={() => setMode(1)}>
          <Icon name="tent" size={16} />
          搭帐篷
        </button>
        <button aria-pressed={mode === 2} onClick={() => setMode(2)}>
          <span aria-hidden="true">×</span>标草地
        </button>
        <button aria-pressed={mode === 0} onClick={() => setMode(0)}>
          <Icon name="square" size={14} />
          擦除
        </button>
      </div>
      <div className="tent-layout" style={{ '--camp-size': size } as CSSProperties}>
        <span className="tent-corner" aria-hidden="true">
          N ↑
        </span>
        <div className="tent-column-counts">
          {config.columnCounts.map((target, column) => (
            <span
              key={column}
              className={
                status.columnTotals[column] > target
                  ? 'over'
                  : status.columnTotals[column] === target
                    ? 'met'
                    : ''
              }
              role="img"
              aria-label={`第 ${column + 1} 列需要 ${target} 顶，已放 ${status.columnTotals[column]} 顶`}
            >
              {target}
            </span>
          ))}
        </div>
        <div className="tent-row-counts">
          {config.rowCounts.map((target, row) => (
            <span
              key={row}
              className={
                status.rowTotals[row] > target
                  ? 'over'
                  : status.rowTotals[row] === target
                    ? 'met'
                    : ''
              }
              role="img"
              aria-label={`第 ${row + 1} 行需要 ${target} 顶，已放 ${status.rowTotals[row]} 顶`}
            >
              {target}
            </span>
          ))}
        </div>
        <div
          className={`tent-board ${status.complete ? 'complete' : ''}`}
          role="group"
          aria-label="营地方格，方向键移动，T 搭帐篷，G 标草地，Delete 擦除"
        >
          {board.map((value, cell) => (
            <button
              key={cell}
              ref={(button) => {
                buttons.current[cell] = button
              }}
              className={`tent-cell ${trees.includes(cell) ? 'tree' : value === 1 ? 'pitched' : value === 2 ? 'grass' : ''} ${status.conflicts.includes(cell) ? 'conflict' : ''}`}
              data-cell={cell}
              onClick={() => {
                setSelected(cell)
                mark(cell)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                mark(cell, 2)
              }}
              onKeyDown={(event) => key(event, cell)}
              onFocus={() => setSelected(cell)}
              tabIndex={selected === cell ? 0 : -1}
              aria-label={`第 ${Math.floor(cell / size) + 1} 行第 ${(cell % size) + 1} 列，${trees.includes(cell) ? '树木' : value === 1 ? '帐篷' : value === 2 ? '草地标记' : '待定空地'}${status.conflicts.includes(cell) ? '，位置冲突' : ''}`}
            >
              {trees.includes(cell) ? (
                <Icon name="tree" size={29} />
              ) : value === 1 ? (
                <Icon name="tent" size={29} />
              ) : value === 2 ? (
                <span aria-hidden="true">×</span>
              ) : (
                <span className="tent-grass-dot" aria-hidden="true">
                  ·
                </span>
              )}
            </button>
          ))}
          {status.complete && (
            <svg
              className="tent-pairing"
              viewBox={`0 0 ${size * 100} ${size * 100}`}
              aria-hidden="true"
            >
              {status.pairs.map(({ tree, tent }) => (
                <line
                  key={tree}
                  x1={((tree % size) + 0.5) * 100}
                  y1={(Math.floor(tree / size) + 0.5) * 100}
                  x2={((tent % size) + 0.5) * 100}
                  y2={(Math.floor(tent / size) + 0.5) * 100}
                />
              ))}
            </svg>
          )}
        </div>
      </div>
      <div className="camp-legend">
        <span>
          <Icon name="tree" size={15} />
          固定树木
        </span>
        <span>
          <Icon name="tent" size={15} />
          待安置的帐篷
        </span>
        <span>× 仅作草地笔记</span>
      </div>
      <div className="mini-actions">
        <button
          className="button button-ghost button-small"
          onClick={() => {
            setHistory(history.slice(0, -1))
            setFeedback('')
          }}
          disabled={history.length < 2}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一步
        </button>
        <button
          className="button button-ghost button-small"
          onClick={() => {
            setHistory([Array(size * size).fill(0)])
            setFeedback('')
          }}
        >
          <Icon name="reset" size={14} />
          重置营地
        </button>
        <button
          className="button button-ghost button-small"
          onClick={check}
          disabled={status.complete}
        >
          检查营地
        </button>
      </div>
      <p className={`device-result ${status.complete ? 'success' : ''}`} role="status">
        {status.complete
          ? config.message
          : feedback || '点击格子放置当前标记；再次点击可取消。先从需要 0 顶的行列开始。'}
      </p>
      <details className="camp-text-guide">
        <summary>查看文字坐标与配对规则</summary>
        <p>
          树木位于：
          {trees
            .map((cell) => `第 ${Math.floor(cell / size) + 1} 行第 ${(cell % size) + 1} 列`)
            .join('；')}
          。
        </p>
        <p>
          每顶帐篷分配给一棵相邻的树，每棵树也只分配一顶。若帐篷紧邻多棵树，只要整体能一对一配好即可。草地无需全部标完。
        </p>
      </details>
    </div>
  )
}
