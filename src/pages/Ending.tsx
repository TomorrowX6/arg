import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mainPuzzles, getNextPuzzle } from '../data/archive'
import { endings } from '../data/endings'
import { useGame } from '../game/useGame'
import { Icon } from '../components/Icon'
import { DawnIllustration } from '../components/DawnIllustration'
import '../styles/ending.css'

export default function Ending() {
  const { state, dispatch } = useGame()
  const complete = mainPuzzles.every((puzzle) => state.solved[puzzle.id])
  const [choosing, setChoosing] = useState(!state.ending)
  const selected = endings.find((ending) => ending.id === state.ending)
  const next = getNextPuzzle(state)
  if (!complete)
    return (
      <div className="page">
        <div className="locked-case">
          <div className="lock-emblem">
            <Icon name="sun" size={40} />
          </div>
          <div className="eyebrow">THE DAWN IS STILL AHEAD</div>
          <h1>还有一些声音，等你听见。</h1>
          <p>完成六章主线调查后，发射塔会向你开放最后的选择。</p>
          <Link className="button button-dark" to={next ? `/case/${next.id}` : '/archives'}>
            继续你的调查
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </div>
    )
  return (
    <div className="page ending-page">
      <div className="ending-kicker">
        <span className="status-dot" />
        ALL SIGNALS RESTORED / {mainPuzzles.length} OF {mainPuzzles.length}
      </div>
      <h1>{choosing || !selected ? '明天，以什么方式开始？' : '这座城市，终于等到明天。'}</h1>
      <p className="ending-lead">
        {choosing || !selected
          ? '你已找回每个人选择的权利。现在，决定你想如何陪伴他们。'
          : '第一份档案已经合上。有些故事，从这里才刚刚开始。'}
      </p>
      <div className="ending-panorama">
        <DawnIllustration />
      </div>
      {choosing || !selected ? (
        <>
          <div className="ending-principle">
            <Icon name="key" size={22} />
            <p>
              无论哪一条路，居民都有权留下、离开或暂不回答。
              <br />
              这三个结局都可以回看，已完成的调查会保留。
            </p>
          </div>
          <div className="ending-choices">
            {endings.map((ending) => (
              <article key={ending.id}>
                <div className="ending-choice-top">
                  <span>{ending.number}</span>
                  <Icon name={ending.icon} size={25} />
                </div>
                <small>{ending.subtitle}</small>
                <h2>{ending.title}</h2>
                <p>{ending.description}</p>
                <button
                  className="button button-dark"
                  onClick={() => {
                    dispatch({ type: 'ending', ending: ending.id })
                    setChoosing(false)
                    window.scrollTo({
                      top: 0,
                      behavior: state.settings.reducedMotion ? 'instant' : 'smooth',
                    })
                  }}
                >
                  选择这条路
                  <Icon name="arrowRight" size={16} />
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <article className="ending-story">
          <div className="eyebrow">
            ENDING {selected.number} / {selected.subtitle}
          </div>
          <h2>{selected.title}</h2>
          <blockquote>{selected.quote}</blockquote>
          {selected.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <div className="ending-last-line">
            <span>—</span>
            <p>{selected.lastLine}</p>
          </div>
          <div className="ending-signature">
            你的调查，已归档。
            <br />
            <strong>夜班档案员 / NO. 014</strong>
          </div>
          <div className="ending-review">
            <span>
              <strong>{mainPuzzles.length}</strong>份主线档案
            </span>
            <span>
              <strong>{state.notes.length}</strong>篇手记
            </span>
            <span>
              <strong>{state.bookmarked.length}</strong>份收藏
            </span>
          </div>
          <div className="ending-actions">
            <Link to="/evidence" className="button button-dark">
              回看记忆碎片
              <Icon name="fingerprint" size={16} />
            </Link>
            <button className="button button-ghost" onClick={() => setChoosing(true)}>
              看看另一条路
              <Icon name="reset" size={16} />
            </button>
          </div>
        </article>
      )}
      <div className="ending-afterword">
        <Icon name="radio" size={23} />
        <div>
          <h3>故事之外，信号仍在继续。</h3>
          <p>异常档案与接收站里，还有其他人的小小谜题。</p>
        </div>
        <Link to="/field" className="text-link">
          继续接收
          <Icon name="arrowUpRight" size={17} />
        </Link>
      </div>
    </div>
  )
}
