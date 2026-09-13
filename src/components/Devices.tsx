import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { Artifact } from '../game/types'
import { useGame } from '../game/useGame'
import { getAudioContext, MORSE, playTone } from '../game/audio'
import { toggleLights, runTerminal } from '../game/mechanics'
import { Icon } from './Icon'

export function FrequencyDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { min: number; max: number; target: number; message: string }
  const [frequency, setFrequency] = useState(config.min)
  const { state } = useGame()
  const distance = Math.abs(frequency - config.target)
  const locked = distance < 0.051
  const strength = Math.max(3, Math.round(100 - distance * 19))
  function tune(value: number) {
    setFrequency(Math.round(value * 10) / 10)
    if (state.settings.sound) playTone(180 + value * 2, 0.035, 0.02)
  }
  return (
    <div className="frequency-device">
      <div className="device-top">
        <span>ECHO ELECTRONICS</span>
        <span>FM / STEREO</span>
      </div>
      <div className={`frequency-display ${locked ? 'locked' : ''}`}>
        <span className="frequency-fm">FM</span>
        <strong>{frequency.toFixed(1)}</strong>
        <span>MHz</span>
        <div
          className="signal-bars"
          role="meter"
          aria-label="信号强度"
          aria-valuenow={strength}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <i
              key={i}
              className={strength > i * 12.5 ? 'active' : ''}
              style={{ height: 8 + i * 3 }}
            />
          ))}
        </div>
      </div>
      <div className="frequency-scale">
        {[88, 92, 96, 100, 104, 108].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step="0.1"
        value={frequency}
        onChange={(event) => tune(Number(event.target.value))}
        aria-label="FM 频率"
        aria-valuetext={`${frequency.toFixed(1)} MHz，${locked ? '信号清晰' : '信号未锁定'}`}
      />
      <div className="frequency-buttons">
        <button
          onClick={() => tune(Math.max(config.min, frequency - 0.1))}
          aria-label="频率降低 0.1 MHz"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <span>
          <span className={`status-dot ${locked ? '' : 'dim'}`} />
          {locked ? 'SIGNAL LOCKED' : 'SEARCHING FOR SIGNAL'}
        </span>
        <button
          onClick={() => tune(Math.min(config.max, frequency + 0.1))}
          aria-label="频率提高 0.1 MHz"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
      <div className={`device-message ${locked ? 'revealed' : ''}`} role="status">
        {locked
          ? config.message
          : distance < 1.5
            ? '……沙沙……有人正在附近的频道讲话……'
            : '……沙沙……只有遥远的海浪和电流声……'}
      </div>
    </div>
  )
}

export function LightsDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { size: number; initial: number[]; message: string }
  const [board, setBoard] = useState(config.initial)
  const [moves, setMoves] = useState(0)
  const { state } = useGame()
  const solved = board.every((light) => !light)
  function toggle(index: number) {
    setBoard((previous) => toggleLights(previous, config.size, index))
    setMoves((count) => count + 1)
    if (state.settings.sound) playTone(240 + index * 40, 0.08, 0.025)
  }
  return (
    <div className="lights-device">
      <div className="device-top">
        <span>AUXILIARY POWER</span>
        <span>{moves.toString().padStart(2, '0')} 次操作</span>
      </div>
      <div className="lights-grid" style={{ gridTemplateColumns: `repeat(${config.size},1fr)` }}>
        {board.map((light, index) => (
          <button
            key={index}
            className={light ? 'on' : 'off'}
            onClick={() => toggle(index)}
            aria-label={`第 ${Math.floor(index / config.size) + 1} 行第 ${(index % config.size) + 1} 列，${light ? '亮' : '灭'}`}
            aria-pressed={!!light}
          >
            <span />
            <small>{String(index + 1).padStart(2, '0')}</small>
          </button>
        ))}
      </div>
      <div className="device-controls">
        <span>
          <span className={`status-dot ${solved ? '' : 'dim'}`} />
          {solved ? '安全模式已启动' : `${board.filter(Boolean).length} 盏灯仍亮着`}
        </span>
        <button
          className="text-button"
          onClick={() => {
            setBoard([...config.initial])
            setMoves(0)
          }}
        >
          <Icon name="reset" size={14} />
          重置电路
        </button>
      </div>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved ? config.message : '点击一盏灯，会翻转它与上下左右相邻的灯。目标：全部熄灭。'}
      </p>
    </div>
  )
}

