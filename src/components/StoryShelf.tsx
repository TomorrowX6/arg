import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { getResumeStory, getStoryProgress } from '../data/stories'
import { useGame } from '../game/useGame'
import { Icon } from './Icon'
import '../styles/stories.css'

function StoryCover({ id }: { id: string }) {
  return (
    <svg
      className="story-cover-art"
      viewBox="0 0 240 128"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 19h14M23 12v14M210 107h14M217 100v14" stroke="currentColor" opacity=".3" />
      <circle cx="120" cy="64" r="49" stroke="currentColor" opacity=".18" />
      <circle cx="120" cy="64" r="39" stroke="currentColor" opacity=".12" strokeDasharray="3 5" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {id === 'photographer' && (
          <>
            <path d="M70 34l78-9 9 78-78 9z" opacity=".35" />
            <path d="M84 24h79v82H84z" fill="var(--cover-paper)" />
            <path d="M91 32h65v53H91zM93 75l16-20 17 17 12-12 16 21M105 94h36" />
            <circle cx="140" cy="45" r="5" />
          </>
        )}
        {id === 'corners' && (
          <>
            <path
              d="M69 104h108M76 49h85v55H76zM71 49l13-23h69l14 23M83 26v23m16-23v23m16-23v23m16-23v23m16-23v23"
              fill="var(--cover-paper)"
            />
            <path d="M89 66h29v24H89zM132 66h18v38M92 73h23M144 84h1" />
            <path d="M101 56v-6m42 6v-6" opacity=".6" />
          </>
        )}
        {id === 'supply' && (
          <>
            <path d="M67 89h104M119 27v62M104 89h30M80 43h78M81 44L66 72h30L81 44M157 44l-15 28h30l-15-28" />
            <path d="M66 72q15 21 30 0M142 72q15 21 30 0M104 101h30" fill="var(--cover-paper)" />
            <circle cx="119" cy="43" r="5" fill="var(--cover-paper)" />
          </>
        )}
        {id === 'cipherlab' && (
          <>
            <circle cx="119" cy="62" r="34" fill="var(--cover-paper)" />
            <circle cx="119" cy="62" r="23" strokeDasharray="1 7" strokeWidth="4" />
            <path d="M119 21v9m0 64v9M78 62h9m64 0h9M102 54h34M102 69h21M100 96l-17 12M139 96l17 12" />
            <circle cx="134" cy="69" r="4" />
          </>
        )}
        {id === 'fairground' && (
          <>
            <circle cx="120" cy="53" r="35" fill="var(--cover-paper)" />
            <path d="M120 18v70M85 53h70M95 28l50 50M95 78l50-50M120 53l-21 55m21-55 21 55M91 108h58" />
            <circle cx="120" cy="53" r="5" fill="var(--cover-paper)" />
            {[18, 53, 88].map((y, i) => (
              <path
                key={y}
                d={`M${i === 1 ? 78 : 113} ${y - 2}h14v10h-14z`}
                fill="var(--cover-paper)"
              />
            ))}
            <path d="M148 51h14v10h-14z" fill="var(--cover-paper)" />
          </>
        )}
        {id === 'postoffice' && (
          <>
            <path
              d="M62 42h113v64H62zM62 42l56 41 57-41M62 106l41-35m72 35-41-35"
              fill="var(--cover-paper)"
            />
            <path d="M150 33q8-9 16 0t16 0M153 25q8-9 16 0t16 0" opacity=".5" />
            <path d="M74 28l47-8 3 18M77 33l34-6" />
            <circle cx="161" cy="55" r="9" strokeDasharray="2 3" />
          </>
        )}
        {id === 'observatory' && (
          <>
            <path
              d="M74 84q0-41 46-41t46 41M68 85h104v20H68zM120 44v41M90 103V89m59 14V89M120 43l13-15M110 26l25 5"
              fill="var(--cover-paper)"
            />
            <path d="M80 32h8m-4-4v8M154 23h8m-4-4v8M182 49h6m-3-3v6M96 19h4m-2-2v4" />
            <circle cx="163" cy="39" r="2" fill="currentColor" />
          </>
        )}
        {id === 'press' && (
          <>
            <path
              d="M75 29h94v76H75zM75 42H63v58q0 5 6 5h12M85 40h73M85 49h73M85 60h31v28H85zM125 60h31m-31 8h31m-31 8h31m-31 8h31M85 96h72"
              fill="var(--cover-paper)"
            />
            <path d="M93 81l7-8 9 4M135 18l20 3" />
          </>
        )}
        {![
          'photographer',
          'corners',
          'supply',
          'cipherlab',
          'fairground',
          'postoffice',
          'observatory',
          'press',
        ].includes(id) && (
          <>
            <path
              d="M73 97h95M81 97V56l40-32 39 32v41M96 97V61h49v36M121 61v36M97 79h47M88 53h65"
              fill="var(--cover-paper)"
            />
            <path d="M115 49q-18-2-15-14 15 0 15 14m0 0q1-16 14-16 0 15-14 16" />
          </>
        )}
      </g>
    </svg>
  )
}

