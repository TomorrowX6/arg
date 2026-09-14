export interface TentConfig {
  size: number
  trees: number[]
  rowCounts: number[]
  columnCounts: number[]
  message: string
}

export function campNeighbors(size: number, cell: number, diagonal = false): number[] {
  const row = Math.floor(cell / size),
    column = cell % size
  const result: number[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || (!diagonal && dx !== 0 && dy !== 0)) continue
      const y = row + dy,
        x = column + dx
      if (y >= 0 && y < size && x >= 0 && x < size) result.push(y * size + x)
    }
  return result
}

export function pairTents(config: TentConfig, tents: number[]): { tree: number; tent: number }[] {
  const owners = new Map<number, number>()
  function assign(tent: number, seen: Set<number>): boolean {
    for (const tree of campNeighbors(config.size, tent).filter((cell) =>
      config.trees.includes(cell),
    )) {
      if (seen.has(tree)) continue
      seen.add(tree)
      if (!owners.has(tree) || assign(owners.get(tree)!, seen)) {
        owners.set(tree, tent)
        return true
      }
    }
    return false
  }
  for (const tent of tents) assign(tent, new Set())
  return [...owners].map(([tree, tent]) => ({ tree, tent }))
}

export function tentStatus(config: TentConfig, tents: number[]) {
  const { size, trees } = config
  const rowTotals = Array<number>(size).fill(0),
    columnTotals = Array<number>(size).fill(0)
  const conflicts = new Set<number>()
  for (const cell of tents) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= size * size || trees.includes(cell)) {
      conflicts.add(cell)
      continue
    }
    rowTotals[Math.floor(cell / size)]++
    columnTotals[cell % size]++
    if (!campNeighbors(size, cell).some((neighbor) => trees.includes(neighbor))) conflicts.add(cell)
    for (const neighbor of campNeighbors(size, cell, true))
      if (tents.includes(neighbor)) {
        conflicts.add(cell)
        conflicts.add(neighbor)
      }
  }
  const pairs = pairTents(config, tents)
  const complete =
    tents.length === trees.length &&
    new Set(tents).size === tents.length &&
    conflicts.size === 0 &&
    pairs.length === trees.length &&
    rowTotals.every((count, row) => count === config.rowCounts[row]) &&
    columnTotals.every((count, column) => count === config.columnCounts[column])
  return { rowTotals, columnTotals, conflicts: [...conflicts], pairs, complete }
}

export function solveTents(config: TentConfig, limit = 2): number[][] {
  const { size, trees, rowCounts, columnCounts } = config
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    size > 8 ||
    rowCounts.length !== size ||
    columnCounts.length !== size ||
    [...rowCounts, ...columnCounts].some(
      (count) => !Number.isInteger(count) || count < 0 || count > size,
    ) ||
    new Set(trees).size !== trees.length ||
    trees.some((cell) => !Number.isInteger(cell) || cell < 0 || cell >= size * size) ||
    rowCounts.reduce((a, b) => a + b, 0) !== trees.length ||
    columnCounts.reduce((a, b) => a + b, 0) !== trees.length
  )
    return []
  const candidates = rowCounts.map((count, row) => {
    const result: number[] = []
    for (let mask = 0; mask < 1 << size; mask++) {
      if (mask & (mask << 1)) continue
      const columns = Array.from({ length: size }, (_, i) => i).filter(
        (column) => mask & (1 << column),
      )
      if (
        columns.length !== count ||
        columns.some((column) => {
          const cell = row * size + column
          return (
            trees.includes(cell) ||
            !campNeighbors(size, cell).some((neighbor) => trees.includes(neighbor))
          )
        })
      )
        continue
      result.push(mask)
    }
    return result
  })
  const solutions: number[][] = []
  function visit(row: number, previous: number, columns: number[], tents: number[]) {
    if (solutions.length >= limit) return
    if (row === size) {
      if (tentStatus(config, tents).complete) solutions.push(tents)
      return
    }
    for (const mask of candidates[row]) {
      if (mask & (previous | (previous << 1) | (previous >> 1))) continue
      const next = [...columns],
        cells: number[] = []
      for (let column = 0; column < size; column++)
        if (mask & (1 << column)) {
          next[column]++
          cells.push(row * size + column)
        }
      if (
        next.some(
          (count, column) =>
            count > columnCounts[column] || count + size - row - 1 < columnCounts[column],
        )
      )
        continue
      visit(row + 1, mask, next, [...tents, ...cells])
    }
  }
  visit(0, 0, Array(size).fill(0), [])
  return solutions
}

export interface LoopConfig {
  rows: number
  columns: number
  clues: (number | null)[]
  message: string
}
export interface LoopEdge {
  id: string
  axis: 'h' | 'v'
  row: number
  column: number
  a: number
  b: number
  cells: number[]
}

