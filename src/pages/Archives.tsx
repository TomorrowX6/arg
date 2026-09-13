import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chapters, getStatus, puzzles } from '../data/archive'
import { useGame } from '../game/useGame'
import { Icon } from '../components/Icon'
import { PuzzleCard } from '../components/PuzzleCard'
import { caseCollections } from '../data/collections'
import '../styles/collections.css'

export default function Archives() {
  const { state } = useGame()
  const [params, setParams] = useSearchParams()
  const selected = params.get('chapter') ?? 'all'
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const chapter = chapters.find((item) => item.id === selected)
  const collection =
    selected === 'side'
      ? caseCollections.find((item) => item.id === params.get('collection'))
      : undefined
  const introduction = collection ?? chapter
  const filtered = puzzles.filter(
    (puzzle) =>
      (selected === 'all' || puzzle.chapter === selected) &&
      (!collection || puzzle.collection === collection.id) &&
      `${puzzle.title}${puzzle.subtitle}${puzzle.tags.join('')}${String(puzzle.number).padStart(3, '0')}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'bookmarked' && state.bookmarked.includes(puzzle.id)) ||
        getStatus(puzzle, state) === filter),
  )
  return (
    <div className="page archives-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">THE ARCHIVE / INDEX</div>
          <h1>每份档案，都是一个入口。</h1>
          <p>循着信号前进。被遗忘的城市，正在一点点浮现。</p>
        </div>
        <div className="page-count">
          <strong>{puzzles.length.toString().padStart(2, '0')}</strong>
          <span>份待复原的故事</span>
        </div>
      </header>
      <div className="chapter-tabs" role="navigation" aria-label="章节筛选">
        <button className={selected === 'all' ? 'active' : ''} onClick={() => setParams({})}>
          <Icon name="grid" size={16} />
          全部档案
        </button>
        {chapters.map((item) => (
          <button
            key={item.id}
            className={selected === item.id ? 'active' : ''}
            onClick={() => setParams({ chapter: item.id })}
          >
            <span>{item.number}</span>
            {item.title}
          </button>
        ))}
      </div>
      {chapter && introduction && (
        <section
          className="chapter-intro"
          style={{ '--chapter-color': introduction.color } as React.CSSProperties}
        >
          <div className="chapter-big-number" aria-hidden="true">
            {chapter.number}
          </div>
          <div>
            <span className="eyebrow">{introduction.subtitle}</span>
            <h2>{introduction.title}</h2>
            <p>{introduction.description}</p>
          </div>
          <Icon name={introduction.icon} size={56} strokeWidth={1} />
        </section>
      )}
      {selected === 'side' && (
        <section className="collection-browser" aria-label="异常故事分组">
          <div className="collection-browser-heading">
            <span className="eyebrow">CHOOSE A STORY</span>
            <button
              className="text-button"
              onClick={() => setParams({ chapter: 'side' })}
              aria-pressed={!collection}
            >
              全部异常档案
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div className="collection-grid">
            {caseCollections.map((item) => {
              const members = puzzles.filter((puzzle) => puzzle.collection === item.id)
              if (!members.length) return null
              const complete = members.filter((puzzle) => state.solved[puzzle.id]).length
              return (
                <button
                  className={`collection-card ${collection?.id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  aria-pressed={collection?.id === item.id}
                  onClick={() => setParams({ chapter: 'side', collection: item.id })}
                >
                  <div className="collection-card-top">
                    <Icon name={item.icon} size={24} />
                    <span>
                      {complete}/{members.length}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.tag}</p>
                  <div className="collection-progress">
                    {members.map((puzzle) => (
                      <i className={state.solved[puzzle.id] ? 'complete' : ''} key={puzzle.id} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
      <div className="archive-toolbar">
        <div className="filter-buttons">
          {[
            { id: 'all', label: '全部状态' },
            { id: 'available', label: '可调查' },
            { id: 'solved', label: '已复原' },
            { id: 'bookmarked', label: '已收藏' },
          ].map((item) => (
            <button
              key={item.id}
              className={filter === item.id ? 'active' : ''}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="archive-search">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、编号、线索…"
            aria-label="筛选档案"
          />
        </label>
      </div>
      <div className="results-count">
        {filtered.length} 份档案 <span>按调查顺序排列</span>
      </div>
      {filtered.length ? (
        <div className="case-grid archive-case-grid">
          {filtered.map((puzzle) => (
            <PuzzleCard key={puzzle.id} puzzle={puzzle} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="archive" size={40} />
          <h2>这里暂时很安静。</h2>
          <p>
            {query
              ? '没有匹配的档案。换个关键词试试。'
              : selected === 'side'
                ? '更多异常正在整理归档。可以先去接收站截获新的信号。'
                : '没有符合条件的档案。试试调整上方筛选。'}
          </p>
          <button
            className="button button-ghost"
            onClick={() => {
              setQuery('')
              setFilter('all')
              setParams({})
            }}
          >
            查看全部档案
          </button>
        </div>
      )}
    </div>
  )
}
