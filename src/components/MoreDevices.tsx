import { useEffect, useRef, useState } from 'react'
import type { Artifact } from '../game/types'
import { Icon } from './Icon'
import { isConnected } from '../game/mechanics'
import { useGame } from '../game/useGame'
import { playTone } from '../game/audio'

export function RouteDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as {
    nodes: { id: string; label: string; x: number; y: number }[]
    edges: string[][]
    path: string[]
    message: string
  }
  const [path, setPath] = useState<string[]>([])
  const [feedback, setFeedback] = useState('从起点开始，依次点击相连的站点。')
  const solved = path.join(',') === config.path.join(',')
  function select(id: string) {
    if (path.length === 0 && id !== config.path[0]) {
      setFeedback(`请从${config.nodes.find((node) => node.id === config.path[0])?.label}出发。`)
      return
    }
    if (path.includes(id)) {
      setPath(path.slice(0, path.indexOf(id) + 1))
      setFeedback('线路已回退，可以继续规划。')
      return
    }
    if (path.length && !isConnected(path[path.length - 1], id, config.edges)) {
      setFeedback('这两个站点没有直接相连。请沿着线路前进。')
      return
    }
    setPath([...path, id])
    setFeedback('线路已记录。继续选择下一站，或点击已选站点回退。')
  }
  return (
    <div className="route-device">
      <div className="route-map">
        <svg viewBox="0 0 600 340" preserveAspectRatio="none" aria-hidden="true">
          {config.edges.map(([from, to]) => {
            const a = config.nodes.find((node) => node.id === from)!,
              b = config.nodes.find((node) => node.id === to)!
            const active = path.some(
              (node, i) =>
                (node === from && path[i + 1] === to) || (node === to && path[i + 1] === from),
            )
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x * 6}
                y1={a.y * 3.4}
                x2={b.x * 6}
                y2={b.y * 3.4}
                className={active ? 'active' : ''}
              />
            )
          })}
        </svg>
        {config.nodes.map((node) => (
          <button
            key={node.id}
            className={`route-station ${path.includes(node.id) ? 'selected' : ''} ${path.at(-1) === node.id ? 'current' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => select(node.id)}
            aria-label={`${node.label}${path.includes(node.id) ? '，已选' : ''}`}
            aria-pressed={path.includes(node.id)}
          >
            <span>{node.id}</span>
            <strong>{node.label}</strong>
          </button>
        ))}
      </div>
      <div className="device-controls">
        <span className="route-itinerary">
          {path.length
            ? path.map((id) => config.nodes.find((node) => node.id === id)?.label).join(' → ')
            : '尚未选择起点'}
        </span>
        <button
          className="text-button"
          onClick={() => {
            setPath([])
            setFeedback('路线已重置。')
          }}
        >
          <Icon name="reset" size={14} />
          重置
        </button>
      </div>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : feedback}
      </p>
    </div>
  )
}

export function SequenceDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { symbols: string[]; sequence: number[]; message: string }
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [input, setInput] = useState<number[]>([])
  const [feedback, setFeedback] = useState('先播放记忆，再按相同顺序点击符号。可以无限重播。')
  const [slow, setSlow] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const { state } = useGame()
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    [],
  )
  const solved = input.join(',') === config.sequence.join(',')
  function play() {
    timers.current.forEach(clearTimeout)
    setInput([])
    setPlaying(true)
    setFeedback('正在重放记忆……')
    const speed = slow ? 1400 : 800
    config.sequence.forEach((symbol, index) => {
      timers.current.push(
        setTimeout(() => {
          setActive(symbol)
          if (state.settings.sound) playTone(330 + symbol * 110, 0.3, 0.04)
        }, index * speed),
      )
      timers.current.push(setTimeout(() => setActive(-1), index * speed + speed * 0.65))
    })
    timers.current.push(
      setTimeout(() => {
        setPlaying(false)
        setFeedback('轮到你了。按刚才的顺序输入。')
      }, config.sequence.length * speed),
    )
  }
  function press(index: number) {
    if (playing || solved) return
    if (state.settings.sound) playTone(330 + index * 110, 0.15, 0.03)
    const next = [...input, index]
    if (config.sequence[input.length] !== index) {
      setInput([])
      setFeedback('顺序有些不同。已清空输入，可以再试一次或重新播放。')
    } else {
      setInput(next)
      setFeedback(`已复现 ${next.length} / ${config.sequence.length} 个符号。`)
    }
  }
  return (
    <div className="sequence-device">
      <div className="sequence-grid">
        {config.symbols.map((symbol, index) => (
          <button
            key={symbol}
            disabled={playing}
            className={active === index ? 'active' : ''}
            onClick={() => press(index)}
            aria-label={`符号 ${symbol}${active === index ? '，正在闪烁' : ''}`}
          >
            <span>{symbol}</span>
            <small>{index + 1}</small>
          </button>
        ))}
      </div>
      <div className="device-controls">
        <button className="button button-dark button-small" disabled={playing} onClick={play}>
          <Icon name="play" size={14} />
          {playing ? '播放中…' : '重放记忆'}
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={slow}
            onChange={(event) => setSlow(event.target.checked)}
          />
          慢速重放
        </label>
      </div>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : feedback}
      </p>
    </div>
  )
}

export function SortDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as {
    items: { id: string; label: string; detail: string }[]
    correct: string[]
    message: string
  }
  const [order, setOrder] = useState(config.items.map((item) => item.id))
  const solved = order.join(',') === config.correct.join(',')
  function move(index: number, delta: number) {
    const next = [...order]
    const destination = index + delta
    if (destination < 0 || destination >= next.length) return
    ;[next[index], next[destination]] = [next[destination], next[index]]
    setOrder(next)
  }
  return (
    <div className="sort-device">
      <ol className="sort-list">
        {order.map((id, index) => {
          const item = config.items.find((entry) => entry.id === id)!
          return (
            <li key={id}>
              <span className="sort-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
              <div className="sort-actions">
                <button
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`将${item.label}向前移动`}
                >
                  <Icon name="arrowLeft" size={16} />
                </button>
                <button
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`将${item.label}向后移动`}
                >
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : '使用箭头调整上下顺序。正确排列后，档案封条会自动解开。'}
      </p>
    </div>
  )
}

export function DialDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { digits: number; combination: string; message: string }
  const [values, setValues] = useState(Array.from({ length: config.digits }, () => 0))
  const solved = values.join('') === config.combination
  function turn(index: number, direction: number) {
    setValues((previous) =>
      previous.map((value, i) => (i === index ? (value + direction + 10) % 10 : value)),
    )
  }
  return (
    <div className="dial-device">
      <div className="dial-wheels">
        {values.map((value, index) => (
          <div className="dial-wheel" key={index}>
            <button onClick={() => turn(index, 1)} aria-label={`第 ${index + 1} 位增加`}>
              <Icon name="plus" size={16} />
            </button>
            <output aria-label={`第 ${index + 1} 位数字`}>{value}</output>
            <button onClick={() => turn(index, -1)} aria-label={`第 ${index + 1} 位减少`}>
              −
            </button>
            <small>{String(index + 1).padStart(2, '0')}</small>
          </div>
        ))}
      </div>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : '转动数字轮，找到正确组合。数字从 9 再增加一位会回到 0。'}
      </p>
    </div>
  )
}
