import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { Artifact } from '../game/types'
import { moveRopeNode, untangleStatus } from '../game/untangle'
import type { Point, UntangleConfig } from '../game/untangle'
import { Icon } from './Icon'
import '../styles/untangle.css'

export function UntangleDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as UntangleConfig
  const initial = () => config.nodes.map(({ x, y }) => ({ x, y }))
  const first = Math.max(
    0,
    config.nodes.findIndex((node) => !node.fixed),
  )
  const [history, setHistory] = useState<Point[][]>([initial()])
  const [preview, setPreview] = useState<Point[] | null>(null)
  const [selected, setSelected] = useState(first)
  const [coordinates, setCoordinates] = useState({
    x: String(config.nodes[first].x),
    y: String(config.nodes[first].y),
  })
  const [feedback, setFeedback] = useState('')
  const board = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLButtonElement | null)[]>([])
  const dragging = useRef<{ index: number; points: Point[] } | null>(null)
  const points = preview ?? history.at(-1)!
  const status = untangleStatus(config, points)
  const complete = status.complete && !preview
  const current = config.nodes[selected]
  const endpoints = config.edges.map(([a, b]) => [
    config.nodes.findIndex((node) => node.id === a),
    config.nodes.findIndex((node) => node.id === b),
  ])
  function select(index: number, positions = points) {
    setSelected(index)
    setCoordinates({ x: String(positions[index].x), y: String(positions[index].y) })
    setFeedback('')
  }
  function commit(next: Point[]) {
    const previous = history.at(-1)!
    if (next.every((point, i) => point.x === previous[i].x && point.y === previous[i].y)) return
    setHistory([...history.slice(-199), next])
    setFeedback('')
  }
  function move(index: number, point: Point) {
    const next = moveRopeNode(config, history.at(-1)!, index, point)
    commit(next)
    select(index, next)
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0) return
    select(index)
    event.currentTarget.focus()
    if (config.nodes[index].fixed) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = { index, points: history.at(-1)! }
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || !board.current) return
    const bounds = board.current.getBoundingClientRect()
    const point = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    }
    const next = moveRopeNode(config, dragging.current.points, dragging.current.index, point)
    dragging.current.points = next
    setPreview(next)
    const current = next[dragging.current.index]
    setCoordinates({ x: String(current.x), y: String(current.y) })
  }
  function pointerEnd(cancel = false) {
    const drag = dragging.current
    if (!drag) return
    dragging.current = null
    if (!cancel) commit(drag.points)
    setPreview(null)
    select(drag.index, cancel ? history.at(-1)! : drag.points)
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const vectors: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    if (event.key in vectors) {
      event.preventDefault()
      const [dx, dy] = vectors[event.key],
        step = event.shiftKey ? 10 : 2
      move(index, { x: points[index].x + dx * step, y: points[index].y + dy * step })
    }
  }
  function applyCoordinates() {
    const x = Number(coordinates.x),
      y = Number(coordinates.y)
    if (
      !coordinates.x.trim() ||
      !coordinates.y.trim() ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 8 ||
      x > 92 ||
      y < 8 ||
      y > 92
    ) {
      setFeedback('横、纵坐标都需要在 8 到 92 之间，让圆牌留在舞台里。')
      return
    }
    move(selected, { x, y })
  }
  return (
    <div className="untangle-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="sparkles" size={15} />
          纸上排演 · {config.nodes.length} 枚圆牌
        </span>
        <strong>{complete ? '所有绳线已解开' : `交叉 ${status.crossings.length} 组`}</strong>
      </div>
      <p className="untangle-instruction">
        拖动圆牌，让绳线不再交叉。圆牌不能重叠，绳线不能穿过无关圆牌；同一圆牌上的线可以相接。
      </p>
      <div
        className={`untangle-board ${complete ? 'complete' : ''}`}
        ref={board}
        role="group"
        aria-label="剧场绳线，拖动圆牌；Tab 选择圆牌，方向键移动，Shift 加大步幅"
      >
        <span className="untangle-stage-label" aria-hidden="true">
          REHEARSAL / THE SMALL STAGE
        </span>
        <svg viewBox="0 0 100 100" className="untangle-ropes" aria-hidden="true">
          <path d="M8 95Q50 89 92 95M10 97Q50 92 90 97" className="untangle-stage" />
          {endpoints.map(([a, b], index) => (
            <line
              key={index}
              x1={points[a].x}
              y1={points[a].y}
              x2={points[b].x}
              y2={points[b].y}
              className={status.badEdges.includes(index) ? 'tangled' : 'clear'}
            />
          ))}
        </svg>
        {config.nodes.map((node, index) => (
          <button
            key={node.id}
            ref={(button) => {
              nodes.current[index] = button
            }}
            className={`untangle-node ${selected === index ? 'selected' : ''} ${node.fixed ? 'fixed' : ''} ${status.badNodes.includes(index) ? 'obstructed' : ''}`}
            style={{ left: `${points[index].x}%`, top: `${points[index].y}%` }}
            data-node={node.id}
            aria-label={`绳结 ${node.id}，${node.label}${node.fixed ? '，固定支点' : ''}，横坐标 ${points[index].x}，纵坐标 ${points[index].y}`}
            aria-pressed={selected === index}
            onFocus={() => {
              if (!dragging.current) select(index)
            }}
            onClick={() => select(index)}
            onPointerDown={(event) => pointerDown(event, index)}
            onPointerMove={pointerMove}
            onPointerUp={() => pointerEnd()}
            onPointerCancel={() => pointerEnd(true)}
            onKeyDown={(event) => key(event, index)}
          >
            <span>{node.id}</span>
            {node.fixed && <Icon name="lock" size={9} />}
          </button>
        ))}
      </div>
      <div className="untangle-legend">
        <span>
          <i />
          已理顺
        </span>
        <span>
          <i />
          交叉或穿过圆牌
        </span>
        <span>圆牌重叠 {status.overlaps.length} 组</span>
      </div>
      <div className="untangle-controls">
        <div className="untangle-selection">
          <Icon name={current.fixed ? 'lock' : 'circle'} size={16} />
          <strong>
            {current.id} · {current.label}
          </strong>
          <span>{current.fixed ? '固定支点' : '当前选中'}</span>
        </div>
        <div className="untangle-position">
          <label>
            横坐标
            <input
              type="number"
              aria-label="绳结横坐标"
              min="8"
              max="92"
              step="0.1"
              value={coordinates.x}
              disabled={current.fixed}
              onChange={(event) => setCoordinates({ ...coordinates, x: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyCoordinates()
              }}
            />
          </label>
          <label>
            纵坐标
            <input
              type="number"
              aria-label="绳结纵坐标"
              min="8"
              max="92"
              step="0.1"
              value={coordinates.y}
              disabled={current.fixed}
              onChange={(event) => setCoordinates({ ...coordinates, y: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyCoordinates()
              }}
            />
          </label>
          <button
            className="button button-ghost button-small"
            onClick={applyCoordinates}
            disabled={current.fixed}
          >
            移动到坐标
          </button>
        </div>
        <p>横向从左到右、纵向从上到下。范围 8–92；键盘每次移动 2，按住 Shift 移动 10。</p>
      </div>
      <div className="untangle-actions">
        <button
          className="button button-ghost button-small"
          disabled={history.length < 2 || !!preview}
          onClick={() => {
            const next = history.slice(0, -1)
            setHistory(next)
            select(selected, next.at(-1)!)
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一次移动
        </button>
        <button
          className="button button-ghost button-small"
          onClick={() => {
            dragging.current = null
            setPreview(null)
            const next = initial()
            setHistory([next])
            select(first, next)
          }}
        >
          <Icon name="reset" size={14} />
          恢复最初绳线
        </button>
        <span>可撤回 {history.length - 1} 步</span>
      </div>
      <p className={`device-result ${complete ? 'success' : ''}`} role="status">
        {complete
          ? config.message
          : feedback ||
            (status.overlaps.length
              ? '圆牌叠到一起了，先把它们分开。'
              : status.blocked.length
                ? '有绳线穿过了无关圆牌，移动圆牌让出一点空间。'
                : '红线标出需要理顺的位置。可以拖动，也可以选择圆牌后填写坐标。')}
      </p>
      <details className="untangle-text">
        <summary>查看绳线的文字连接表</summary>
        <p>{config.edges.map(([a, b]) => `${a}—${b}`).join('；')}。</p>
        <p>可以有很多种摆法，只要所有几何规则满足就会完成。移动不会改变圆牌之间的连接关系。</p>
      </details>
    </div>
  )
}
