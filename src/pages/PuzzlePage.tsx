import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  chapters,
  getNextPuzzle,
  getStatus,
  kindLabels,
  puzzleById,
  puzzles,
} from '../data/archive'
import { useGame } from '../game/useGame'
import { checkAnswer } from '../game/answers'
import { playSuccess } from '../game/audio'
import { Icon } from '../components/Icon'
import { ArtifactView } from '../components/ArtifactView'
import { Modal } from '../components/Modal'

export default function PuzzlePage() {
  const { id } = useParams()
  const puzzle = id ? puzzleById[id] : undefined
  if (!puzzle)
    return (
      <div className="page not-found">
        <span className="eyebrow">FILE NOT FOUND</span>
        <h1>这份档案尚未归档。</h1>
        <p>也许是编号出了差错。回到目录，寻找仍在发送的信号。</p>
        <Link to="/archives" className="button button-dark">
          返回档案目录
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    )
  return <CaseReader key={puzzle.id} id={puzzle.id} />
}

function CaseReader({ id }: { id: string }) {
  const puzzle = puzzleById[id]
  const { state, dispatch } = useGame()
  const status = getStatus(puzzle, state)
  const chapter = chapters.find((item) => item.id === puzzle.chapter)!
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [checking, setChecking] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const revealedHints = state.hints[id] ?? 0
  const bookmarked = state.bookmarked.includes(id)
  const solved = status === 'solved'
  const next = getNextPuzzle(state)
  const chapterPuzzles = puzzles.filter((item) => item.chapter === puzzle.chapter)
  useEffect(() => {
    if (status !== 'locked') dispatch({ type: 'active', id })
  }, [id, status, dispatch])
  useEffect(() => {
    document.title = `${puzzle.title} — 余响档案馆`
    return () => {
      document.title = '余响档案馆 · 这座城市，从未真正消失。'
    }
  }, [puzzle.title])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (checking || !answer.trim() || solved) return
    setChecking(true)
    setFeedback('')
    try {
      if (await checkAnswer(id, answer, puzzle.answerHashes)) {
        dispatch({ type: 'solve', id })
        if (state.settings.sound) playSuccess()
      } else {
        dispatch({ type: 'attempt', id })
        setFeedback('这条线索还没有对上。再看看原始资料，或展开一条提示。')
      }
    } catch {
      setFeedback('答案暂时无法校验，请通过 localhost 或 HTTPS 打开网站后再试。')
    } finally {
      setChecking(false)
    }
  }
  function saveNote() {
    if (!noteText.trim()) return
    dispatch({
      type: 'note',
      note: {
        id: crypto.randomUUID(),
        title: `${puzzle.title} · 调查笔记`,
        text: noteText.trim(),
        puzzleId: id,
        updatedAt: new Date().toISOString(),
      },
    })
    setNoteOpen(false)
    setNoteText('')
    setNoteSaved(true)
  }
  if (status === 'locked')
    return (
      <div className="page">
        <Link to="/archives" className="back-link">
          <Icon name="arrowLeft" size={16} />
          返回档案目录
        </Link>
        <div className="locked-case">
          <div className="lock-emblem">
            <Icon name="lock" size={38} />
          </div>
          <span className="eyebrow">CASE {String(puzzle.number).padStart(3, '0')} / SEALED</span>
          <h1>{puzzle.title}</h1>
          <p>这份档案仍在封存中。先完成下面的调查，新的线索就会把你带到这里。</p>
          <div className="prerequisite-list">
            {(puzzle.requires ?? []).map((required) => {
              const item = puzzleById[required]
              return (
                <Link key={required} to={`/case/${required}`}>
                  <Icon name={state.solved[required] ? 'check' : 'file'} size={18} />
                  <span>{item?.title ?? required}</span>
                  <Icon name="arrowRight" size={17} />
                </Link>
              )
            })}
          </div>
          <Link to={next ? `/case/${next.id}` : '/archives'} className="button button-coral">
            前往当前调查
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </div>
    )
  return (
    <div className="page puzzle-page">
      <div className="case-breadcrumb">
        <Link to="/archives">
          <Icon name="arrowLeft" size={15} />
          档案目录
        </Link>
        <span>/</span>
        <Link to={`/archives?chapter=${chapter.id}`}>{chapter.title}</Link>
        <span>/</span>
        <span>CASE {String(puzzle.number).padStart(3, '0')}</span>
      </div>
      <header className="case-header">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            {chapter.number} / {chapter.subtitle}
          </div>
          <h1>{puzzle.title}</h1>
          <p>{puzzle.subtitle}</p>
          <div className="case-tags">
            <span>
              <Icon name="fingerprint" size={14} />
              {kindLabels[puzzle.kind]}
            </span>
            <span>
              <Icon name="clock" size={14} />
              {puzzle.minutes} 分钟左右
            </span>
            <span className="difficulty-dots" aria-label={`难度 ${puzzle.difficulty}，共 3 级`}>
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= puzzle.difficulty ? 'filled' : ''} />
              ))}
              <small>{['', '入门', '进阶', '挑战'][puzzle.difficulty]}</small>
            </span>
          </div>
        </div>
        <div className="case-header-actions">
          <button
            className={`button button-ghost button-small ${bookmarked ? 'is-bookmarked' : ''}`}
            onClick={() => dispatch({ type: 'bookmark', id })}
            aria-pressed={bookmarked}
          >
            <Icon name="bookmark" size={16} />
            {bookmarked ? '已收藏' : '收藏档案'}
          </button>
          <button className="button button-ghost button-small" onClick={() => setNoteOpen(true)}>
            <Icon name="book" size={16} />
            随手记
          </button>
        </div>
      </header>
      <div className="case-reader-grid">
        <div className="case-main">
          <section className="briefing">
            <div className="section-label">
              <span>01</span>
              <h2>调查简报</h2>
              <i />
            </div>
            {puzzle.briefing.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>
          <ArtifactView artifact={puzzle.artifact} />
          {solved ? (
            <section className="resolution-panel" aria-labelledby="resolution-title">
              <div className="resolution-icon">
                <Icon name="check" size={24} />
              </div>
              <span className="eyebrow">SIGNAL RESTORED</span>
              <h2 id="resolution-title" tabIndex={-1}>
                档案已复原。
              </h2>
              <p>{puzzle.resolution}</p>
              <div className="new-evidence">
                <Icon name={puzzle.evidence.symbol} size={23} />
                <div>
                  <small>已收入证据墙</small>
                  <strong>{puzzle.evidence.title}</strong>
                </div>
                <Link to="/evidence" className="icon-button" aria-label="查看证据墙">
                  <Icon name="arrowUpRight" size={18} />
                </Link>
              </div>
              <div className="resolution-actions">
                {next && next.id !== id ? (
                  <Link className="button button-coral" to={`/case/${next.id}`}>
                    继续调查：{next.title}
                    <Icon name="arrowRight" size={17} />
                  </Link>
                ) : (
                  <Link
                    className="button button-coral"
                    to={state.solved.f06 ? '/ending' : '/archives'}
                  >
                    {state.solved.f06 ? '查看你的结局' : '返回档案目录'}
                    <Icon name="arrowRight" size={17} />
                  </Link>
                )}
                <span>你让城市又清晰了一点。</span>
              </div>
            </section>
          ) : (
            <section className="answer-panel">
              <div className="section-label">
                <span>02</span>
                <h2>提交你的发现</h2>
                <i />
              </div>
              <form onSubmit={submit}>
                <label htmlFor="case-answer">{puzzle.question}</label>
                <p id="answer-format">{puzzle.answerFormat} · 忽略英文大小写和空格</p>
                <div className="answer-input-row">
                  <input
                    id="case-answer"
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value)
                      setFeedback('')
                    }}
                    placeholder="在这里输入你的发现…"
                    aria-describedby={`answer-format${feedback ? ' answer-feedback' : ''}`}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={500}
                    disabled={checking}
                  />
                  <button
                    className="button button-dark"
                    disabled={!answer.trim() || checking}
                    type="submit"
                  >
                    {checking ? '校验中…' : '验证线索'}
                    <Icon name="arrowRight" size={17} />
                  </button>
                </div>
                <div className="answer-feedback" id="answer-feedback" role="status">
                  {feedback && (
                    <>
                      <Icon name="help" size={16} />
                      <span>{feedback}</span>
                    </>
                  )}
                </div>
              </form>
              <div className="answer-foot">
                <Icon name="shield" size={14} />
                <span>没有时间限制，也没有尝试次数限制。</span>
              </div>
            </section>
          )}
        </div>
        <aside className="case-aside">
          <section className="hint-panel">
            <div className="hint-title">
              <span>
                <Icon name="lightbulb" size={19} />
                来自林雀的提示
              </span>
              <small>{revealedHints} / 3</small>
            </div>
            <p className="hint-intro">
              卡住时，换一个角度。
              <br />
              求助也是调查的一部分。
            </p>
            {puzzle.hints.slice(0, revealedHints).map((hint, index) => (
              <div className={`hint-item hint-${index + 1}`} key={index}>
                <span>{['思路方向', '具体方法', '完整解法'][index]}</span>
                <p>{hint}</p>
              </div>
            ))}
            {revealedHints < 3 && (
              <button className="hint-reveal" onClick={() => dispatch({ type: 'hint', id })}>
                <Icon name={revealedHints === 2 ? 'eye' : 'plus'} size={16} />
                {revealedHints === 2
                  ? '查看完整解法'
                  : revealedHints === 1
                    ? '再给我一点方向'
                    : '展开第一条提示'}
              </button>
            )}
            <small className="hint-foot">提示不会锁定任何内容或结局。</small>
          </section>
          <section className="case-metadata">
            <div className="eyebrow">ARCHIVE DETAILS</div>
            <dl>
              <div>
                <dt>档案编号</dt>
                <dd>EH—{id.toUpperCase()}</dd>
              </div>
              <div>
                <dt>归属章节</dt>
                <dd>{chapter.title}</dd>
              </div>
              <div>
                <dt>调查状态</dt>
                <dd className={solved ? 'text-green' : ''}>{solved ? '已复原' : '进行中'}</dd>
              </div>
              <div>
                <dt>相关线索</dt>
                <dd>{puzzle.tags.join(' / ')}</dd>
              </div>
            </dl>
          </section>
          <section className="chapter-case-list">
            <h3>本章档案</h3>
            {chapterPuzzles.map((item) => (
              <Link
                to={`/case/${item.id}`}
                key={item.id}
                className={item.id === id ? 'current' : ''}
              >
                <span>{String(item.number).padStart(2, '0')}</span>
                <strong>{item.title}</strong>
                <Icon
                  name={
                    state.solved[item.id]
                      ? 'check'
                      : getStatus(item, state) === 'locked'
                        ? 'lock'
                        : 'chevronRight'
                  }
                  size={14}
                />
              </Link>
            ))}
          </section>
          <div className="case-aside-note">
            <Icon name="book" size={18} />
            <p>
              零散的想法也值得留下。
              <br />
              用「随手记」把它钉在这份档案旁。
            </p>
            {noteSaved && <span role="status">笔记已保存到调查手记。</span>}
          </div>
        </aside>
      </div>
      {noteOpen && (
        <Modal title="留下一条调查笔记" onClose={() => setNoteOpen(false)}>
          <p className="modal-description">关联档案：{puzzle.title}</p>
          <label className="sr-only" htmlFor="quick-note">
            笔记内容
          </label>
          <textarea
            autoFocus
            id="quick-note"
            className="note-textarea"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            maxLength={20000}
            placeholder="你看到了什么？有哪些还没想通的联系？"
          />
          <div className="modal-actions">
            <button className="button button-ghost" onClick={() => setNoteOpen(false)}>
              取消
            </button>
            <button className="button button-dark" onClick={saveNote} disabled={!noteText.trim()}>
              保存笔记
              <Icon name="check" size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
