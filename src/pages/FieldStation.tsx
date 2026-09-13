import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ArtifactView } from '../components/ArtifactView'
import { archiveDate, generateFieldPuzzle } from '../game/field'
import { normalizeAnswer } from '../game/answers'
import { useGame } from '../game/useGame'
import { playSuccess } from '../game/audio'

export default function FieldStation() {
  const [params, setParams] = useSearchParams()
  const requestedDate = params.get('date')
  const date =
    requestedDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
    Number.isFinite(Date.parse(requestedDate))
      ? requestedDate
      : archiveDate()
  const parsed = Number(params.get('n') ?? 0)
  const index = Number.isFinite(parsed) ? Math.max(0, Math.min(99999, Math.floor(parsed))) : 0
  return (
    <FieldReader
      key={`${date}-${index}`}
      date={date}
      index={index}
      next={() => setParams({ date, n: String(index + 1) })}
    />
  )
}

function FieldReader({ date, index, next }: { date: string; index: number; next: () => void }) {
  const puzzle = generateFieldPuzzle(date, index)
  const { state, dispatch } = useGame()
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const solved = (state.dailySolved[date] ?? []).includes(puzzle.id)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (normalizeAnswer(answer) === normalizeAnswer(puzzle.answer)) {
      dispatch({ type: 'daily', date, id: puzzle.id })
      setFeedback('')
      if (state.settings.sound) playSuccess()
    } else setFeedback('信号尚未对齐。检查一下字母的方向或顺序。')
  }
  async function share() {
    try {
      const url = new URL(window.location.href)
      url.hash = `/field?date=${date}&n=${index}`
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
    } catch {
      setFeedback('暂时无法复制。你也可以直接复制浏览器地址，与朋友分享同一份电报。')
    }
  }
  return (
    <div className="page field-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">
            <span className="status-dot" />
            OPEN FREQUENCY / LIVE
          </div>
          <h1>总有新的声音，穿过寂静。</h1>
          <p>主线之外的短篇密码练习。随时接收，随时离开。</p>
        </div>
        <div className="page-count">
          <strong>{(state.dailySolved[date] ?? []).length.toString().padStart(2, '0')}</strong>
          <span>本日已还原电报</span>
        </div>
      </header>
      <div className="field-console-head">
        <Icon name="radio" size={24} />
        <div>
          <strong>异常接收站</strong>
          <span>开放频道 · 每日种子 {date}（UTC+8）</span>
        </div>
        <span className="field-console-id">TRANSMISSION #{String(index + 1).padStart(3, '0')}</span>
      </div>
      <div className="field-reader">
        <div className="field-reader-header">
          <span className="tag">{puzzle.method}</span>
          <button className="text-button" onClick={share}>
            <Icon name="copy" size={14} />
            {copied ? '链接已复制' : '分享这份电报'}
          </button>
        </div>
        <h2>{puzzle.title}</h2>
        <p className="field-briefing">{puzzle.briefing}</p>
        <ArtifactView artifact={puzzle.artifact} />
        {solved ? (
          <div className="field-solved" role="status">
            <span>
              <Icon name="check" size={25} />
            </span>
            <div>
              <strong>电报已还原：{puzzle.answer}</strong>
              <p>「{puzzle.meaning}」——某个你还不认识的人，留下了这个词。</p>
            </div>
          </div>
        ) : (
          <form className="field-answer" onSubmit={submit}>
            <label htmlFor="field-answer">输入还原后的英文校验词</label>
            <div className="answer-input-row">
              <input
                id="field-answer"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value)
                  setFeedback('')
                }}
                placeholder="忽略大小写和空格"
                maxLength={200}
                autoComplete="off"
              />
              <button className="button button-dark" disabled={!answer.trim()}>
                校验电报
                <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </form>
        )}
        <div className="answer-feedback" role="status">
          {feedback}
        </div>
        {hint > 0 && (
          <div className="field-hints">
            {puzzle.hints.slice(0, hint).map((text, i) => (
              <p key={i}>
                <span>提示 {i + 1}</span>
                {text}
              </p>
            ))}
          </div>
        )}
        <div className="field-reader-footer">
          {!solved && hint < 3 ? (
            <button className="text-button" onClick={() => setHint((n) => n + 1)}>
              <Icon name="lightbulb" size={15} />
              {hint === 2 ? '查看答案' : '接收一条提示'}（{hint}/3）
            </button>
          ) : (
            <span className="text-muted">没有倒计时，不必着急。</span>
          )}
          <button className={`button ${solved ? 'button-coral' : 'button-ghost'}`} onClick={next}>
            接收下一份
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
      <p className="field-footnote">
        <Icon name="shield" size={14} />
        同一天、同一编号的电报内容一致。这里的练习不影响主线，也不改变结局。
      </p>
    </div>
  )
}
