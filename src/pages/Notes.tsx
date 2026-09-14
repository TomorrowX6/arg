import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGame } from '../game/useGame'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { puzzleById } from '../data/archive'

export default function Notes() {
  const { state, dispatch } = useGame()
  const [params] = useSearchParams()
  const [selected, setSelected] = useState<string | null>(
    state.notes.find((note) => note.id === params.get('note'))?.id ?? state.notes[0]?.id ?? null,
  )
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const notes = state.notes.filter((note) =>
    `${note.title}${note.text}`.toLowerCase().includes(query.toLowerCase()),
  )
  const active = state.notes.find((note) => note.id === selected)
  function create() {
    const id = crypto.randomUUID()
    dispatch({
      type: 'note',
      note: { id, title: '未命名的调查', text: '', updatedAt: new Date().toISOString() },
    })
    setSelected(id)
    setQuery('')
  }
  function edit(field: 'title' | 'text', value: string) {
    if (active)
      dispatch({
        type: 'note',
        note: { ...active, [field]: value, updatedAt: new Date().toISOString() },
      })
  }
  return (
    <div className="page notes-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">FIELD NOTES / PERSONAL</div>
          <h1>好记性，不如一页手记。</h1>
          <p>记录猜想、草稿和未解的疑问。这是只属于你的调查空间。</p>
        </div>
        <button className="button button-dark" onClick={create}>
          <Icon name="plus" size={17} />
          新建手记
        </button>
      </header>
      <div className="notebook">
        <aside className="note-list">
          <label className="note-search">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索手记…"
              aria-label="搜索手记"
            />
          </label>
          <div className="note-list-count">
            {notes.length} 篇手记<span>自动保存</span>
          </div>
          {notes.map((note) => (
            <button
              key={note.id}
              className={selected === note.id ? 'active' : ''}
              onClick={() => setSelected(note.id)}
            >
              <div>
                <strong>{note.title || '未命名的调查'}</strong>
                {note.puzzleId && <Icon name="file" size={13} />}
              </div>
              <p>{note.text.slice(0, 80) || '还没有写下任何内容…'}</p>
              <small>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</small>
            </button>
          ))}
          {notes.length === 0 && (
            <p className="note-list-empty">
              {query ? '没有匹配的手记。' : '你的第一条猜想，值得写下来。'}
            </p>
          )}
        </aside>
        {active ? (
          <section className="note-editor">
            <div className="note-editor-toolbar">
              <span>
                <Icon name="check" size={14} />
                已保存到此设备
              </span>
              <button
                className="icon-button"
                onClick={() => setDeleteId(active.id)}
                aria-label="删除当前手记"
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
            <label className="sr-only" htmlFor="note-title">
              手记标题
            </label>
            <input
              id="note-title"
              className="note-title-input"
              value={active.title}
              onChange={(event) => edit('title', event.target.value)}
              maxLength={120}
              placeholder="未命名的调查"
            />
            {active.puzzleId && puzzleById[active.puzzleId] && (
              <Link className="note-related-case" to={`/case/${active.puzzleId}`}>
                <Icon name="file" size={14} />
                关联档案：{puzzleById[active.puzzleId].title}
                <Icon name="arrowUpRight" size={13} />
              </Link>
            )}
            <label className="sr-only" htmlFor="note-body">
              手记正文
            </label>
            <textarea
              id="note-body"
              value={active.text}
              onChange={(event) => edit('text', event.target.value)}
              placeholder="写下你发现的线索，或一个尚未证实的猜想…"
              maxLength={20000}
            />
            <div className="note-editor-footer">
              <span>{active.text.length} / 20,000 字符</span>
              <span>手记随存档一起导出</span>
            </div>
          </section>
        ) : (
          <section className="note-editor-empty">
            <Icon name="book" size={47} strokeWidth={1.2} />
            <h2>留一个位置，给新的发现。</h2>
            <p>选择左侧手记，或新建一页开始记录。</p>
            <button className="text-link" onClick={create}>
              写下第一笔
              <Icon name="plus" size={16} />
            </button>
          </section>
        )}
      </div>
      {deleteId && (
        <Modal title="删除这篇手记？" onClose={() => setDeleteId(null)}>
          <p className="modal-description">
            「{state.notes.find((note) => note.id === deleteId)?.title || '未命名的调查'}
            」将从此设备的存档中删除。此操作不能撤销。
          </p>
          <div className="modal-actions">
            <button className="button button-ghost" onClick={() => setDeleteId(null)}>
              保留手记
            </button>
            <button
              className="button button-coral"
              onClick={() => {
                dispatch({ type: 'deleteNote', id: deleteId })
                if (selected === deleteId)
                  setSelected(state.notes.find((note) => note.id !== deleteId)?.id ?? null)
                setDeleteId(null)
              }}
            >
              删除手记
              <Icon name="trash" size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
