import { useState } from 'react'
import type { Artifact } from '../game/types'
import { mixStencils, readPixelText } from '../game/observatory'
import { Icon } from './Icon'

interface StencilConfig {
  rows: number
  columns: number
  layers: { label: string; bits: string }[]
}
function Pixels({ bits, rows, columns }: { bits: string; rows: number; columns: number }) {
  return (
    <svg viewBox={`0 0 ${columns} ${rows}`} aria-hidden="true" shapeRendering="crispEdges">
      <rect width={columns} height={rows} className="stencil-paper" />
      {[...bits].map(
        (bit, index) =>
          bit === '1' && (
            <rect
              key={index}
              x={index % columns}
              y={Math.floor(index / columns)}
              width={1}
              height={1}
              className="stencil-ink"
            />
          ),
      )}
    </svg>
  )
}
export function StencilDevice({ artifact }: { artifact: Artifact }) {
  const { layers, rows, columns } = artifact.config as unknown as StencilConfig
  const [selected, setSelected] = useState<number[]>([])
  const [readout, setReadout] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const bits = mixStencils(
    layers.map((layer) => layer.bits),
    selected,
  )
  function toggle(index: number) {
    setSelected(
      selected.includes(index)
        ? selected.filter((value) => value !== index)
        : [...selected, index].sort((a, b) => a - b),
    )
    setReadout(null)
    setFeedback('')
  }
  return (
    <div className="stencil-device observatory-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="copy" size={15} />
          七张叠片，一束天光
        </span>
        <strong>
          {selected.length}/{layers.length} 张已放入
        </strong>
      </div>
      <p className="observatory-instruction">
        同一格里，黑点出现奇数次留下黑色，出现偶数次相互抵消。按前一份档案给出的序号选择叠片。
      </p>
      <div className="stencil-layers" role="group" aria-label="可选显影叠片">
        {layers.map((layer, index) => (
          <button
            key={index}
            className={selected.includes(index) ? 'selected' : ''}
            onClick={() => toggle(index)}
            aria-pressed={selected.includes(index)}
            aria-label={`叠片 ${index + 1}，${layer.label}`}
          >
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i>
                {selected.includes(index) ? (
                  <Icon name="check" size={13} />
                ) : (
                  <Icon name="plus" size={13} />
                )}
              </i>
            </header>
            <Pixels bits={layer.bits} rows={rows} columns={columns} />
            <strong>{layer.label}</strong>
          </button>
        ))}
      </div>
      <section className="stencil-lightbox" aria-label="叠片显影结果">
        <div>
          <span>COMBINED EXPOSURE</span>
          <span>
            {selected.length ? selected.map((index) => index + 1).join(' ⊕ ') : '尚未放入叠片'}
          </span>
        </div>
        <Pixels bits={bits} rows={rows} columns={columns} />
        <p>
          {selected.length
            ? `${rows} 行 × ${columns} 列 · 逐格异或显影`
            : '从上方选择叠片，让散落的黑点重新组成文字。'}
        </p>
      </section>
      <div className="stencil-read-actions">
        <button
          className="button button-dark button-small"
          disabled={!selected.length}
          onClick={() => {
            const text = readPixelText(bits, rows, columns)
            setReadout(text)
            setFeedback(text ? '' : '目前还不是完整的像素字。检查叠片序号，或试着取下一张。')
          }}
        >
          <Icon name="eye" size={15} />
          读取像素文字
        </button>
        <button
          className="text-button"
          disabled={!selected.length}
          onClick={() => {
            setSelected([])
            setReadout(null)
            setFeedback('叠片已全部取下。')
          }}
        >
          全部取下
        </button>
      </div>
      <details className="stencil-data">
        <summary>查看逐格零一矩阵</summary>
        <p>1 表示黑点，0 表示空白。此矩阵来自所选叠片的实际运算。</p>
        <textarea
          rows={rows}
          readOnly
          aria-label="叠片结果，零一矩阵"
          value={Array.from({ length: rows }, (_, row) =>
            bits.slice(row * columns, (row + 1) * columns),
          ).join('\n')}
          spellCheck={false}
        />
      </details>
      <div className={`device-result ${readout ? 'is-visible' : ''}`} role="status">
        {readout ? (
          <>
            <Icon name="check" size={17} />
            显影文字：<strong>{readout}</strong>
          </>
        ) : (
          feedback
        )}
      </div>
    </div>
  )
}
