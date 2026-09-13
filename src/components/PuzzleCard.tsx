import { Link } from 'react-router-dom'
import type { Puzzle } from '../game/types'
import { getStatus, kindLabels } from '../data/archive'
import { useGame } from '../game/useGame'
import { Icon } from './Icon'

const kindIcon: Record<string, string> = {
  document: 'mail',
  cipher: 'key',
  morse: 'audio',
  frequency: 'radio',
  terminal: 'terminal',
  lights: 'zap',
  sequence: 'grid',
  route: 'map',
  compare: 'eye',
  sort: 'clock',
  dial: 'orbit',
  logic: 'fingerprint',
  nonogram: 'grid',
  uv: 'eye',
  sliding: 'grid',
  circuit: 'zap',
  forensic: 'fingerprint',
}
export function PuzzleCard({ puzzle, featured = false }: { puzzle: Puzzle; featured?: boolean }) {
  const { state, dispatch } = useGame()
  const status = getStatus(puzzle, state)
  const bookmarked = state.bookmarked.includes(puzzle.id)
  return (
    <article className={`puzzle-card status-${status} ${featured ? 'featured' : ''}`}>
      <div className="puzzle-card-top">
        <span className="case-number">CASE {String(puzzle.number).padStart(3, '0')}</span>
        <button
          className={`bookmark-button ${bookmarked ? 'is-bookmarked' : ''}`}
          onClick={() => dispatch({ type: 'bookmark', id: puzzle.id })}
          aria-label={`${bookmarked ? '取消收藏' : '收藏'}${puzzle.title}`}
          aria-pressed={bookmarked}
        >
          <Icon name="bookmark" size={17} />
        </button>
      </div>
      <Link to={`/case/${puzzle.id}`} className="puzzle-card-link">
        <div className={`case-art case-art-${puzzle.kind}`}>
          <span className="case-art-orbit" />
          <span className="case-art-grid" />
          <Icon name={kindIcon[puzzle.kind] ?? 'file'} size={55} strokeWidth={1.1} />
          <span className="art-coordinate">EH—{puzzle.id.toUpperCase()}</span>
          <span className="art-cross art-cross-one">+</span>
          <span className="art-cross art-cross-two">+</span>
          {status === 'solved' && <span className="solved-stamp">已复原</span>}
        </div>
        <div className="puzzle-card-body">
          <div className="card-eyebrow">
            <span className={`state-label ${status}`}>
              <span />
              {status === 'solved' ? '调查完成' : status === 'locked' ? '待解封' : '可调查'}
            </span>
            <span className="difficulty-dots" aria-label={`难度 ${puzzle.difficulty}，共 3 级`}>
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= puzzle.difficulty ? 'filled' : ''} />
              ))}
            </span>
          </div>
          <h3>{puzzle.title}</h3>
          <p>{puzzle.subtitle}</p>
          <div className="puzzle-card-meta">
            <span>
              <Icon name={kindIcon[puzzle.kind] ?? 'file'} size={13} />
              {kindLabels[puzzle.kind]}
            </span>
            <span>
              <Icon name="clock" size={13} />
              {puzzle.minutes} 分钟
            </span>
            <Icon name={status === 'locked' ? 'lock' : 'arrowUpRight'} size={16} />
          </div>
        </div>
      </Link>
    </article>
  )
}