export function MorseDevice({ artifact }: { artifact: Artifact }) {
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(-1)
  const [showTable, setShowTable] = useState(false)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])
  const oscillators = useRef<OscillatorNode[]>([])
  function stop() {
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    oscillators.current.forEach((osc) => {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
    })
    oscillators.current = []
    setPlaying(false)
    setActive(-1)
  }
  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout)
      oscillators.current.forEach((osc) => {
        try {
          osc.stop()
        } catch {
          /* already stopped */
        }
      })
    },
    [],
  )
  function play() {
    stop()
    setPlaying(true)
    const audio = getAudioContext()
    let cursor = 0
    const unit = 0.13
    const groups = artifact.code!.split('/').map((group) => group.trim())
    for (const [index, group] of groups.entries()) {
      timeouts.current.push(setTimeout(() => setActive(index), cursor * 1000))
      for (const symbol of group) {
        if (symbol !== '.' && symbol !== '-') continue
        const duration = symbol === '.' ? unit : unit * 3
        if (audio) {
          const osc = audio.createOscillator()
          const gain = audio.createGain()
          const start = audio.currentTime + cursor
          osc.frequency.value = 620
          gain.gain.setValueAtTime(0, start)
          gain.gain.linearRampToValueAtTime(0.055, start + 0.008)
          gain.gain.setValueAtTime(0.055, start + duration - 0.01)
          gain.gain.linearRampToValueAtTime(0, start + duration)
          osc.connect(gain)
          gain.connect(audio.destination)
          osc.start(start)
          osc.stop(start + duration + 0.01)
          oscillators.current.push(osc)
        }
        cursor += duration + unit
      }
      cursor += unit * 2
    }
    timeouts.current.push(
      setTimeout(() => {
        setPlaying(false)
        setActive(-1)
      }, cursor * 1000),
    )
  }
  return (
    <div className="morse-device">
      <div className="morse-tape">
        {artifact.code!.split('/').map((group, index) => (
          <span key={index} className={active === index ? 'active' : ''}>
            {group.trim().replace(/\./g, '·').replace(/-/g, '−')}
          </span>
        ))}
      </div>
      <div className="device-controls">
        <button className="button button-dark button-small" onClick={playing ? stop : play}>
          <Icon name={playing ? 'pause' : 'play'} size={15} />
          {playing ? '停止播放' : '播放电码'}
        </button>
        <button
          className="text-button"
          onClick={() => setShowTable(!showTable)}
          aria-expanded={showTable}
        >
          <Icon name="book" size={15} />
          {showTable ? '收起译码卡' : '展开译码卡'}
          <Icon name="chevronDown" size={13} />
        </button>
      </div>
      <p className="artifact-annotation">{artifact.annotation}</p>
      {showTable && (
        <div className="morse-table">
          {Object.entries(MORSE).map(([letter, code]) => (
            <div key={letter}>
              <strong>{letter}</strong>
              <code>{code.replace(/\./g, '·').replace(/-/g, '−')}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TerminalDevice({ artifact }: { artifact: Artifact }) {
  const files = (artifact.config as { files: Record<string, string> }).files
  const [history, setHistory] = useState<{ command: string; output: string }[]>([])
  const [command, setCommand] = useState('')
  const [cursor, setCursor] = useState(-1)
  const outputRef = useRef<HTMLDivElement>(null)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!command.trim()) return
    if (command.trim() === 'clear') setHistory([])
    else
      setHistory((previous) => [
        ...previous.slice(-49),
        { command, output: runTerminal(command, files) },
      ])
    setCommand('')
    setCursor(-1)
  }
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'instant' })
  }, [history])
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = Math.min(cursor + 1, history.length - 1)
      setCursor(next)
      setCommand(history[history.length - 1 - next]?.command ?? '')
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = Math.max(cursor - 1, -1)
      setCursor(next)
      setCommand(next < 0 ? '' : (history[history.length - 1 - next]?.command ?? ''))
    }
    if (event.key === 'Tab' && command.startsWith('cat ')) {
      const prefix = command.slice(4)
      const matches = Object.keys(files).filter((file) => file.startsWith(prefix))
      if (matches.length === 1) {
        event.preventDefault()
        setCommand(`cat ${matches[0]}`)
      }
    }
  }
  return (
    <div className="terminal-device">
      <div className="terminal-titlebar">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>guest_014@archive: ~</span>
        <Icon name="terminal" size={13} />
      </div>
      <div className="terminal-output" ref={outputRef} role="log" aria-label="终端输出">
        <p className="terminal-welcome">
          ECHO ARCHIVE OS [Version 1.9.99]
          <br />
          上次登录：1999-11-17 23:16:59
          <br />
          <span>输入 help 获取帮助。试试 ls。</span>
        </p>
        {history.map((entry, index) => (
          <div key={index} className="terminal-entry">
            <p>
              <span>guest_014:~$</span> {entry.command}
            </p>
            <pre>{entry.output}</pre>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="terminal-input">
        <span aria-hidden="true">❯</span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={keyDown}
          aria-label="终端命令"
          placeholder="输入命令，按 Enter 执行"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={500}
        />
        <button type="submit" aria-label="执行命令">
          <Icon name="send" size={15} />
        </button>
      </form>
    </div>
  )
}
