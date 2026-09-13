import { useState } from 'react'
import type { Artifact } from '../game/types'
import { crossRiver } from '../game/miniGames'
import type { FerryState } from '../game/miniGames'
import { Icon } from './Icon'

export function FerryDevice({ artifact }: { artifact: Artifact }) {
  const { passengers, conflicts, message } = artifact.config as {
    passengers: { label: string; symbol: string }[]
    conflicts: number[][]
    message: string
  }
  const initial: FerryState = { boat: 0, sides: passengers.map(() => 0) }
  const [history, setHistory] = useState<FerryState[]>([initial])
  const [cargo, setCargo] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const current = history.at(-1)!
  const solved = current.sides.every((side) => side === 1) && current.boat === 1
  function sail() {
    const result = crossRiver(current, cargo, conflicts)
    if (result.error) {
      setFeedback('选择与摆渡员在同一岸的乘客。')
      return
    }
    if (result.conflict) {
      const [a, b] = result.conflict
      setFeedback(
        `这次出航会把${passengers[a].label}与${passengers[b].label}留在无人照看的岸上。船还没开，换一种安排。`,
      )
      return
    }
    setHistory([...history, result.state])
    setCargo(null)
    setFeedback(
      `${cargo === null ? '空船' : `带着${passengers[cargo].label}`}抵达${result.state.boat === 1 ? '东岸' : '西岸'}。`,
    )
  }
  return (
    <div className="ferry-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="map" size={15} />
          摆渡员在{current.boat ? '东' : '西'}岸
        </span>
        <strong>已渡河 {history.length - 1} 次</strong>
      </div>
      <div className="river-scene">
        {[0, 1].map((bank) => (
          <div className={`river-bank river-bank-${bank}`} key={bank}>
            <h4>{bank ? '东岸 · 目的地' : '西岸 · 出发地'}</h4>
            <div>
              {passengers.map(
                (passenger, index) =>
                  current.sides[index] === bank && (
                    <span className="river-passenger" key={index}>
                      <span aria-hidden="true">{passenger.symbol}</span>
                      {passenger.label}
                    </span>
                  ),
              )}
            </div>
            {current.boat === bank && (
              <span className="river-keeper">
                <Icon name="compass" size={15} />
                摆渡员
              </span>
            )}
          </div>
        ))}
        <div className="river-water" aria-hidden="true">
          <span>~ ~ ~</span>
          <span>~ ~ ~</span>
          <span>~ ~ ~</span>
          <div className={`river-boat boat-at-${current.boat}`}>
            <svg viewBox="0 0 90 50">
              <path d="M8 29H83L69 43H26Z" fill="#8f6a48" />
              <path d="M15 25H76V29H15Z" fill="#d3b783" />
              <path d="M44 25V6M44 7L67 23H44Z" fill="#e1dbc0" stroke="#748269" strokeWidth="2" />
              <path
                d="M5 48Q21 42 36 48T68 48T91 48"
                fill="none"
                stroke="#82aaa0"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="ferry-rules">
        <span className="eyebrow">无人照看时，这些组合不能同岸</span>
        {conflicts.map(([a, b]) => (
          <p key={`${a}-${b}`}>
            <span>
              {passengers[a].symbol} {passengers[a].label}
            </span>
            <Icon name="x" size={13} />
            <span>
              {passengers[b].symbol} {passengers[b].label}
            </span>
          </p>
        ))}
      </div>
      <div className="ferry-cargo" role="group" aria-label="选择本次渡河乘客">
        <p>船上除了摆渡员，还能带一位。也可以空船返回。</p>
        <div>
          <button
            aria-pressed={cargo === null}
            className={cargo === null ? 'selected' : ''}
            onClick={() => setCargo(null)}
            disabled={solved}
          >
            空船
          </button>
          {passengers.map((passenger, index) => (
            <button
              key={index}
              aria-pressed={cargo === index}
              className={cargo === index ? 'selected' : ''}
              onClick={() => setCargo(index)}
              disabled={solved || current.sides[index] !== current.boat}
            >
              {passenger.symbol} {passenger.label}
            </button>
          ))}
        </div>
      </div>
      <button className="button button-dark" onClick={sail} disabled={solved}>
        出航至{current.boat ? '西岸' : '东岸'}
        <Icon name={current.boat ? 'arrowLeft' : 'arrowRight'} size={16} />
      </button>
      <p className="mini-feedback" role="status">
        {feedback}
      </p>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length === 1}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setCargo(null)
            setFeedback('已撤回上一次渡河。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一次
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([initial])
            setCargo(null)
            setFeedback('已回到出发时。')
          }}
        >
          <Icon name="reset" size={14} />
          重新摆渡
        </button>
      </div>
      <output className={`device-message ${solved ? 'revealed' : ''}`} aria-live="polite">
        {solved ? message : '把所有乘客安全带到东岸。摆渡员在场时，任何组合都安全。'}
      </output>
    </div>
  )
}
