import { useState } from 'react'
import { Link } from 'react-router-dom'
import { chapters, puzzles } from '../data/archive'
import { useGame } from '../game/useGame'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'

export default function Evidence() {
  const { state } = useGame()
  const [view, setView] = useState('board')
  const [selected, setSelected] = useState<string | null>(null)
  const [chapter, setChapter] = useState('all')
  const collected = puzzles.filter((puzzle) => state.solved[puzzle.id])
  const visible = collected.filter((puzzle) => chapter === 'all' || puzzle.chapter === chapter)
  const active = selected ? collected.find((puzzle) => puzzle.id === selected) : undefined
  return (
    <div className="page evidence-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">
            MEMORY FRAGMENTS / {collected.length.toString().padStart(2, '0')} COLLECTED
          </div>
          <h1>散落的记忆，终会相连。</h1>
          <p>把微小的异常放在一起，听见故事更深处的回响。</p>
        </div>
        <div className="view-toggle">
          <button
            className={view === 'board' ? 'active' : ''}
            onClick={() => setView('board')}
            aria-label="证据板视图"
          >
            <Icon name="grid" size={18} />
          </button>
          <button
            className={view === 'timeline' ? 'active' : ''}
            onClick={() => setView('timeline')}
            aria-label="时间线视图"
          >
            <Icon name="clock" size={18} />
          </button>
        </div>
      </header>
      <div className="evidence-toolbar">
        <span>
          <Icon name="fingerprint" size={17} />
          {collected.length} 枚已确认线索
        </span>
        <label>
          <span className="sr-only">按章节筛选证据</span>
          <select value={chapter} onChange={(event) => setChapter(event.target.value)}>
            <option value="all">所有章节</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {collected.length === 0 ? (
        <div className="evidence-empty">
          <div className="empty-evidence-art">
            <div>
              <Icon name="mail" size={45} />
              <span>EH—001</span>
            </div>
            <i />
            <div>
              <Icon name="fingerprint" size={45} />
              <span>?</span>
            </div>
          </div>
          <h2>第一枚线索，就在一封信里。</h2>
          <p>
            每完成一份档案，相关证物会自动归入这里。
            <br />
            你不需要记住所有事情，档案馆会替你保管。
          </p>
          <Link to="/case/a01" className="button button-dark">
            打开那封信
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <Icon name="fingerprint" size={35} />
          <h2>这一章还没有确认的线索。</h2>
          <Link to={`/archives?chapter=${chapter}`} className="text-link">
            前往调查
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      ) : view === 'board' ? (
        <div className="evidence-board">
          {visible.map((puzzle, index) => (
            <button
              className="evidence-note"
              key={puzzle.id}
              style={{ '--tilt': `${[-1.1, 0.6, -0.4, 1.2][index % 4]}deg` } as React.CSSProperties}
              onClick={() => setSelected(puzzle.id)}
            >
              <span className="evidence-note-pin" />
              <div className="evidence-note-top">
                <span>EH—{puzzle.id.toUpperCase()}</span>
                <Icon name="arrowUpRight" size={14} />
              </div>
              <div className="evidence-symbol">
                <Icon name={puzzle.evidence.symbol} size={46} strokeWidth={1.1} />
              </div>
              <small>{chapters.find((ch) => ch.id === puzzle.chapter)?.title}</small>
              <h2>{puzzle.evidence.title}</h2>
              <p>{puzzle.evidence.text}</p>
              <span className="evidence-note-bottom">
                <Icon name="check" size={12} />
                已确认
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="evidence-timeline">
          {visible.map((puzzle) => (
            <button key={puzzle.id} onClick={() => setSelected(puzzle.id)}>
              <span className="timeline-dot" />
              <span className="timeline-number">{String(puzzle.number).padStart(3, '0')}</span>
              <div>
                <small>{chapters.find((ch) => ch.id === puzzle.chapter)?.title}</small>
                <h2>{puzzle.evidence.title}</h2>
                <p>{puzzle.evidence.text}</p>
              </div>
              <Icon name="arrowUpRight" size={18} />
            </button>
          ))}
        </div>
      )}
      {active && (
        <Modal title={active.evidence.title} onClose={() => setSelected(null)}>
          <div className="evidence-modal-art">
            <Icon name={active.evidence.symbol} size={64} strokeWidth={1} />
            <span>EH—{active.id.toUpperCase()}</span>
          </div>
          <p className="evidence-modal-text">{active.evidence.text}</p>
          <div className="evidence-source">
            <span>来源档案</span>
            <Link to={`/case/${active.id}`}>
              {active.title}
              <Icon name="arrowUpRight" size={15} />
            </Link>
          </div>
          <p className="modal-footnote">
            调查记录 · {new Date(state.solved[active.id].at).toLocaleString('zh-CN')} ·{' '}
            {state.solved[active.id].hints} 条提示
          </p>
        </Modal>
      )}
    </div>
  )
}
