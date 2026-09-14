import { describe, expect, it } from 'vitest'
import { getResumeStory, getStoryProgress } from '../src/data/stories'
import { createState } from '../src/game/storage'
import { getNextSidePuzzle, puzzleById, sidePuzzles } from '../src/data/archive'

describe('returning to an independent story', () => {
  it('continues within the selected story and stops at its ending', () => {
    const state = createState()
    state.solved.x57 = { at: '2026-09-14T02:30:00Z', hints: 0, attempts: 1 }
    expect(getNextSidePuzzle(puzzleById.x57, state)?.id).toBe('x58')
    for (const id of ['x58', 'x59', 'x60'])
      state.solved[id] = { at: '2026-09-14T02:30:00Z', hints: 0, attempts: 1 }
    expect(getNextSidePuzzle(puzzleById.x60, state)).toBeUndefined()
    expect(getNextSidePuzzle(puzzleById.x04, state)?.collection).toBe('corners')
  })
  it('resumes an open case or the next unlocked case without changing the main story', () => {
    const state = createState()
    expect(getResumeStory(state)).toBeUndefined()
    state.activePuzzle = 'x42'
    expect(getResumeStory(state)).toBeUndefined()
    state.solved.x41 = { at: '2026-09-14T01:00:00Z', hints: 0, attempts: 1 }
    expect(getResumeStory(state)?.next?.id).toBe('x42')
    state.solved.x42 = { at: '2026-09-14T01:01:00Z', hints: 0, attempts: 1 }
    expect(getResumeStory(state)?.next?.id).toBe('x43')
    state.activePuzzle = 'a01'
    expect(getResumeStory(state)).toBeUndefined()
    state.activePuzzle = 'constructor'
    expect(getResumeStory(state)).toBeUndefined()
  })
  it('distinguishes investigation from completion, and does not resume a completed story', () => {
    const state = createState()
    state.hints.x41 = 1
    expect(getStoryProgress(state).find((story) => story.collection.id === 'press')?.status).toBe(
      'started',
    )
    for (const puzzle of sidePuzzles.filter((item) => item.collection === 'press'))
      state.solved[puzzle.id] = { at: '2026-09-14T01:00:00Z', hints: 0, attempts: 1 }
    state.activePuzzle = 'x46'
    const story = getStoryProgress(state).find((item) => item.collection.id === 'press')!
    expect(story.status).toBe('complete')
    expect(story.minutes).toBe(0)
    expect(story.solved).toBe(story.cases.length)
    expect(story.next).toBeUndefined()
    expect(getResumeStory(state)).toBeUndefined()
  })
})
