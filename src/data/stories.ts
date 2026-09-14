import { getStatus, puzzleById, sidePuzzles } from './archive'
import { caseCollections } from './collections'
import type { GameState } from '../game/types'

export function getStoryProgress(
  state: Pick<GameState, 'solved' | 'activePuzzle' | 'hints' | 'attempts'>,
) {
  const active = state.activePuzzle ? puzzleById[state.activePuzzle] : undefined
  return caseCollections.map((collection) => {
    const cases = sidePuzzles.filter((puzzle) => puzzle.collection === collection.id)
    const solved = cases.filter((puzzle) => !!state.solved[puzzle.id]).length
    const activeHere = active?.collection === collection.id && getStatus(active, state) !== 'locked'
    const next =
      activeHere && getStatus(active, state) === 'available'
        ? active
        : cases.find((puzzle) => getStatus(puzzle, state) === 'available')
    const started =
      solved > 0 ||
      activeHere ||
      cases.some((puzzle) => state.hints[puzzle.id] || state.attempts[puzzle.id])
    const status =
      solved === cases.length && cases.length > 0 ? 'complete' : started ? 'started' : 'new'
    return {
      collection,
      cases,
      solved,
      next,
      status,
      active: activeHere,
      minutes: cases.reduce(
        (total, puzzle) => total + (state.solved[puzzle.id] ? 0 : puzzle.minutes),
        0,
      ),
    }
  })
}

export function getResumeStory(
  state: Pick<GameState, 'solved' | 'activePuzzle' | 'hints' | 'attempts'>,
) {
  return getStoryProgress(state).find((story) => story.active && story.next)
}
