import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { sudokuCandidates, sudokuComplete, sudokuConflicts } from '../game/observatory'
import type { SudokuConfig } from '../game/observatory'
import { Icon } from './Icon'

interface Snapshot {
  values: number[]
  notes: number[][]
}
export function SudokuDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as unknown as SudokuConfig
  const { size, givens, boxRows, boxColumns } = config
  const initial = (): Snapshot => ({ values: [...givens], notes: givens.map(() => []) })
  const [history, setHistory] = useState<Snapshot[]>([initial()])
  const [selected, setSelected] = useState(Math.max(0, givens.indexOf(0)))
  const [pencil, setPencil] = useState(false)
  const [assist, setAssist] = useState(false)
  const [feedback, setFeedback] = useState('')
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const current = history.at(-1)!
  const conflicts = sudokuConflicts(config, current.values)
  const complete = sudokuComplete(config, current.values)
  const candidates = sudokuCandidates(config, current.values, selected)
  function enter(value: number) {
    if (givens[selected] || complete) return
    const next = { values: [...current.values], notes: current.notes.map((notes) => [...notes]) }
    if (value === 0) {
      next.values[selected] = 0
      next.notes[selected] = []
    } else if (pencil) {
      if (current.values[selected]) {
        setFeedback('先擦去数字，再写铅笔候选。')
        return
      }
      next.notes[selected] = next.notes[selected].includes(value)
        ? next.notes[selected].filter((n) => n !== value)
        : [...next.notes[selected], value].sort()
    } else {
      if (next.values[selected] === value && !next.notes[selected].length) return
      next.values[selected] = value
      next.notes[selected] = []
    }
    setHistory([...history, next])
    setFeedback(
      sudokuConflicts(config, next.values).length
        ? '红框标出与同行、同列或同宫重复的数字，可以撤回修改。'
        : '',
    )
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / size),
      column = index % size
    const moves: Record<string, number> = {
      ArrowUp: ((row + size - 1) % size) * size + column,
      ArrowDown: ((row + 1) % size) * size + column,
      ArrowLeft: row * size + ((column + size - 1) % size),
      ArrowRight: row * size + ((column + 1) % size),
      Home: row * size,
      End: row * size + size - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      const target = moves[event.key]
      setSelected(target)
      buttons.current[target]?.focus()
    } else if (/^[1-9]$/.test(event.key) && Number(event.key) <= size) {
      event.preventDefault()
      enter(Number(event.key))
    } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      event.preventDefault()
      enter(0)
    }
  }
  return (
    <div className="sudoku-device observatory-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="grid" size={15} />
          星历校准 · {size} × {size}
        </span>
        <strong>
          {current.values.filter(Boolean).length}/{size * size} 格已填
        </strong>
      </div>
      <p className="observatory-instruction">
        每行、每列及每个 {boxRows} × {boxColumns} 宫里，数字 1–{size} 各出现一次。
      </p>
      <div
        className="sudoku-matrix"
        style={{ '--sudoku-size': size } as React.CSSProperties}
        role="group"
        aria-label={`${size} 行 ${size} 列星历方格，方向键移动，数字键填写`}
      >
        {current.values.map((value, index) => {
          const row = Math.floor(index / size),
            column = index % size
          const label = `第 ${row + 1} 行第 ${column + 1} 列，${givens[index] ? `原始数字 ${value}` : value ? `数字 ${value}` : current.notes[index].length ? `候选 ${current.notes[index].join('、')}` : '空格'}${conflicts.includes(index) ? '，数字重复' : ''}`
          return (
            <button
              key={index}
              ref={(button) => {
                buttons.current[index] = button
              }}
              className={`sudoku-cell ${givens[index] ? 'given' : ''} ${selected === index ? 'selected' : ''} ${conflicts.includes(index) ? 'conflict' : ''} ${(column + 1) % boxColumns === 0 && column < size - 1 ? 'box-right' : ''} ${(row + 1) % boxRows === 0 && row < size - 1 ? 'box-bottom' : ''}`}
              onClick={() => {
                setSelected(index)
                setFeedback('')
              }}
              onFocus={() => setSelected(index)}
              onKeyDown={(event) => key(event, index)}
              tabIndex={selected === index ? 0 : -1}
              aria-label={label}
              aria-pressed={selected === index}
            >
              {value || (
                <span className="sudoku-pencil">
                  {Array.from({ length: size }, (_, n) => (
                    <i key={n}>{current.notes[index].includes(n + 1) ? n + 1 : ''}</i>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="sudoku-entry">
        <span>
          第 {Math.floor(selected / size) + 1} 行 · 第 {(selected % size) + 1} 列
          {givens[selected] ? ' · 原始记录' : pencil ? ' · 铅笔候选' : ' · 正式填写'}
        </span>
        <div className="sudoku-numbers">
          {Array.from({ length: size }, (_, i) => (
            <button
              key={i}
              disabled={Boolean(givens[selected]) || complete}
              onClick={() => enter(i + 1)}
              aria-label={`${pencil ? '标记候选' : '填入数字'} ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="sudoku-erase"
            onClick={() => enter(0)}
            disabled={
              Boolean(givens[selected]) ||
              complete ||
              (!current.values[selected] && !current.notes[selected].length)
            }
            aria-label="擦去本格"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>
      <div className="sudoku-options">
        <button
          className={pencil ? 'active' : ''}
          aria-pressed={pencil}
          onClick={() => setPencil(!pencil)}
        >
          <Icon name="book" size={14} />
          铅笔候选
        </button>
        <button
          className={assist ? 'active' : ''}
          aria-pressed={assist}
          onClick={() => setAssist(!assist)}
        >
          <Icon name="lightbulb" size={14} />
          显示可填候选
        </button>
      </div>
      {assist && (
        <p className="sudoku-assistance" role="status">
          {givens[selected]
            ? '这格是原始记录，请选择一个空格。'
            : current.values[selected]
              ? '先擦去这格的数字，就可以检查候选。'
              : candidates.length
                ? `这格目前可以填：${candidates.join('、')}。候选只检查当前行、列和宫。`
                : '这格已经没有可填数字，请检查此前的填写。'}
        </p>
      )}
      <div className="device-controls">
        <button
          className="text-button"
          disabled={history.length <= 1}
          onClick={() => {
            setHistory(history.slice(0, -1))
            setFeedback('已撤回上一笔。')
          }}
        >
          <Icon name="arrowLeft" size={14} />
          撤回一笔
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([initial()])
            setFeedback('星历已恢复到原始记录。')
          }}
        >
          <Icon name="reset" size={14} />
          重置星历
        </button>
      </div>
      <p className="observatory-footnote">
        点选格子后填数；键盘可用方向键和数字键，Delete 擦除。铅笔记录不会算入完成进度。
      </p>
      <div className={`device-result ${complete ? 'is-visible' : ''}`} role="status">
        {complete ? (
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
