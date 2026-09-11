import fs from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const root = path.resolve(process.argv[2] || 'dist')
const manifest = JSON.parse(await fs.readFile(path.join(root, '.vite/manifest.json'), 'utf8'))
const initial = new Set()
function visit(key) {
  if (initial.has(key)) return
  initial.add(key)
  for (const child of manifest[key]?.imports || []) visit(child)
}
for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key)
const chunks = []
for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.file.endsWith('.js')) continue
  const bytes = await fs.readFile(path.join(root, chunk.file))
  chunks.push({ file: chunk.file, initial: initial.has(key), bytes: bytes.length, gzipBytes: gzipSync(bytes).length })
}
const sum = (items, key) => items.reduce((n, item) => n + item[key], 0)
const report = { chunks, initialBytes: sum(chunks.filter(c => c.initial), 'bytes'),
  initialGzipBytes: sum(chunks.filter(c => c.initial), 'gzipBytes'),
  totalBytes: sum(chunks, 'bytes'), totalGzipBytes: sum(chunks, 'gzipBytes') }
console.log(JSON.stringify(report, null, 2))
