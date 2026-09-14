import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const directory = resolve('dist')
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)],
    ),
  )
  return files.flat()
}
const files = (await walk(directory))
  .filter((path) => !['sw.js', 'offline-info.json'].includes(relative(directory, path)))
  .sort()
const hash = createHash('sha256')
let bytes = 0
for (const file of files) {
  hash.update(relative(directory, file))
  hash.update(await readFile(file))
  bytes += (await stat(file)).size
}
const template = await readFile('scripts/offline-worker.js', 'utf8')
hash.update(template)
const version = hash.digest('hex').slice(0, 16)
const paths = files.map((file) => `./${relative(directory, file).replaceAll('\\', '/')}`)
await writeFile(
  join(directory, 'sw.js'),
  template
    .replace("/* __ARCHIVE_VERSION__ */ ''", JSON.stringify(version))
    .replace('/* __ARCHIVE_ASSETS__ */ []', JSON.stringify(paths)),
)
await writeFile(
  join(directory, 'offline-info.json'),
  JSON.stringify({ version, bytes, files: paths.length }),
)
console.log(
  `Offline archive: ${paths.length} files, ${(bytes / 1048576).toFixed(1)} MB, ${version}`,
)
