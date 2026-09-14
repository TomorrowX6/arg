import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { chapters, puzzleById, puzzles } from '../data/archive'
import { caseCollections, collectionById } from '../data/collections'
import { useGame } from '../game/useGame'
import type { Puzzle } from '../game/types'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import '../styles/evidence.css'

function storyName(puzzle: Puzzle) {
  return (
    (puzzle.collection && collectionById[puzzle.collection]?.title) ||
    chapters.find((chapter) => chapter.id === puzzle.chapter)?.title ||
    '雾港档案'
  )
}

export default function Evidence() {
  const { state, dispatch } = useGame()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [view, setView] = useState('board')
  const [selected, setSelected] = useState<string | null>(params.get('item'))
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('story')
  const [comparison, setComparison] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const comparisonRef = useRef<HTMLElement>(null)
  const collection = caseCollections.find((item) => item.id === params.get('collection'))
  const chapter = chapters.find((item) => item.id === params.get('chapter'))
  const group = collection ? `story:${collection.id}` : chapter ? `chapter:${chapter.id}` : 'all'
  const from = puzzleById[params.get('from') ?? '']
  const collected = puzzles.filter((puzzle) => state.solved[puzzle.id])
  const terms = query.normalize('NFKC').trim().toLowerCase().split(/\s+/u).filter(Boolean)
  const visible = collected
    .filter((puzzle) => {
      if (collection && puzzle.collection !== collection.id) return false
      if (!collection && chapter && puzzle.chapter !== chapter.id) return false
      const text =
        `${puzzle.id} ${String(puzzle.number).padStart(3, '0')} ${puzzle.title} ${puzzle.evidence.title} ${puzzle.evidence.text} ${storyName(puzzle)}`
          .normalize('NFKC')
          .toLowerCase()
      return terms.every((term) => text.includes(term))
    })
    .sort((a, b) =>
      order === 'recent'
        ? Date.parse(state.solved[b.id].at) - Date.parse(state.solved[a.id].at) ||
          a.number - b.number
        : a.number - b.number,
    )
  const active = selected ? collected.find((puzzle) => puzzle.id === selected) : undefined
  const compared = comparison
    .map((id) => collected.find((puzzle) => puzzle.id === id))
    .filter((puzzle): puzzle is Puzzle => Boolean(puzzle))
  const related = active
    ? collected.filter(
        (puzzle) =>
          puzzle.id !== active.id &&
          (active.collection
            ? puzzle.collection === active.collection
            : active.requires?.includes(puzzle.id) || puzzle.requires?.includes(active.id)),
      )
    : []
  function selectGroup(value: string) {
    const next = new URLSearchParams()
    if (from) next.set('from', from.id)
    if (value.startsWith('story:')) next.set('collection', value.slice(6))
    if (value.startsWith('chapter:')) next.set('chapter', value.slice(8))
    setParams(next)
    setQuery('')
  }
  function toggleComparison(id: string) {
    if (comparison.includes(id)) {
      setComparison(comparison.filter((item) => item !== id))
      setNotice('已从对照台取下这份证据。')
    } else if (comparison.length >= 6) {
      setNotice('对照台可同时放六份证据，先取下一份再继续。')
    } else {
      setComparison([...comparison, id])
      setNotice(`已加入对照台，共 ${comparison.length + 1} 份证据。`)
    }
  }
  function writeComparison() {
    if (!compared.length) return
    const id = crypto.randomUUID()
    dispatch({
      type: 'note',
      note: {
        id,
        title: `${collection?.title ?? chapter?.title ?? '雾港调查'} · 证据对照`,
        text: `${compared.map((puzzle) => `【EH—${puzzle.id.toUpperCase()} · ${puzzle.evidence.title}】\n${puzzle.evidence.text}`).join('\n\n')}\n\n我的推理：\n`,
        puzzleId: from?.id ?? compared[compared.length - 1].id,
        updatedAt: new Date().toISOString(),
      },
    })
    navigate(`/notes?note=${id}`)
  }
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
        <div className="view-toggle" role="group" aria-label="证据展示方式">
          <button
            className={view === 'board' ? 'active' : ''}
            onClick={() => setView('board')}
            aria-label="证据板视图"
            aria-pressed={view === 'board'}
          >
            <Icon name="grid" size={18} />
          </button>
          <button
            className={view === 'timeline' ? 'active' : ''}
            onClick={() => setView('timeline')}
            aria-label="时间线视图"
            aria-pressed={view === 'timeline'}
          >
            <Icon name="clock" size={18} />
          </button>
        </div>
      </header>
      {from && (
        <Link className="evidence-return" to={`/case/${from.id}`}>
          <Icon name="arrowLeft" size={15} />
          <span>返回调查：{from.title}</span>
        </Link>
      )}
      <div className="evidence-toolbar evidence-search-toolbar">
        <label className="archive-search evidence-search">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索已确认的文字、编号或线索…"
            aria-label="搜索已收集的证据"
          />
        </label>
        <label>
          <span className="sr-only">按章节或故事筛选证据</span>
          <select value={group} onChange={(event) => selectGroup(event.target.value)}>
            <option value="all">全部已确认线索</option>
            <optgroup label="按章节">
              {chapters.map((item) => (
                <option key={item.id} value={`chapter:${item.id}`}>
                  {item.title} · {collected.filter((puzzle) => puzzle.chapter === item.id).length}
                </option>
              ))}
            </optgroup>
            <optgroup label="按异常故事">
              {caseCollections.map((item) => (
                <option key={item.id} value={`story:${item.id}`}>
                  {item.title} ·{' '}
                  {collected.filter((puzzle) => puzzle.collection === item.id).length}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          <span className="sr-only">证据排列顺序</span>
          <select value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="story">按档案编号</option>
            <option value="recent">最近复原优先</option>
          </select>
        </label>
      </div>
      {collected.length > 0 && (
        <div className="evidence-results-bar">
          <span role="status">
            显示 {visible.length} / {collected.length} 枚已确认线索
          </span>
          <button
            className="text-button"
            disabled={!compared.length}
            onClick={() => {
              comparisonRef.current?.focus()
              comparisonRef.current?.scrollIntoView({ block: 'start' })
            }}
          >
            <Icon name="copy" size={14} />
            对照台 · {compared.length}/6
          </button>
        </div>
      )}
      {compared.length > 0 && (
        <section
          className="evidence-comparison"
          ref={comparisonRef}
          tabIndex={-1}
          aria-label="证据对照台"
        >
          <div className="comparison-heading">
            <div>
              <span className="eyebrow">SIDE BY SIDE / {compared.length} FRAGMENTS</span>
              <h2>让线索互相作证。</h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setComparison([])
                setNotice('对照台已收起，证据仍保留在墙上。')
              }}
            >
              全部取下
            </button>
          </div>
          <div className="comparison-grid">
            {compared.map((puzzle, index) => (
              <article key={puzzle.id}>
                <header>
                  <span>
                    {String(index + 1).padStart(2, '0')} / EH—{puzzle.id.toUpperCase()}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`从对照台取下${puzzle.evidence.title}`}
                    onClick={() => toggleComparison(puzzle.id)}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </header>
                <h3>{puzzle.evidence.title}</h3>
                <p>{puzzle.evidence.text}</p>
                <Link to={`/case/${puzzle.id}`}>
                  查阅来源
                  <Icon name="arrowUpRight" size={13} />
                </Link>
              </article>
            ))}
          </div>
          <div className="comparison-footer">
            <span>按放上对照台的先后排列，可跨故事对照。</span>
            <button className="button button-dark button-small" onClick={writeComparison}>
              <Icon name="book" size={15} />
              存入手记，继续推理
            </button>
          </div>
        </section>
      )}
      <p className="evidence-selection-status" role="status">
        {notice}
      </p>
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
          <h2>{query ? '已确认的证据里，没有这条线索。' : '这里还没有确认的线索。'}</h2>
          <p>证据墙只展示你已复原的档案，不会提前透露尚未发现的内容。</p>
          <button
            className="button button-ghost"
            onClick={() => {
              selectGroup('all')
              setQuery('')
            }}
          >
            查看全部已收集证据
          </button>
        </div>
      ) : view === 'board' ? (
        <div className="evidence-board">
          {visible.map((puzzle, index) => (
            <article
              className={`evidence-note ${comparison.includes(puzzle.id) ? 'is-compared' : ''}`}
              key={puzzle.id}
              style={{ '--tilt': `${[-1.1, 0.6, -0.4, 1.2][index % 4]}deg` } as React.CSSProperties}
            >
              <span className="evidence-note-pin" />
              <button
                className="evidence-note-open"
                onClick={() => setSelected(puzzle.id)}
                aria-label={`查看证据：${puzzle.evidence.title}`}
              >
                <div className="evidence-note-top">
                  <span>EH—{puzzle.id.toUpperCase()}</span>
                  <Icon name="arrowUpRight" size={14} />
                </div>
                <div className="evidence-symbol">
                  <Icon name={puzzle.evidence.symbol} size={46} strokeWidth={1.1} />
                </div>
                <small>{storyName(puzzle)}</small>
                <h2>{puzzle.evidence.title}</h2>
                <p>{puzzle.evidence.text}</p>
              </button>
              <div className="evidence-note-bottom">
                <span>
                  <Icon name="check" size={12} />
                  已确认
                </span>
                <button
                  aria-pressed={comparison.includes(puzzle.id)}
                  onClick={() => toggleComparison(puzzle.id)}
                  aria-label={`${comparison.includes(puzzle.id) ? '取下' : '对照'}：${puzzle.evidence.title}`}
                >
                  <Icon name={comparison.includes(puzzle.id) ? 'check' : 'plus'} size={13} />
                  {comparison.includes(puzzle.id) ? '已在对照台' : '加入对照'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="evidence-timeline">
          {visible.map((puzzle) => (
            <button key={puzzle.id} onClick={() => setSelected(puzzle.id)}>
              <span className="timeline-dot" />
              <span className="timeline-number">{String(puzzle.number).padStart(3, '0')}</span>
              <div>
                <small>
                  {storyName(puzzle)} ·{' '}
                  {new Date(state.solved[puzzle.id].at).toLocaleDateString('zh-CN')}
                </small>
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
          <button
            className="button button-ghost button-small evidence-modal-compare"
            aria-pressed={comparison.includes(active.id)}
            onClick={() => toggleComparison(active.id)}
          >
            <Icon name={comparison.includes(active.id) ? 'check' : 'plus'} size={15} />
            {comparison.includes(active.id) ? '从对照台取下' : '加入证据对照台'}
          </button>
          {related.length > 0 && (
            <div className="evidence-related">
              <span>{active.collection ? '同一故事里的已确认线索' : '与这份档案相连的证据'}</span>
              {related.map((puzzle) => (
                <button key={puzzle.id} onClick={() => setSelected(puzzle.id)}>
                  <span className="mono">{puzzle.id.toUpperCase()}</span>
                  {puzzle.evidence.title}
                  <Icon name="arrowRight" size={13} />
                </button>
              ))}
            </div>
          )}
          <p className="modal-footnote">
            调查记录 · {new Date(state.solved[active.id].at).toLocaleString('zh-CN')} ·{' '}
            {state.solved[active.id].hints} 条提示
          </p>
        </Modal>
      )}
    </div>
  )
}
