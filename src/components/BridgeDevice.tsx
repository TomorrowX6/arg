import { useState } from 'react'
import type { Artifact } from '../game/types'
import { crossBridge } from '../game/fairground'
import type { BridgeState } from '../game/fairground'
import { Icon } from './Icon'

interface BridgeConfig {
  people: { label: string; time: number }[]
  budget: number
  banks?: [string, string]
  message: string
}
interface Crossing {
  state: BridgeState
  people: number[]
  cost: number
}
export function BridgeDevice({ artifact }: { artifact: Artifact }) {
  const {
    people,
    budget,
    banks = ['公园侧', '车站侧'],
    message,
  } = artifact.config as unknown as BridgeConfig
  const initial: BridgeState = { sides: people.map(() => 0), lamp: 0, elapsed: 0 }
  const [history, setHistory] = useState<Crossing[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [feedback, setFeedback] = useState('')
  const current = history.at(-1)?.state ?? initial
  const solved = current.sides.every((side) => side === 1) && current.elapsed <= budget
  const cost = selected.length ? Math.max(...selected.map((person) => people[person].time)) : 0
  function select(index: number) {
    if (solved || current.sides[index] !== current.lamp) return
    if (selected.includes(index)) setSelected(selected.filter((person) => person !== index))
    else if (selected.length < 2) setSelected([...selected, index])
    else {
      setFeedback('桥一次最多供两人通过。先取消一位，再选择其他人。')
      return
    }
    setFeedback('')
  }
  function cross() {
    if (solved) return
    const next = crossBridge(
      current,
      selected,
      people.map((person) => person.time),
    )
    if (!next) {
      setFeedback('请选择与提灯同侧的一位或两位同行者。')
      return
    }
    if (next.elapsed > budget) {
      setFeedback(
        `这次需要 ${cost} 分钟，但灯油只剩 ${budget - current.elapsed} 分钟。可以撤回，重新安排返回的人。`,
      )
      return
    }
    setHistory([...history, { state: next, people: [...selected], cost }])
    setSelected([])
    setFeedback(
      `${selected.map((index) => people[index].label).join('与')}抵达${banks[next.lamp]}，用时 ${cost} 分钟。`,
    )
  }
  return (
    <div className="bridge-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="lightbulb" size={15} />
          一盏灯，照到最后一个人
        </span>
        <strong>{history.length} 次过桥</strong>
      </div>
      <div className="bridge-clock">
        <div>
          <span>已经用时</span>
          <strong>
            {String(current.elapsed).padStart(2, '0')}
            <small>分钟</small>
          </strong>
        </div>
        <div
          className="bridge-oil"
          role="meter"
          aria-label="剩余灯油"
          aria-valuemin={0}
          aria-valuemax={budget}
          aria-valuenow={budget - current.elapsed}
        >
          <Icon name="lightbulb" size={26} />
          <span style={{ height: `${((budget - current.elapsed) / budget) * 100}%` }} />
        </div>
        <div>
          <span>灯油可用</span>
          <strong>
            {String(budget - current.elapsed).padStart(2, '0')}
            <small>分钟</small>
          </strong>
        </div>
      </div>
      <div className="bridge-landscape" aria-hidden="true">
        <svg viewBox="0 0 480 95">
          <path d="M0 55h85m310 0h85" className="bridge-ground" />
          <path d="M79 14v67m322-67v67M80 29Q240 116 400 29" className="bridge-rope" />
          <path d="M80 60H400" className="bridge-deck" />
          {Array.from({ length: 9 }, (_, index) => (
            <path key={index} d={`M${96 + index * 36} 59v13`} className="bridge-plank" />
          ))}
          <path d="M141 91q22-12 44 0t44 0t44 0t44 0t44 0" className="bridge-water" />
        </svg>
        <span className={current.lamp === 0 ? 'on-left' : 'on-right'}>
          <Icon name="lightbulb" size={18} />
        </span>
      </div>
      <div className="bridge-banks">
        {banks.map((bank, side) => (
          <fieldset key={bank}>
            <legend>
              {bank}
              {current.lamp === side && (
                <span>
                  <Icon name="lightbulb" size={12} />
                  灯在这里
                </span>
              )}
            </legend>
            {people.some((_, index) => current.sides[index] === side) ? (
              people.map(
                (person, index) =>
                  current.sides[index] === side && (
                    <button
                      key={index}
                      className={selected.includes(index) ? 'selected' : ''}
                      disabled={solved || current.lamp !== side}
                      onClick={() => select(index)}
                      aria-pressed={selected.includes(index)}
                      aria-label={`${person.label}，${person.time} 分钟，${bank}`}
                    >
                      <span className="bridge-person-mark">{person.label.slice(-1)}</span>
                      <span>
                        {person.label}
                        <small>{person.time} 分钟</small>
                      </span>
                      <span className="bridge-person-check">
                        {selected.includes(index) ? <Icon name="check" size={13} /> : '+'}
                      </span>
                    </button>
                  ),
              )
            ) : (
              <p>这一侧暂时没有人。</p>
            )}
          </fieldset>
        ))}
      </div>
      <div className="bridge-plan">
        <span>
          {selected.length
            ? `${selected.map((index) => people[index].label).join(' + ')} · 本次 ${cost} 分钟`
            : '选择与提灯同侧的一至两人'}
        </span>
        <button
          className="button button-dark button-small"
          onClick={cross}
          disabled={solved || !selected.length}
        >
          {current.lamp === 0 ? `前往${banks[1]}` : `返回${banks[0]}`}
          <Icon name={current.lamp === 0 ? 'arrowRight' : 'arrowLeft'} size={14} />
        </button>
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={!history.length}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setSelected([])
            setFeedback('已撤回上一次过桥，灯油同时恢复。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回过桥
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([])
            setSelected([])
            setFeedback('所有人回到起点，灯油重新装满。')
          }}
        >
          <Icon name="reset" size={14} />
          重新安排
        </button>
      </div>
      {history.length > 0 && (
        <ol className="bridge-history" aria-label="过桥记录">
          {history.map((record, index) => (
            <li key={index}>
              <span>{index + 1}</span>
              <p>
                {record.people.map((person) => people[person].label).join('、')}
                <small>
                  {record.state.lamp === 1 ? '前往' : '返回'}
                  {banks[record.state.lamp]}
                </small>
              </p>
              <strong>
                +{record.cost}
                <small>共 {record.state.elapsed} 分钟</small>
              </strong>
            </li>
          ))}
        </ol>
      )}
      <p className="mini-feedback" role="status">
        {feedback}
      </p>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved
          ? message
          : `每次过桥需要提灯同行，两人同行按较慢者用时。让所有人在 ${budget} 分钟内抵达${banks[1]}。`}
      </p>
    </div>
  )
}
