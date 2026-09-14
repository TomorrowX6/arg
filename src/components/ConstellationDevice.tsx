import { useState } from 'react'
import type { Artifact } from '../game/types'
import { starTrailStatus } from '../game/observatory'
import type { StarConfig } from '../game/observatory'
import { Icon } from './Icon'

export function ConstellationDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as StarConfig
  const [path, setPath] = useState<string[]>([config.start])
  const [feedback, setFeedback] = useState('')
  const status = starTrailStatus(config, path)
  const current = path.at(-1)!
  const nodeById = Object.fromEntries(config.nodes.map((node) => [node.id, node]))
  function go(id: string) {
    if (status.complete || id === current) return
    if (!status.available.includes(id)) {
      setFeedback('只能沿一条还没走过的连线，前往相邻星点。交叉位置不算新的星点。')
      return
    }
    const next = [...path, id]
    const after = starTrailStatus(config, next)
    setPath(next)
    setFeedback(
      !after.complete && !after.available.length
        ? '这条路线提前走到了尽头，还有星轨没有经过。可以撤回一步，留一条路最后再走。'
        : `已从 ${current} 走到 ${id}。`,
    )
  }
  return (
    <div className="constellation-device observatory-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="star" size={15} />
          每条星轨，只走一次
        </span>
        <strong>
          {status.used.size}/{config.edges.length} 条已连
        </strong>
      </div>
      <div className="constellation-sky">
        <div className="constellation-sky-caption">
          <span>WUGANG / NIGHT SURVEY</span>
          <span>
            起点 {config.start} → 终点 {config.end}
          </span>
        </div>
        <div className="constellation-chart" role="group" aria-label="可操作星图，点选相邻星点移动">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {config.edges.map(([a, b], i) => (
              <line
                key={i}
                x1={nodeById[a].x}
                y1={nodeById[a].y}
                x2={nodeById[b].x}
                y2={nodeById[b].y}
                className={status.used.has(i) ? 'used' : ''}
              />
            ))}
          </svg>
          {config.nodes.map((node) => (
            <button
              key={node.id}
              className={`star-node ${current === node.id ? 'current' : ''} ${status.available.includes(node.id) && !status.complete ? 'reachable' : ''} ${path.includes(node.id) ? 'visited' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => go(node.id)}
              aria-label={`星点 ${node.id}，${node.label}${current === node.id ? '，当前位置' : status.available.includes(node.id) ? '，可以前往' : ''}`}
              aria-pressed={current === node.id}
            >
              <Icon name="star" size={20} strokeWidth={1.4} />
              <span>{node.id}</span>
            </button>
          ))}
        </div>
        <div className="constellation-legend">
          <span>
            <i />
            尚未经过
          </span>
          <span>
            <i />
            已经连接
          </span>
          <span>交叉处不相通</span>
        </div>
      </div>
      <div className="constellation-route">
        <span>已走的路线</span>
        <p>{path.join(' → ')}</p>
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={path.length <= 1}
          onClick={() => {
            setPath(path.slice(0, -1))
            setFeedback('已退回上一颗星，刚才的连线重新可用。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一步
        </button>
        <button
          className="text-button"
          onClick={() => {
            setPath([config.start])
            setFeedback('从起点重新观测。')
          }}
        >
          <Icon name="reset" size={14} />
          重走星图
        </button>
      </div>
      <details className="constellation-text">
        <summary>查看文字版星轨</summary>
        <p>
          起点：{config.start}；终点：{config.end}。可以重复经过星点，每条连线只能使用一次。
        </p>
        <ul>
          {config.edges.map(([a, b], i) => (
            <li key={i}>
              {a} ↔ {b}
              <span>{status.used.has(i) ? '已走过' : '未经过'}</span>
            </li>
          ))}
        </ul>
        <p>
          当前位置 {current}；
          {status.available.length
            ? `可以前往 ${status.available.join('、')}`
            : '没有未使用的相邻星轨'}
          。
        </p>
      </details>
      <div className={`device-result ${status.complete ? 'is-visible' : ''}`} role="status">
        {status.complete ? (
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
