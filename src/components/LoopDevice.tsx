import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { loopEdges, loopStatus } from '../game/camp'
import type { LoopConfig, LoopEdge } from '../game/camp'
import { Icon } from './Icon'

export function LoopDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as LoopConfig
  const { rows, columns, clues } = config
  const edges = loopEdges(config)
  const [history, setHistory] = useState<number[][]>([edges.map(() => 0)])
  const [mode, setMode] = useState(1)
  const [selected, setSelected] = useState(0)
  const [feedback, setFeedback] = useState('')
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const values = history.at(-1)!
  const status = loopStatus(config, values)
  const point = (index: number) => ({
    x: ((index % (columns + 1)) + 0.5) * 100,
    y: (Math.floor(index / (columns + 1)) + 0.5) * 100,
  })
  function mark(index: number, value = mode) {
    if (status.complete) return
    const next = [...values]
    next[index] = next[index] === value ? 0 : value
    if (next[index] === values[index]) return
    setHistory([...history.slice(-199), next])
    setFeedback('')
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, edge: LoopEdge, index: number) {
    const { row, column, axis } = edge
    const target =
      axis === 'h'
        ? {
            ArrowLeft: `h${row}-${column - 1}`,
            ArrowRight: `h${row}-${column + 1}`,
            ArrowUp: `v${row - 1}-${column}`,
            ArrowDown: `v${row}-${column}`,
          }
        : {
            ArrowLeft: `h${row}-${column - 1}`,
            ArrowRight: `h${row}-${column}`,
            ArrowUp: `v${row - 1}-${column}`,
            ArrowDown: `v${row + 1}-${column}`,
          }
    if (event.key in target) {
      event.preventDefault()
      let id = target[event.key as keyof typeof target]
      if (!edges.some((item) => item.id === id)) {
        if (axis === 'v' && event.key === 'ArrowDown')
          id = `h${rows}-${Math.min(column, columns - 1)}`
        if (axis === 'v' && event.key === 'ArrowUp') id = `h0-${Math.min(column, columns - 1)}`
        if (axis === 'h' && event.key === 'ArrowRight')
          id = `v${Math.min(row, rows - 1)}-${columns}`
        if (axis === 'h' && event.key === 'ArrowLeft') id = `v${Math.min(row, rows - 1)}-0`
      }
      const next = edges.findIndex((item) => item.id === id)
      if (next >= 0) {
        setSelected(next)
        buttons.current[next]?.focus()
      }
    } else if (['l', 'x', 'Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault()
      mark(index, event.key === 'l' ? 1 : event.key === 'x' ? 2 : 0)
    }
  }
  function check() {
    if (status.clueConflicts.length) setFeedback('红色数字周围的步道太多，请擦去多余线段。')
    else if (status.branches.length)
      setFeedback('红色节点分出了三条以上的路。环线不能岔开，也不能交叉。')
    else if (status.closed && status.components > 1)
      setFeedback(`目前形成了 ${status.components} 条独立环线，需要调整为唯一一条。`)
    else if (clues.some((clue, cell) => clue !== null && status.totals[cell] !== clue))
      setFeedback('还有数字周围的步道数量不足。每个数字只统计紧贴自己的上、右、下、左四边。')
    else setFeedback('数字已经吻合，继续检查断点：所有使用的节点都应恰好连两条边，并连成同一圈。')
  }
  return (
    <div className="camp-device loop-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="map" size={16} />
          环形步道 · {rows} × {columns}
        </span>
        <strong>{status.selected} 段步道</strong>
      </div>
      <p className="camp-instruction">
        在相邻圆点之间画线，围成唯一一条不交叉、不断开的环。数字表示周围四边恰好有几段步道；空白格没有数量要求。
      </p>
      <div className="camp-marking-tools" role="group" aria-label="选择步道标记">
        <button aria-pressed={mode === 1} onClick={() => setMode(1)}>
          <span aria-hidden="true">━</span>画步道
        </button>
        <button aria-pressed={mode === 2} onClick={() => setMode(2)}>
          <span aria-hidden="true">×</span>排除线段
        </button>
        <button aria-pressed={mode === 0} onClick={() => setMode(0)}>
          <Icon name="square" size={14} />
          擦除
        </button>
      </div>
      <div
        className={`loop-board ${status.complete ? 'complete' : ''}`}
        style={{ aspectRatio: `${columns + 1}/${rows + 1}` }}
        role="group"
        aria-label="环形步道，方向键移动，L 画线，X 排除，Delete 擦除"
      >
        <svg
          viewBox={`0 0 ${(columns + 1) * 100} ${(rows + 1) * 100}`}
          className="loop-drawing"
          aria-hidden="true"
        >
          {edges.map((edge, index) => {
            const a = point(edge.a),
              b = point(edge.b)
            return (
              <g key={edge.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={values[index] === 1 ? 'drawn' : 'guide'}
                />
                {values[index] === 2 && (
                  <path
                    d={`M${(a.x + b.x) / 2 - 6} ${(a.y + b.y) / 2 - 6}l12 12m0-12l-12 12`}
                    className="excluded"
                  />
                )}
              </g>
            )
          })}
          {status.degrees.map((degree, index) => (
            <circle
              key={index}
              cx={point(index).x}
              cy={point(index).y}
              r={degree > 2 ? 6 : 4}
              className={degree > 2 ? 'branch' : degree ? 'used' : ''}
            />
          ))}
        </svg>
        {clues.map((clue, cell) => (
          <span
            key={cell}
            className={`loop-clue ${clue !== null && status.totals[cell] > clue ? 'over' : clue !== null && status.totals[cell] === clue ? 'met' : ''} ${clue === null ? 'blank' : ''}`}
            style={{
              left: `${(((cell % columns) + 1) / (columns + 1)) * 100}%`,
              top: `${((Math.floor(cell / columns) + 1) / (rows + 1)) * 100}%`,
            }}
            role="img"
            aria-label={`第 ${Math.floor(cell / columns) + 1} 行第 ${(cell % columns) + 1} 列，${clue === null ? '没有数字要求' : `需要 ${clue} 段，已画 ${status.totals[cell]} 段`}`}
          >
            {clue ?? '·'}
          </span>
        ))}
        {edges.map((edge, index) => (
          <button
            key={edge.id}
            ref={(button) => {
              buttons.current[index] = button
            }}
            className={`loop-edge ${edge.axis === 'h' ? 'horizontal' : 'vertical'} ${values[index] === 1 ? 'drawn' : ''}`}
            data-edge={edge.id}
            style={{
              left: `${((edge.column + (edge.axis === 'h' ? 1 : 0.5)) / (columns + 1)) * 100}%`,
              top: `${((edge.row + (edge.axis === 'v' ? 1 : 0.5)) / (rows + 1)) * 100}%`,
              width: edge.axis === 'h' ? `calc(${100 / (columns + 1)}% - 14px)` : '28px',
              height: edge.axis === 'v' ? `calc(${100 / (rows + 1)}% - 14px)` : '28px',
            }}
            aria-label={`${edge.axis === 'h' ? '横' : '竖'}线，第 ${edge.row + 1} 排第 ${edge.column + 1} 段，${values[index] === 1 ? '已有步道' : values[index] === 2 ? '已排除' : '未标记'}`}
            aria-pressed={values[index] === 1}
            tabIndex={selected === index ? 0 : -1}
            onFocus={() => setSelected(index)}
            onClick={() => {
              setSelected(index)
              mark(index)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              mark(index, 2)
            }}
            onKeyDown={(event) => key(event, edge, index)}
          />
        ))}
      </div>
      <div className="camp-legend">
        <span>
          <i className="loop-legend-line" />
          选定步道
        </span>
        <span>× 排除笔记</span>
        <span>· 无数量要求</span>
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
          撤回一笔
        </button>
        <button
          className="button button-ghost button-small"
          onClick={() => {
            setHistory([edges.map(() => 0)])
            setFeedback('')
          }}
        >
          <Icon name="reset" size={14} />
          重画步道
        </button>
        <button
          className="button button-ghost button-small"
          onClick={check}
          disabled={status.complete}
        >
          检查环线
        </button>
      </div>
      <p className={`device-result ${status.complete ? 'success' : ''}`} role="status">
        {status.complete
          ? config.message
          : feedback || '点击两点之间的短线段。再次点击可取消；右键或选择「排除线段」可记一个 ×。'}
      </p>
      <details className="camp-text-guide">
        <summary>查看数字坐标与线段编号</summary>
        <p>
          横线共有 {rows + 1} 排，每排 {columns} 段；竖线共有 {rows} 排，每排 {columns + 1}{' '}
          段。从上到下、从左到右编号，均从 1 开始。
        </p>
        <p>
          {clues
            .flatMap((clue, cell) =>
              clue === null
                ? []
                : [
                    `第 ${Math.floor(cell / columns) + 1} 行第 ${(cell % columns) + 1} 列是 ${clue}`,
                  ],
            )
            .join('；')}
          。
        </p>
      </details>
    </div>
  )
}
