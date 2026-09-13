import { Link } from 'react-router-dom'
import { chapters, getNextPuzzle, getStatus, mainPuzzles, puzzles } from '../data/archive'
import { useGame } from '../game/useGame'
import { CityMap } from '../components/CityMap'
import { Icon } from '../components/Icon'
import { PuzzleCard } from '../components/PuzzleCard'

export default function Dashboard() {
  const { state } = useGame()
  const next = getNextPuzzle(state)
  const completed = mainPuzzles.filter((puzzle) => !!state.solved[puzzle.id]).length
  const evidenceCount = puzzles.filter((puzzle) => !!state.solved[puzzle.id]).length
  const percent = mainPuzzles.length ? Math.round((completed / mainPuzzles.length) * 100) : 0
  const displayCases = next
    ? mainPuzzles.slice(mainPuzzles.indexOf(next), mainPuzzles.indexOf(next) + 3)
    : mainPuzzles.slice(-3)
  return (
    <div className="page dashboard-page">
      <section className="page-welcome">
        <div>
          <div className="eyebrow">
            <span className="small-cross">✳</span> NIGHT SHIFT / 014
          </div>
          <h1>{completed ? '欢迎回来，档案员。' : '一切线索，都有回响。'}</h1>
          <p>
            {state.ending
              ? '天亮了。还有新的故事，正在发生。'
              : '夜深了。还有一些故事，等着被重新听见。'}
          </p>
        </div>
        <div className="archive-date">
          <span>雾港标准时间</span>
          <strong>
            {state.ending ? '06' : '23'}
            <span>:</span>
            {state.ending ? '00' : '17'}
          </strong>
          <small>
            {state.ending ? '1999.11.18' : '1999.11.17'} <span>{state.ending ? 'THU' : 'WED'}</span>
          </small>
        </div>
      </section>
      <section className="hero-dossier">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="status-dot" />
            一份仍在续写的失踪档案<span className="hero-classification">绝密 → 已解封</span>
          </div>
          <h2>
            这座城市，
            <br />
            {state.ending ? '终于等到' : '从未真正'}
            <span>{state.ending ? '明天。' : '消失。'}</span>
          </h2>
          <p>
            1999 年，雾港从所有地图上被抹去。
            <br />
            二十七年后，你收到了一段来自那里的广播。
          </p>
          <Link to={next ? `/case/${next.id}` : '/ending'} className="button button-coral">
            {completed
              ? next
                ? '继续调查'
                : state.ending
                  ? '回看你的结局'
                  : '走向最后的选择'
              : '接收第一条线索'}
            <Icon name="arrowRight" size={18} />
          </Link>
          <div className="hero-smallprint">
            <Icon name="headphones" size={14} />
            <span>不需要解谜经验，只需要一点好奇心。</span>
          </div>
        </div>
        <div className="hero-map">
          <div className="hero-map-label">
            <span>雾港 / WUGANG</span>
            <span className="map-signal">
              <i />
              SIGNAL FOUND
            </span>
          </div>
          <CityMap />
          <div className="hero-map-caption">
            <span>01 / 旧广播大楼</span>
            <span>点击左侧按钮，进入档案</span>
          </div>
        </div>
        <div className="hero-bottom-strip">
          <span>
            <Icon name="fingerprint" size={13} /> CASE NO. WG—1999—1117
          </span>
          <span>
            城市已被遗忘。<b>记忆没有。</b>
          </span>
          <span>
            ARCHIVE STATUS: <i>ACTIVE</i>
          </span>
        </div>
      </section>
      <section className="stats-grid" aria-label="调查概况">
        <div className="stat-card">
          <div className="stat-label">
            <span>主线复原进度</span>
            <Icon name="orbit" size={17} />
          </div>
          <div className="stat-main">
            <strong>{String(completed).padStart(2, '0')}</strong>
            <span>/ {mainPuzzles.length} 份档案</span>
            <b>{percent}%</b>
          </div>
          <div className="segmented-progress">
            {Array.from({ length: 30 }, (_, i) => (
              <i key={i} className={i < percent * 0.3 ? 'filled' : ''} />
            ))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <span>已收集的记忆碎片</span>
            <Icon name="fingerprint" size={17} />
          </div>
          <div className="stat-main">
            <strong>{String(evidenceCount).padStart(2, '0')}</strong>
            <span>枚线索</span>
            <Link to="/evidence" aria-label="打开证据墙">
              <Icon name="arrowUpRight" size={18} />
            </Link>
          </div>
          <p>每一份记忆，都让城市清晰一点。</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <span>当前调查地点</span>
            <Icon name="pin" size={17} />
          </div>
          <div className="stat-place">
            <strong>
              {chapters.find((chapter) => chapter.id === next?.chapter)?.location ?? '中央发射塔'}
            </strong>
            <span className="status-dot" />
          </div>
          <p>
            {next
              ? `${String(next.number).padStart(3, '0')} / ${next.title}`
              : '所有主线信号已恢复'}
          </p>
        </div>
      </section>
      <div className="dashboard-lower">
        <section className="current-cases">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FOLLOW THE SIGNAL</span>
              <h2>{completed ? '沿着线索，继续前行' : '从一封信开始'}</h2>
            </div>
            <Link to="/archives" className="text-link">
              全部档案
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <div className="case-grid home-case-grid">
            {displayCases.map((puzzle, index) => (
              <PuzzleCard key={puzzle.id} puzzle={puzzle} featured={index === 0} />
            ))}
          </div>
        </section>
        <aside className="notice-board">
          <div className="notice-pin" />
          <div className="notice-heading">
            <span className="eyebrow">A NOTE FOR YOU</span>
            <Icon name="file" size={18} />
          </div>
          <h3>
            给新来的
            <br />
            夜班档案员
          </h3>
          <p>
            这里的时间停在 23:17。
            <br />
            但你不必着急。
          </p>
          <p>
            多看一眼被划掉的字，
            <br />
            多听一次无人回应的广播。
            <br />
            有时，答案就在留白里。
          </p>
          <div className="notice-signature">—— 林雀</div>
          <div className="notice-foot">
            <span className="status-dot" />
            需要帮助时，每关都有三层提示。
          </div>
        </aside>
      </div>
      <section className="chapter-strip">
        <div>
          <Icon name="compass" size={20} />
          <span>你的调查路线</span>
          <small>THE INVESTIGATION</small>
        </div>
        <div className="chapter-strip-stops">
          {chapters
            .filter((chapter) => chapter.id !== 'side')
            .map((chapter) => {
              const items = puzzles.filter((puzzle) => puzzle.chapter === chapter.id)
              const available = items.some((puzzle) => getStatus(puzzle, state) !== 'locked')
              const done = items.length > 0 && items.every((puzzle) => state.solved[puzzle.id])
              return (
                <Link
                  to={`/archives?chapter=${chapter.id}`}
                  key={chapter.id}
                  className={done ? 'done' : available ? 'current' : ''}
                >
                  <span>{done ? <Icon name="check" size={12} /> : chapter.number}</span>
                  <small>{chapter.title}</small>
                </Link>
              )
            })}
        </div>
      </section>
      <Link to="/field" className="field-banner">
        <span className="field-banner-icon">
          <Icon name="radio" size={25} />
        </span>
        <div>
          <strong>主线之外，还有一些声音。</strong>
          <p>进入异常接收站，截获一份新的神秘电报。</p>
        </div>
        <span className="field-live">
          <span className="status-dot" />
          开放接收
        </span>
        <Icon name="arrowUpRight" size={22} />
      </Link>
    </div>
  )
}
