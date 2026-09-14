import { useState } from 'react'
import type { Artifact } from '../game/types'
import { orbitalAlignment, orbitalPhase } from '../game/observatory'
import type { OrbitalGear } from '../game/observatory'
import { Icon } from './Icon'

interface OrbitalConfig {
  gears: OrbitalGear[]
  steps: number[]
  message: string
}
export function OrbitalDevice({ artifact }: { artifact: Artifact }) {
  const { gears, steps, message } = artifact.config as unknown as OrbitalConfig
  const [history, setHistory] = useState([0])
  const [feedback, setFeedback] = useState('')
  const current = history.at(-1)!
  const cycle = orbitalAlignment(gears)?.cycle ?? 1
  const phases = gears.map((gear) => orbitalPhase(gear, current))
  const complete = phases.every((phase) => phase === 0)
  function setTime(minute: number) {
    if (!Number.isInteger(minute) || minute < 0 || minute >= cycle) {
      setFeedback(`请在第一个完整周期内调查，范围为 0–${cycle - 1} 分钟。`)
      return
    }
    if (minute === current) return
    setHistory([...history, minute])
    setFeedback('')
  }
  return (
    <div className="orbital-device observatory-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="orbit" size={15} />
          不同的周期，同一个零点
        </span>
        <strong>完整周期 {cycle} 分钟</strong>
      </div>
      <div className="orbital-clocks">
        {gears.map((gear, index) => {
          const phase = phases[index],
            angle = (phase / gear.period) * Math.PI * 2
          return (
            <article key={gear.label} className={phase === 0 ? 'aligned' : ''}>
              <h3>{gear.label}</h3>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="43" className="orbit-rim" />
                <circle cx="50" cy="50" r="34" className="orbit-inner" />
                {Array.from({ length: gear.period }, (_, n) => {
                  const theta = (n / gear.period) * Math.PI * 2
                  return (
                    <circle
                      key={n}
                      cx={50 + Math.sin(theta) * 37}
                      cy={50 - Math.cos(theta) * 37}
                      r={n === 0 ? 3.1 : 1.4}
                      className={n === 0 ? 'orbit-zero' : 'orbit-tick'}
                    />
                  )
                })}
                <line
                  x1="50"
                  y1="50"
                  x2={50 + Math.sin(angle) * 29}
                  y2={50 - Math.cos(angle) * 29}
                  className="orbit-hand"
                />
                <circle cx="50" cy="50" r="4" className="orbit-hub" />
              </svg>
              <strong>
                {phase}
                <span> / {gear.period}</span>
              </strong>
              <p>每 {gear.period} 分钟绕回零点</p>
            </article>
          )
        })}
      </div>
      <div className="orbital-time">
        <label htmlFor="orbital-minute">
          已经过多少分钟
          <input
            id="orbital-minute"
            type="number"
            inputMode="numeric"
            min={0}
            max={cycle - 1}
            value={current}
            onChange={(event) => setTime(Number(event.target.value))}
          />
        </label>
        <span>
          每推进 1 分钟，所有指针前进一格。
          <br />
          不需要等待现实时间。
        </span>
      </div>
      <div className="orbital-steps">
        {steps.map((step) => (
          <button
            key={step}
            className="button button-ghost button-small"
            onClick={() => setTime(current + step)}
            disabled={current + step >= cycle}
          >
            + {step} 分钟
          </button>
        ))}
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length <= 1}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setFeedback('已撤回上一次推进。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回推进
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([0])
            setFeedback('回到最初的指针位置。')
          }}
        >
          <Icon name="reset" size={14} />
          重置时钟
        </button>
      </div>
      <div className="orbital-state" role="status">
        {gears.map((gear, i) => `${gear.label}：${phases[i]}`).join(' · ')}
        {complete ? ' · 三针归零' : ''}
      </div>
      <div className={`device-result ${complete ? 'is-visible' : ''}`} role="status">
        {complete ? (
          <>
            <Icon name="check" size={17} />
            {message}
          </>
        ) : (
          feedback
        )}
      </div>
    </div>
  )
}
