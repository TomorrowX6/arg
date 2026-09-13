import { useState } from 'react'
import type { Artifact } from '../game/types'
import { changeJugs, JUG_ACTIONS } from '../game/miniGames'
import type { JugAction, JugState } from '../game/miniGames'
import { Icon } from './Icon'

const jugLabels: Record<JugAction, string> = {
  fill0: '装满甲壶',
  fill1: '装满乙壶',
  empty0: '倒空甲壶',
  empty1: '倒空乙壶',
  pour01: '甲壶倒入乙壶',
  pour10: '乙壶倒入甲壶',
}

export function JugDevice({ artifact }: { artifact: Artifact }) {
  const {
    capacity = [5, 3],
    targetJug = 0,
    target = 4,
    message,
  } = artifact.config as { capacity: JugState; targetJug: number; target: number; message: string }
  const [history, setHistory] = useState<{ state: JugState; action?: JugAction }[]>([
    { state: [0, 0] },
  ])
  const current = history.at(-1)!.state
  const solved = current[targetJug] === target
  function act(action: JugAction) {
    const state = changeJugs(current, capacity, action)
    if (state.some((n, i) => n !== current[i])) setHistory([...history, { state, action }])
  }
  return (
    <div className="jug-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="grid" size={15} />
          目标：{['甲', '乙'][targetJug]}壶恰好 {target} 升
        </span>
        <strong>{history.length - 1} 次操作</strong>
      </div>
      <div className="jug-pair">
        {capacity.map((volume, index) => (
          <div className="jug-column" key={index}>
            <div className="jug-label">
              <strong>{['甲', '乙'][index]}壶</strong>
              <span>容量 {volume} L</span>
            </div>
            <div
              className="jug-vessel"
              role="img"
              aria-label={`${['甲', '乙'][index]}壶当前 ${current[index]} 升，容量 ${volume} 升`}
            >
              <div
                className="jug-water"
                style={{ height: `${(current[index] / volume) * 100}%` }}
              />
              <div className="jug-ticks">
                {Array.from({ length: volume }, (_, i) => (
                  <span key={i} style={{ bottom: `${((i + 1) / volume) * 100}%` }}>
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="jug-value">
                {current[index]}
                <small>L</small>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mini-help">
        壶上的读数由检验台估算。你只能装满、倒空，或把一壶倒向另一壶，直到源壶空了或目标壶满了。
      </p>
      <div className="jug-buttons">
        {JUG_ACTIONS.map((action) => (
          <button
            className="button button-ghost button-small"
            key={action}
            onClick={() => act(action)}
            disabled={
              solved || changeJugs(current, capacity, action).every((n, i) => n === current[i])
            }
          >
            <Icon
              name={
                action.startsWith('fill')
                  ? 'plus'
                  : action.startsWith('empty')
                    ? 'arrowDown'
                    : 'arrowRight'
              }
              size={14}
            />
            {jugLabels[action]}
          </button>
        ))}
      </div>
      <div className="jug-history" aria-live="polite">
        <span className="eyebrow">最近操作</span>
        <p>
          {history.length > 1
            ? `${jugLabels[history.at(-1)!.action!]} → 甲 ${current[0]} L / 乙 ${current[1]} L`
            : '两只空壶，等你开始。'}
        </p>
      </div>
      <div className="device-controls">
        <button
          className="text-button"
          onClick={() => setHistory(history.slice(0, -1))}
          disabled={history.length === 1}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一步
        </button>
        <button className="text-button" onClick={() => setHistory([{ state: [0, 0] }])}>
          <Icon name="reset" size={14} />
          重新开始
        </button>
      </div>
      <output className={`device-message ${solved ? 'revealed' : ''}`} aria-live="polite">
        {solved
          ? message
          : `${['甲', '乙'][targetJug]}壶需要恰好 ${target} 升，另一壶剩多少都可以。`}
      </output>
    </div>
  )
}
