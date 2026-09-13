import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ArtifactView } from '../components/ArtifactView'
import { archiveDate, generateFieldPuzzle } from '../game/field'
import { normalizeAnswer } from '../game/answers'
import { useGame } from '../game/useGame'
import { playSuccess } from '../game/audio'
import {
  FIELD_MAX_INDEX,
  generateFieldV2,
  isArchiveDate,
  matchesChannel,
  nextFieldIndex,
} from '../game/field-v2'
import type { FieldChannel } from '../game/field-v2'
import { archiveTools } from '../data/tools'
import '../styles/field-v2.css'

export default function FieldStation() {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => archiveDate())
  const requestedDate = params.get('date')
  const date = requestedDate && isArchiveDate(requestedDate) ? requestedDate : today
  const version =
    params.get('v') === '1' || (!params.has('v') && (params.has('date') || params.has('n'))) ? 1 : 2
  const requestedChannel = params.get('channel')
  const channel: FieldChannel =
    requestedChannel === 'cipher' || requestedChannel === 'device' ? requestedChannel : 'all'
  const maxIndex = version === 1 ? 99999 : FIELD_MAX_INDEX
  const parsed = Number(params.get('n') ?? 0)
  const index = Number.isFinite(parsed) ? Math.max(0, Math.min(maxIndex, Math.floor(parsed))) : 0
  const next =
    version === 1 ? (index < maxIndex ? index + 1 : null) : nextFieldIndex(index, channel)
  const previous =
    version === 1 ? (index > 0 ? index - 1 : null) : nextFieldIndex(index, channel, -1)
  function go(nextIndex: number, nextDate = date, nextVersion = version, nextChannel = channel) {
    setParams({
      date: nextDate,
      n: String(nextIndex),
      v: String(nextVersion),
      ...(nextChannel === 'all' ? {} : { channel: nextChannel }),
    })
  }
  return (
    <FieldReader
      key={`${version}-${date}-${index}`}
      date={date}
      index={index}
      version={version}
      channel={channel}
      next={next === null ? undefined : () => go(next)}
      previous={previous === null ? undefined : () => go(previous)}
      tune={(date, index) => go(index, date, version, 'all')}
      changeChannel={(nextChannel) =>
        go(
          matchesChannel(index, nextChannel)
            ? index
            : (nextFieldIndex(index - 1, nextChannel) ??
                nextFieldIndex(index + 1, nextChannel, -1) ??
                0),
          date,
          2,
          nextChannel,
        )
      }
      upgrade={() => go(0, date, 2, 'all')}
    />
  )
}

function FieldReader({
  date,
  index,
  version,
  channel,
  next,
  previous,
  tune,
  changeChannel,
  upgrade,
}: {
  date: string
  index: number
  version: number
  channel: FieldChannel
  next?: () => void
  previous?: () => void
  tune: (date: string, index: number) => void
  changeChannel: (channel: FieldChannel) => void
  upgrade: () => void
}) {
  const puzzle = useMemo(
    () => (version === 1 ? generateFieldPuzzle(date, index) : generateFieldV2(date, index)),
    [date, index, version],
  )
  const { state, dispatch } = useGame()
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [tuneDate, setTuneDate] = useState(date)
  const [tuneNumber, setTuneNumber] = useState(String(index + 1))
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
    const url = new URL(window.location.href)
    url.hash = `/field?date=${date}&n=${index}&v=${version}${channel === 'all' ? '' : `&channel=${channel}`}`
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      setShareUrl('')
    } catch {
      setShareUrl(url.toString())
      setFeedback('未能自动复制。完整电报链接已显示，可以手动复制。')
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
          <p>主线之外的密码与机关。每份信号，都是一场小小的调查。</p>
        </div>
        <div className="page-count">
          <strong>{(state.dailySolved[date] ?? []).length.toString().padStart(2, '0')}</strong>
          <span>本日已还原电报</span>
        </div>
      </header>
      {version === 1 ? (
        <div className="field-legacy">
          <Icon name="archive" size={19} />
          <p>这是一份先前分享的电报，内容会保持一致。新的接收频道已加入更多密码与机关。</p>
          <button className="button button-ghost button-small" onClick={upgrade}>
            进入新频道
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      ) : (
        <div className="field-channel-bar" role="group" aria-label="接收频道">
          {[
            { id: 'all', label: '全部信号', icon: 'radio' },
            { id: 'cipher', label: '密码电报', icon: 'key' },
            { id: 'device', label: '机关信号', icon: 'grid' },
          ].map((item) => (
            <button
              key={item.id}
              className={channel === item.id ? 'active' : ''}
              aria-pressed={channel === item.id}
              onClick={() => changeChannel(item.id as FieldChannel)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
          <span>24 种谜面 · 每份信号可分享</span>
        </div>
      )}
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
        {shareUrl && (
          <label className="field-share-fallback">
            这份电报的完整链接
            <input value={shareUrl} readOnly onFocus={(event) => event.target.select()} />
          </label>
        )}
        <h2>{puzzle.title}</h2>
        <p className="field-briefing">{puzzle.briefing}</p>
        <ArtifactView artifact={puzzle.artifact} />
        {puzzle.artifact.code && (
          <Link
            className="field-tool-link"
            to={`/tools?${new URLSearchParams({ method: puzzle.artifact.type === 'morse' ? 'morse' : (archiveTools.find((tool) => tool.id === puzzle.artifact.config?.tool)?.id ?? 'base64'), input: puzzle.artifact.code, returnTo: `/field?date=${date}&n=${index}&v=${version}${channel === 'all' ? '' : `&channel=${channel}`}` }).toString()}`}
          >
            <Icon name="key" size={16} />
            <span>把这段资料带到解码工具箱</span>
            <Icon name="arrowUpRight" size={16} />
          </Link>
        )}
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
          <div className="field-paging">
            <button
              className="button button-ghost field-previous"
              onClick={previous}
              disabled={!previous}
              aria-label="接收上一份"
            >
              <Icon name="arrowLeft" size={16} />
            </button>
            <button
              className={`button ${solved ? 'button-coral' : 'button-ghost'}`}
              onClick={next}
              disabled={!next}
            >
              接收下一份
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </div>
      </div>
      <details className="field-tuning">
        <summary>
          <Icon name="compass" size={17} />
          调取指定日期与编号
          <Icon name="chevronDown" size={15} />
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const number = Number(tuneNumber),
              max = version === 1 ? 100000 : FIELD_MAX_INDEX + 1
            if (
              !isArchiveDate(tuneDate) ||
              !Number.isInteger(number) ||
              number < 1 ||
              number > max
            ) {
              setFeedback('请填写有效日期与接收编号。')
              return
            }
            tune(tuneDate, number - 1)
          }}
        >
          <label>
            接收日期
            <input
              type="date"
              value={tuneDate}
              onChange={(event) => setTuneDate(event.target.value)}
              required
            />
          </label>
          <label>
            电报编号
            <input
              type="number"
              min="1"
              max={version === 1 ? 100000 : FIELD_MAX_INDEX + 1}
              step="1"
              value={tuneNumber}
              onChange={(event) => setTuneNumber(event.target.value)}
              required
            />
          </label>
          <button className="button button-dark button-small">
            调取电报
            <Icon name="arrowRight" size={14} />
          </button>
        </form>
        <p>同一天、同一编号对应同一份信号。编号从 1 开始，可以回看已经还原的电报。</p>
      </details>
      <p className="field-footnote">
        <Icon name="shield" size={14} />
        同一天、同一编号的电报内容一致。这里的练习不影响主线，也不改变结局。
      </p>
    </div>
  )
}