export function ResumeStory() {
  const { state } = useGame()
  const story = getResumeStory(state)
  if (!story?.next) return null
  return (
    <aside className="story-resume" aria-label="继续上次的支线调查">
      <div className="story-resume-icon">
        <Icon name={story.collection.icon} size={24} />
      </div>
      <div>
        <span>这段故事，还在等你 · {story.collection.title}</span>
        <h2>{story.next.title}</h2>
        <p>
          {story.solved} / {story.cases.length} 份已复原 · 本关约 {story.next.minutes} 分钟
        </p>
      </div>
      <Link className="button button-dark button-small" to={`/case/${story.next.id}`}>
        继续这段故事
        <Icon name="arrowRight" size={16} />
      </Link>
    </aside>
  )
}

export function StoryShelf() {
  const { state } = useGame()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const stories = getStoryProgress(state)
  const options = [
    { id: 'all', label: '所有故事' },
    { id: 'started', label: '正在调查' },
    { id: 'new', label: '尚未开始' },
    { id: 'complete', label: '已经复原' },
  ]
  const filtered = stories.filter((story) => filter === 'all' || story.status === filter)
  const visible = expanded ? filtered : filtered.slice(0, 4)
  return (
    <section className="story-shelf" aria-labelledby="story-shelf-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LIVES BETWEEN THE FILES</span>
          <h2 id="story-shelf-title">每一盏灯，都是一个故事</h2>
        </div>
        <Link className="text-link" to="/archives?chapter=side">
          完整目录
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>
      <p className="story-shelf-intro">
        离开主线片刻，走进城里。每个故事都有自己的开头，也都可以随时回来。
      </p>
      <div className="story-shelf-filters" role="group" aria-label="筛选故事进度">
        {options.map((option) => (
          <button
            key={option.id}
            aria-pressed={filter === option.id}
            onClick={() => {
              setFilter(option.id)
              setExpanded(false)
            }}
          >
            {option.label}
            <span>
              {stories.filter((story) => option.id === 'all' || story.status === option.id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="story-books" aria-live="polite">
        {visible.map((story) => (
          <article
            className={`story-book story-book-${story.collection.id}`}
            key={story.collection.id}
            style={{ '--cover-ink': story.collection.color } as CSSProperties}
          >
            <div className="story-cover">
              <span className="story-cover-number">
                STORY {String(stories.indexOf(story) + 1).padStart(2, '0')}
              </span>
              <StoryCover id={story.collection.id} />
              {story.status === 'complete' && (
                <span className="story-cover-stamp">
                  <Icon name="check" size={12} />
                  已复原
                </span>
              )}
              <span className="story-cover-count">{story.cases.length} 份档案</span>
            </div>
            <div className="story-book-copy">
              <span className="story-book-tag">{story.collection.tag}</span>
              <h3>{story.collection.title}</h3>
              <p>{story.collection.description}</p>
              <div className="story-book-progress">
                <span>
                  {story.solved} / {story.cases.length} 份已复原
                </span>
                <span>
                  {story.status === 'complete' ? '可以重新回看' : `约 ${story.minutes} 分钟`}
                </span>
              </div>
              <div className="story-book-track" aria-hidden="true">
                {story.cases.map((puzzle) => (
                  <i key={puzzle.id} className={state.solved[puzzle.id] ? 'filled' : ''} />
                ))}
              </div>
              <div className="story-book-actions">
                <Link
                  to={
                    story.next
                      ? `/case/${story.next.id}`
                      : `/evidence?collection=${story.collection.id}`
                  }
                  className="text-link"
                >
                  {story.status === 'complete'
                    ? '重读故事证据'
                    : story.status === 'started'
                      ? '继续调查'
                      : '翻开第一页'}
                  <Icon name="arrowRight" size={14} />
                </Link>
                <Link
                  to={`/archives?chapter=side&collection=${story.collection.id}`}
                  className="icon-button"
                  aria-label={`浏览${story.collection.title}的全部档案`}
                >
                  <Icon name="grid" size={16} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="story-shelf-empty">
          {filter === 'complete'
            ? '还没有完整复原的故事。选一盏灯，从第一页开始。'
            : filter === 'started'
              ? '暂时没有进行中的故事。随时可以翻开任意一组档案。'
              : '这些故事都已经留下了你的调查记录。'}
        </p>
      )}
      {filtered.length > 4 && (
        <button
          className="story-shelf-more text-button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? '收起更多故事' : `展开其余 ${filtered.length - 4} 个故事`}
          <Icon name={expanded ? 'chevronLeft' : 'chevronDown'} size={15} />
        </button>
      )}
    </section>
  )
}
