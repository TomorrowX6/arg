import { useState } from 'react'
import type { Artifact } from '../game/types'
import { caesar, decodeBase64, decodeVigenere, decodeXor } from '../game/mechanics'
import { Icon } from './Icon'

const labels: Record<string, string> = {
  caesar: '字母移位器',
  base64: 'Base64 解码器',
  vigenere: '维吉尼亚解码器',
  xor: '逐字节异或工具',
}

export function CipherTool({ artifact }: { artifact: Artifact }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const [key, setKey] = useState('')
  const [decoded, setDecoded] = useState('')
  const [error, setError] = useState('')
  const tool = artifact.config?.tool as string | undefined
  if (!tool || !labels[tool]) return null
  const result = tool === 'caesar' ? caesar(artifact.code ?? '', shift) : decoded
  function decode() {
    try {
      const source = artifact.code ?? ''
      setDecoded(
        tool === 'xor'
          ? decodeXor(source, key)
          : tool === 'vigenere'
            ? decodeVigenere(source, key)
            : decodeBase64(source),
      )
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '暂时无法解码，请检查输入。')
    }
  }
  return (
    <div className="inline-tool">
      <button className="text-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="key" size={15} />
        {open ? '收起' : '打开'}
        {labels[tool]}
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="inline-tool-body">
          {tool === 'caesar' ? (
            <label>
              字母位移
              <strong>
                {shift > 0 ? '+' : ''}
                {shift}
              </strong>
              <input
                type="range"
                min="-25"
                max="25"
                value={shift}
                onChange={(event) => setShift(Number(event.target.value))}
                aria-label="字母位移"
              />
            </label>
          ) : (
            <>
              {(tool === 'xor' || tool === 'vigenere') && (
                <label className="cipher-key-input">
                  {tool === 'xor' ? '十六进制密钥' : '字母密钥'}
                  <input
                    value={key}
                    onChange={(event) => {
                      setKey(event.target.value)
                      setDecoded('')
                      setError('')
                    }}
                    placeholder={tool === 'xor' ? '例如 2A' : '例如 ECHO'}
                    maxLength={100}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}
              <button
                className="button button-ghost button-small"
                onClick={decode}
                disabled={(tool === 'xor' || tool === 'vigenere') && !key.trim()}
              >
                还原这段编码
                <Icon name="arrowRight" size={14} />
              </button>
            </>
          )}
          <output className={`decoded-output ${error ? 'tool-error' : ''}`} aria-live="polite">
            {error || result || '译文将显示在这里'}
          </output>
        </div>
      )}
    </div>
  )
}
