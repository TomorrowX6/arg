import data from './generated.json'
import type { Chapter, Puzzle, GameState, PuzzleStatus } from '../game/types'

export const chapters = data.chapters as Chapter[]
export const puzzles = data.puzzles as Puzzle[]
export const mainPuzzles = puzzles.filter((puzzle) => !puzzle.optional)
export const sidePuzzles = puzzles.filter((puzzle) => puzzle.optional)
export const puzzleById: Record<string, Puzzle> = Object.assign(
  Object.create(null),
  Object.fromEntries(puzzles.map((puzzle) => [puzzle.id, puzzle])),
)

export function getStatus(puzzle: Puzzle, state: Pick<GameState, 'solved'>): PuzzleStatus {
  if (state.solved[puzzle.id]) return 'solved'
  return (puzzle.requires ?? []).every((id) => state.solved[id]) ? 'available' : 'locked'
}

export function getNextPuzzle(
  state: Pick<GameState, 'solved' | 'activePuzzle'>,
): Puzzle | undefined {
  const active = state.activePuzzle ? puzzleById[state.activePuzzle] : undefined
  if (active && !active.optional && getStatus(active, state) === 'available') return active
  return mainPuzzles.find((puzzle) => getStatus(puzzle, state) === 'available')
}

export function getNextSidePuzzle(
  current: Puzzle,
  state: Pick<GameState, 'solved'>,
): Puzzle | undefined {
  const available = sidePuzzles.filter(
    (puzzle) => puzzle.id !== current.id && getStatus(puzzle, state) === 'available',
  )
  return (
    available.find((puzzle) => puzzle.requires?.includes(current.id)) ??
    available.find((puzzle) => puzzle.number > current.number) ??
    available[0]
  )
}

export const kindLabels: Record<string, string> = {
  document: '文本取证',
  cipher: '密码分析',
  morse: '声音信号',
  frequency: '频率调谐',
  terminal: '终端调查',
  lights: '电路修复',
  sequence: '记忆复现',
  route: '路径追踪',
  compare: '影像比对',
  sort: '时间重组',
  dial: '机械锁盘',
  logic: '逻辑推理',
  nonogram: '数织修复',
  uv: '隐形墨水',
  sliding: '滑块拼图',
  circuit: '线路旋转',
  forensic: '文件取证',
  balance: '天平称量',
  jugs: '量水机关',
  ferry: '渡河规划',
  warehouse: '仓库推箱',
  laser: '镜面导光',
  codebreak: '符号推理',
  bridge: '提灯过桥',
  packet: '网络取证',
  wave: '声谱分析',
  unicode: '字符隐写',
}
