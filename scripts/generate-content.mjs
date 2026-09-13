import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const normalize = (value) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/^(?:flag|arg|echo)\{(.*)\}$/u, '$1')
    .replace(/\s+/gu, '')
const chapters = JSON.parse(await readFile(path.join(root, 'content/chapters.json'), 'utf8'))
const files = (await readdir(path.join(root, 'content')))
  .filter((name) => /^puzzles.*\.json$/.test(name))
  .sort()
const source = (
  await Promise.all(
    files.map((file) => readFile(path.join(root, 'content', file), 'utf8').then(JSON.parse)),
  )
).flat()
const ids = new Set()
for (const puzzle of source) {
  if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle: ${puzzle.id}`)
  ids.add(puzzle.id)
  if (!puzzle.answers?.length || puzzle.hints?.length !== 3)
    throw new Error(`Missing answers or three hints: ${puzzle.id}`)
  if (!chapters.some((chapter) => chapter.id === puzzle.chapter))
    throw new Error(`Missing chapter: ${puzzle.id}`)
}
for (const puzzle of source)
  for (const id of puzzle.requires ?? [])
    if (!ids.has(id)) throw new Error(`Unknown dependency ${id} in ${puzzle.id}`)
const puzzles = source.map(({ answers, ...puzzle }) => ({
  ...puzzle,
  answerHashes: answers.map((answer) =>
    createHash('sha256')
      .update(`echo-archive:${puzzle.id}:${normalize(answer)}`)
      .digest('hex'),
  ),
}))
await mkdir(path.join(root, 'src/data'), { recursive: true })
await writeFile(
  path.join(root, 'src/data/generated.json'),
  JSON.stringify({ chapters, puzzles }, null, 2) + '\n',
)
console.log(`Archive compiled: ${chapters.length} chapters, ${puzzles.length} puzzles.`)
