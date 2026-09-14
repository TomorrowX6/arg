export interface Point {
  x: number
  y: number
}
export interface RopeNode extends Point {
  id: string
  label: string
  fixed?: boolean
}
export interface UntangleConfig {
  nodes: RopeNode[]
  edges: [string, string][]
  message: string
}
const EPSILON = 1e-7
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const inBounds = (a: Point, b: Point, point: Point) =>
  point.x >= Math.min(a.x, b.x) - EPSILON &&
  point.x <= Math.max(a.x, b.x) + EPSILON &&
  point.y >= Math.min(a.y, b.y) - EPSILON &&
  point.y <= Math.max(a.y, b.y) + EPSILON

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const first = cross(a, b, c),
    second = cross(a, b, d),
    third = cross(c, d, a),
    fourth = cross(c, d, b)
  if (
    ((first > EPSILON && second < -EPSILON) || (first < -EPSILON && second > EPSILON)) &&
    ((third > EPSILON && fourth < -EPSILON) || (third < -EPSILON && fourth > EPSILON))
  )
    return true
  return (
    (Math.abs(first) <= EPSILON && inBounds(a, b, c)) ||
    (Math.abs(second) <= EPSILON && inBounds(a, b, d)) ||
    (Math.abs(third) <= EPSILON && inBounds(c, d, a)) ||
    (Math.abs(fourth) <= EPSILON && inBounds(c, d, b))
  )
}

export function pointSegmentDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y)
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)
}

export function untangleStatus(config: UntangleConfig, points: Point[] = config.nodes) {
  const ids = new Map(config.nodes.map((node, index) => [node.id, index]))
  const endpoints = config.edges.map(([a, b]) => [ids.get(a), ids.get(b)])
  const edgeKeys = config.edges.map(([a, b]) => [a, b].sort().join('\0'))
  const valid =
    config.nodes.length >= 3 &&
    config.nodes.length <= 16 &&
    ids.size === config.nodes.length &&
    points.length === config.nodes.length &&
    config.edges.length > 0 &&
    new Set(edgeKeys).size === edgeKeys.length &&
    endpoints.every(([a, b]) => a !== undefined && b !== undefined && a !== b)
  const invalidPoints = points.flatMap((point, index) =>
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 8 ||
    point.x > 92 ||
    point.y < 8 ||
    point.y > 92 ||
    (config.nodes[index]?.fixed &&
      (Math.abs(point.x - config.nodes[index].x) > EPSILON ||
        Math.abs(point.y - config.nodes[index].y) > EPSILON))
      ? [index]
      : [],
  )
  const crossings: [number, number][] = []
  const overlaps: [number, number][] = []
  const blocked: { node: number; edge: number }[] = []
  if (valid) {
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < 12 - EPSILON)
          overlaps.push([i, j])
    for (let i = 0; i < endpoints.length; i++) {
      const [a, b] = endpoints[i] as [number, number]
      for (let node = 0; node < points.length; node++)
        if (
          node !== a &&
          node !== b &&
          pointSegmentDistance(points[node], points[a], points[b]) < 6 - EPSILON
        )
          blocked.push({ node, edge: i })
      for (let j = i + 1; j < endpoints.length; j++) {
        const [c, d] = endpoints[j] as [number, number]
        const common = [a, b].find((node) => node === c || node === d)
        if (common === undefined) {
          if (segmentsIntersect(points[a], points[b], points[c], points[d])) crossings.push([i, j])
        } else {
          const first = points[a === common ? b : a],
            second = points[c === common ? d : c],
            origin = points[common]
          if (
            Math.abs(cross(origin, first, second)) <= EPSILON &&
            (first.x - origin.x) * (second.x - origin.x) +
              (first.y - origin.y) * (second.y - origin.y) >
              EPSILON
          )
            crossings.push([i, j])
        }
      }
    }
  }
  const badEdges = [...new Set([...crossings.flat(), ...blocked.map((item) => item.edge)])]
  const badNodes = [
    ...new Set([...overlaps.flat(), ...blocked.map((item) => item.node), ...invalidPoints]),
  ]
  return {
    valid,
    crossings,
    overlaps,
    blocked,
    badEdges,
    badNodes,
    invalidPoints,
    complete:
      valid &&
      invalidPoints.length === 0 &&
      crossings.length === 0 &&
      overlaps.length === 0 &&
      blocked.length === 0,
  }
}

export function moveRopeNode(
  config: UntangleConfig,
  points: Point[],
  index: number,
  point: Point,
): Point[] {
  if (
    !config.nodes[index] ||
    config.nodes[index].fixed ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  )
    return points
  const next = points.map((value) => ({ ...value }))
  next[index] = {
    x: Math.round(Math.max(8, Math.min(92, point.x)) * 10) / 10,
    y: Math.round(Math.max(8, Math.min(92, point.y)) * 10) / 10,
  }
  return next
}
