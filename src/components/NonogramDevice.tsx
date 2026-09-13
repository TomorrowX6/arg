import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { nonogramClues } from '../game/mechanics'
import { Icon } from './Icon'

export function NonogramDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { size: number; solution: number[]; message: string }
  const [board, setBoard] = useState<number[]>(Array(config.size * config.size).fill(0))
  const [mode, setMode] = useState<1 | -1>(1)
  const [moves, setMoves] = useState(0)
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const rows = Array.from({ length: config.size }, (_, r) =>
    nonogramClues(config.solution.slice(r * config.size, (r + 1) * config.size)),
  )
  const columns = Array.from({ length: config.size }, (_, c) =>
    nonogramClues(config.solution.filter((_, i) => i % config.size === c)),
  )
  const solved = board.every((cell, i) => (cell === 1 ? 1 : 0) === config.solution[i])
  function mark(index: number, value = mode) {
    setBoard((previous) =>
      previous.map((cell, i) => (i === index ? (cell === value ? 0 : value) : cell)),
    )
    setMoves((n) => n + 1)
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const shift: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -config.size,
      ArrowDown: config.size,
    }
    if (Object.hasOwn(shift, event.key)) {
      event.preventDefault()
      const next = index + shift[event.key]
      if (
        next >= 0 &&
        next < board.length &&
        (!(event.key === 'ArrowLeft' || event.key === 'ArrowRight') ||
          Math.floor(next / config.size) === Math.floor(index / config.size))
      )
        cells.current[next]?.focus()
    }
    if (event.key.toLowerCase() === 'x') {
      event.preventDefault()
      mark(index, -1)
    }
  }
  return (
    <div className="nonogram-device">
      <div className="device-top">
        <span>
          PIXEL MEMORY / {config.size} × {config.size}
        </span>
        <span>{moves} 次标记</span>
      </div>
      <div className="nonogram-controls">
        <button
          className={mode === 1 ? 'active' : ''}
          aria-pressed={mode === 1}
          onClick={() => setMode(1)}
        >
          <span className="nonogram-fill-icon" />
          涂黑
        </button>
        <button
          className={mode === -1 ? 'active' : ''}
          aria-pressed={mode === -1}
          onClick={() => setMode(-1)}
        >
          <Icon name="x" size={14} />
          标空
        </button>
        <button
          className="text-button"
          onClick={() => {
            setBoard(Array(config.size * config.size).fill(0))
            setMoves(0)
          }}
        >
          <Icon name="reset" size={14} />
          重置
        </button>
      </div>
      <div className="nonogram-table-wrap">
        <table className="nonogram-table" aria-label="数织网格">
          <thead>
            <tr>
              <td aria-label="行列提示" />
              {columns.map((clues, c) => (
                <th key={c} scope="col" aria-label={`第 ${c + 1} 列提示 ${clues.join('、')}`}>
                  <div>
                    {clues.map((clue, i) => (
                      <span key={i}>{clue}</span>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((clues, r) => (
              <tr key={r}>
                <th scope="row" aria-label={`第 ${r + 1} 行提示 ${clues.join('、')}`}>
                  <div>
                    {clues.map((clue, i) => (
                      <span key={i}>{clue}</span>
                    ))}
                  </div>
                </th>
                {Array.from({ length: config.size }, (_, c) => {
                  const index = r * config.size + c
                  return (
                    <td key={c}>
                      <button
                        ref={(element) => {
                          cells.current[index] = element
                        }}
                        className={
                          board[index] === 1 ? 'filled' : board[index] === -1 ? 'marked' : ''
                        }
                        aria-label={`第 ${r + 1} 行第 ${c + 1} 列，${board[index] === 1 ? '已涂黑' : board[index] === -1 ? '已标空' : '未标记'}`}
                        aria-pressed={board[index] === 1}
                        onClick={() => mark(index)}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          mark(index, -1)
                        }}
                        onKeyDown={(event) => keyDown(event, index)}
                      >
                        {board[index] === -1 ? '×' : <span />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nonogram-instructions">
        数字表示该行或列连续黑格的长度，多组黑格之间至少留一格。空格不必全部标记；方向键移动焦点，X
        标空。
      </p>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : '把所有黑格还原，丢失的图像就会重新出现。'}
      </p>
    </div>
  )
}