export function loopEdges({ rows, columns }: Pick<LoopConfig, 'rows' | 'columns'>): LoopEdge[] {
  const edges: LoopEdge[] = []
  for (let row = 0; row <= rows; row++)
    for (let column = 0; column < columns; column++) {
      const cells = []
      if (row > 0) cells.push((row - 1) * columns + column)
      if (row < rows) cells.push(row * columns + column)
      edges.push({
        id: `h${row}-${column}`,
        axis: 'h',
        row,
        column,
        a: row * (columns + 1) + column,
        b: row * (columns + 1) + column + 1,
        cells,
      })
    }
  for (let row = 0; row < rows; row++)
    for (let column = 0; column <= columns; column++) {
      const cells = []
      if (column > 0) cells.push(row * columns + column - 1)
      if (column < columns) cells.push(row * columns + column)
      edges.push({
        id: `v${row}-${column}`,
        axis: 'v',
        row,
        column,
        a: row * (columns + 1) + column,
        b: (row + 1) * (columns + 1) + column,
        cells,
      })
    }
  return edges
}

export function loopStatus(config: LoopConfig, values: number[]) {
  const edges = loopEdges(config)
  const totals = Array<number>(config.rows * config.columns).fill(0)
  const degrees = Array<number>((config.rows + 1) * (config.columns + 1)).fill(0)
  const adjacency = degrees.map(() => [] as number[])
  const selected = edges.filter((_, index) => values[index] === 1)
  for (const edge of selected) {
    for (const cell of edge.cells) totals[cell]++
    degrees[edge.a]++
    degrees[edge.b]++
    adjacency[edge.a].push(edge.b)
    adjacency[edge.b].push(edge.a)
  }
  let components = 0
  const seen = new Set<number>()
  for (let point = 0; point < degrees.length; point++)
    if (degrees[point] && !seen.has(point)) {
      components++
      const queue = [point]
      seen.add(point)
      while (queue.length) {
        for (const next of adjacency[queue.pop()!])
          if (!seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
      }
    }
  const clueConflicts = config.clues.flatMap((clue, cell) =>
    clue !== null && totals[cell] > clue ? [cell] : [],
  )
  const branches = degrees.flatMap((degree, point) => (degree > 2 ? [point] : []))
  const cluesSatisfied = config.clues.every((clue, cell) => clue === null || totals[cell] === clue)
  const closed = selected.length > 0 && degrees.every((degree) => degree === 0 || degree === 2)
  return {
    totals,
    degrees,
    components,
    clueConflicts,
    branches,
    selected: selected.length,
    complete: values.length === edges.length && cluesSatisfied && closed && components === 1,
    closed,
  }
}

export function solveLoop(config: LoopConfig, limit = 2): number[][] {
  const { rows, columns, clues } = config
  if (
    ![rows, columns].every((n) => Number.isInteger(n) && n >= 1 && n <= 6) ||
    clues.length !== rows * columns ||
    clues.some((clue) => clue !== null && (!Number.isInteger(clue) || clue < 0 || clue > 4))
  )
    return []
  const edges = loopEdges(config)
  const cells = clues.map((clue, cell) => ({
    clue,
    edges: edges.flatMap((edge, i) => (edge.cells.includes(cell) ? [i] : [])),
  }))
  const vertices = Array.from({ length: (rows + 1) * (columns + 1) }, (_, point) =>
    edges.flatMap((edge, i) => (edge.a === point || edge.b === point ? [i] : [])),
  )
  const solutions: number[][] = []
  let visits = 0
  function visit(input: number[]) {
    if (solutions.length >= limit) return
    if (++visits > 500000) throw new Error('环线搜索超过验证上限，请增加明确线索。')
    const values = [...input]
    let changed = true
    while (changed) {
      changed = false
      const force = (unknown: number[], value: number) => {
        for (const edge of unknown) {
          values[edge] = value
          changed = true
        }
      }
      for (const cell of cells) {
        if (cell.clue === null) continue
        const on = cell.edges.filter((edge) => values[edge] === 1).length
        const unknown = cell.edges.filter((edge) => values[edge] < 0)
        if (on > cell.clue || on + unknown.length < cell.clue) return
        if (on === cell.clue) force(unknown, 0)
        else if (on + unknown.length === cell.clue) force(unknown, 1)
      }
      for (const vertex of vertices) {
        const on = vertex.filter((edge) => values[edge] === 1).length
        const unknown = vertex.filter((edge) => values[edge] < 0)
        if (on > 2 || (on === 1 && unknown.length === 0)) return
        if (on === 2 || (on === 0 && unknown.length === 1)) force(unknown, 0)
        else if (on === 1 && unknown.length === 1) force(unknown, 1)
      }
    }
    const status = loopStatus(config, values)
    if (status.closed) {
      if (status.complete) solutions.push(values.map((value) => (value === 1 ? 1 : 0)))
      return
    }
    const unknown = values.flatMap((value, i) => (value < 0 ? [i] : []))
    if (!unknown.length) return
    const groups = [
      ...cells.filter((cell) => cell.clue !== null).map((cell) => cell.edges),
      ...vertices,
    ]
      .map((group) => group.filter((edge) => values[edge] < 0))
      .filter((group) => group.length)
      .sort((a, b) => a.length - b.length)
    const edge = groups[0]?.[0] ?? unknown[0]
    for (const value of [1, 0]) {
      const next = [...values]
      next[edge] = value
      visit(next)
    }
  }
  visit(Array(edges.length).fill(-1))
  return solutions
}
