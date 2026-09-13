import { useState } from 'react'
import type { Artifact } from '../game/types'
import { possibleHeavyCoins, weighCoins } from '../game/miniGames'
import type { Weighing } from '../game/miniGames'
import { Icon } from './Icon'

const outcomes = { left: '左盘更重', balanced: '两盘平衡', right: '右盘更重' }

export function BalanceDevice({ artifact }: { artifact: Artifact }) {
  const {
    count = 9,
    heavy = 7,
    maxWeighings = 2,
    message,
  } = artifact.config as { count?: number; heavy?: number; maxWeighings?: number; message: string }
  const [placement, setPlacement] = useState<number[]>(Array(count).fill(0))
  const [pan, setPan] = useState(1)
  const [history, setHistory] = useState<Weighing[]>([])
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState('')
  const [solved, setSolved] = useState(false)
  const left = placement.flatMap((value, index) => (value === 1 ? [index + 1] : []))
  const right = placement.flatMap((value, index) => (value === 2 ? [index + 1] : []))
  const last = history.at(-1)
  const measured =
    last && last.left.join(',') === left.join(',') && last.right.join(',') === right.join(',')
  const result = measured ? last.result : 'balanced'
  const tilt = result === 'left' ? 20 : result === 'right' ? -20 : 0
  const candidates = possibleHeavyCoins(count, history)

  function weigh() {
    if (solved || history.length >= maxWeighings) return
    if (!left.length || left.length !== right.length) {
      setFeedback('请在两边放入相同数量的硬币，每边至少一枚。')
      return
    }
    const result = weighCoins(left, right, heavy)
    setHistory([...history, { left: [...left], right: [...right], result }])
    setFeedback(`第 ${history.length + 1} 次称量：${outcomes[result]}。`)
  }
  function identify() {
    if (!guess) return
    if (candidates.length !== 1) {
      setFeedback(
        `现有称量还支持 ${candidates.length} 个候选。需要用记录排除到只剩一枚，再提交判断。`,
      )
      return
    }
    if (Number(guess) === candidates[0]) {
      setSolved(true)
      setFeedback('称量记录与判断一致。')
    } else setFeedback('这枚硬币与称量记录不符。重新看看哪一组变重了。')
  }
  function reset() {
    setPlacement(Array(count).fill(0))
    setHistory([])
    setGuess('')
    setFeedback('已重新校准天平。')
    setSolved(false)
  }

  return (
    <div className="balance-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="orbit" size={15} />
          只多一点重量
        </span>
        <strong>
          称量 {history.length} / {maxWeighings}
        </strong>
      </div>
      <div className="balance-illustration">
        <svg
          viewBox="0 0 400 180"
          role="img"
          aria-label={`天平显示：${measured ? outcomes[result] : '当前分组尚未称量'}`}
        >
          <path d="M147 164H253L237 153H163Z" fill="#586e4b" />
          <path d="M191 150V59L200 45L209 59V150Z" fill="#a7b596" />
          <circle cx="200" cy="57" r="8" fill="#d9bb81" stroke="#6b805a" strokeWidth="2" />
          <line
            x1="73"
            y1={61 + tilt}
            x2="327"
            y2={61 - tilt}
            stroke="#6a7f58"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {[
            { x: 73, y: 61 + tilt, side: left, label: '左盘' },
            { x: 327, y: 61 - tilt, side: right, label: '右盘' },
          ].map(({ x, y, side, label }) => (
            <g key={label}>
              <path
                d={`M${x} ${y}L${x - 42} ${y + 65}M${x} ${y}L${x + 42} ${y + 65}`}
                fill="none"
                stroke="#8d9d79"
                strokeWidth="2"
              />
              <path
                d={`M${x - 44} ${y + 65}Q${x} ${y + 99} ${x + 44} ${y + 65}Z`}
                fill="#c9d1b4"
                stroke="#7f926b"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + 56}
                textAnchor="middle"
                fill="#49613e"
                fontSize="15"
                fontFamily="var(--mono)"
              >
                {side.length ? side.length + ' 枚' : '空'}
              </text>
            </g>
          ))}
          <text x="200" y="28" textAnchor="middle" fill="#667650" fontSize="10" letterSpacing="2">
            WUGANG · PRECISION BALANCE
          </text>
        </svg>
      </div>
      <div className="coin-destination" role="group" aria-label="放置硬币的位置">
        <span>点击硬币，放入</span>
        {[
          { id: 1, label: '左盘' },
          { id: 2, label: '右盘' },
          { id: 0, label: '桌面' },
        ].map((item) => (
          <button
            key={item.id}
            aria-pressed={pan === item.id}
            className={pan === item.id ? 'active' : ''}
            onClick={() => setPan(item.id)}
            disabled={solved}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="coin-grid"
        style={{ gridTemplateColumns: `repeat(${count > 6 ? Math.ceil(count / 2) : count},1fr)` }}
      >
        {placement.map((location, index) => (
          <button
            key={index}
            className={`coin coin-pan-${location}`}
            aria-label={`硬币 ${index + 1}，${['桌面', '左盘', '右盘'][location]}`}
            onClick={() => {
              setPlacement(
                placement.map((value, i) => (i === index ? (value === pan ? 0 : pan) : value)),
              )
              setFeedback('')
            }}
            disabled={solved}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <small>{['桌面', '左盘', '右盘'][location]}</small>
          </button>
        ))}
      </div>
      <div className="scale-pan-list">
        <p>
          <strong>左盘</strong>
          {left.join(' · ') || '空'}
        </p>
        <p>
          <strong>右盘</strong>
          {right.join(' · ') || '空'}
        </p>
      </div>
      <div className="device-controls">
        <button
          className="button button-dark button-small"
          onClick={weigh}
          disabled={solved || history.length >= maxWeighings}
        >
          进行称量
          <Icon name="arrowRight" size={14} />
        </button>
        <button
          className="text-button"
          onClick={() => {
            setPlacement(Array(count).fill(0))
            setFeedback('硬币已放回桌面，称量记录保留。')
          }}
          disabled={solved}
        >
          <Icon name="reset" size={14} />
          清空两盘
        </button>
      </div>
      <div className="weighing-history">
        <span className="eyebrow">称量记录</span>
        {history.length ? (
          history.map((record, index) => (
            <p key={index}>
              <span>{index + 1}</span>
              <code>
                {record.left.join(',')} / {record.right.join(',')}
              </code>
              <strong>{outcomes[record.result]}</strong>
            </p>
          ))
        ) : (
          <p className="mini-help">还没有记录。先计划如何把候选硬币分组。</p>
        )}
      </div>
      {!solved && (
        <div className="balance-guess">
          <label>
            判断较重硬币
            <select value={guess} onChange={(event) => setGuess(event.target.value)}>
              <option value="">选择编号</option>
              {Array.from({ length: count }, (_, i) => (
                <option key={i} value={i + 1}>
                  第 {i + 1} 枚
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button-ghost button-small"
            onClick={identify}
            disabled={!guess || !history.length}
          >
            提交判断
          </button>
        </div>
      )}
      <p className="mini-feedback" role="status">
        {feedback}
      </p>
      {history.length >= maxWeighings && candidates.length > 1 && !solved && (
        <p className="mini-help">
          称量机会用完，记录还不足以锁定一枚。可以重新开始，换一种分组；没有额外惩罚。
        </p>
      )}
      <div className="device-controls">
        <button className="text-button" onClick={reset}>
          <Icon name="reset" size={14} />
          重新校准
        </button>
        <span>只有一枚较重，其余完全等重</span>
      </div>
      <output className={`device-message ${solved ? 'revealed' : ''}`} aria-live="polite">
        {solved ? message : '称量、排除，再作出有记录支持的判断。'}
      </output>
    </div>
  )
}
