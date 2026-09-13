export type PuzzleKind =
  | 'document'
  | 'cipher'
  | 'morse'
  | 'frequency'
  | 'terminal'
  | 'lights'
  | 'sequence'
  | 'route'
  | 'compare'
  | 'sort'
  | 'dial'
  | 'logic'
  | 'nonogram'
  | 'uv'
  | 'sliding'
  | 'circuit'
  | 'forensic'
  | 'balance'
  | 'jugs'
  | 'ferry'
  | 'warehouse'
  | 'laser'
  | 'codebreak'
  | 'bridge'

export interface Artifact {
  type: PuzzleKind
  label: string
  title?: string
  text?: string
  lines?: string[]
  code?: string
  annotation?: string
  key?: string
  table?: string[][]
  config?: Record<string, unknown>
}

export interface Puzzle {
  id: string
  chapter: string
  number: number
  title: string
  subtitle: string
  kind: PuzzleKind
  difficulty: 1 | 2 | 3
  minutes: number
  tags: string[]
  briefing: string[]
  artifact: Artifact
  question: string
  answerFormat: string
  answerHashes: string[]
  hints: string[]
  resolution: string
  evidence: { title: string; text: string; symbol: string }
  requires?: string[]
  optional?: boolean
  collection?: string
}

export interface Chapter {
  id: string
  number: string
  title: string
  subtitle: string
  description: string
  location: string
  coordinate: string
  color: string
  icon: string
}

export interface SolveRecord {
  at: string
  hints: number
  attempts: number
}
export interface Note {
  id: string
  title: string
  text: string
  updatedAt: string
  puzzleId?: string
}
export interface Settings {
  sound: boolean
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'standard' | 'large'
}
export interface GameState {
  version: 1
  startedAt: string
  solved: Record<string, SolveRecord>
  hints: Record<string, number>
  attempts: Record<string, number>
  bookmarked: string[]
  notes: Note[]
  activePuzzle: string | null
  settings: Settings
  ending: string | null
  dailySolved: Record<string, string[]>
}

export type PuzzleStatus = 'solved' | 'available' | 'locked'
