import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

// Measure a page, not the union of unrelated HTML entry points. Static imports
// load initially; dynamicImports belong to that page's deferred dependency graph.
export async function bundleReport(directory, entry = 'index.html') {
  const root = path.resolve(directory)
  const manifest = JSON.parse(await fs.readFile(path.join(root, '.vite/manifest.json'), 'utf8'))
  if (!manifest[entry]?.isEntry) throw new Error(`Missing HTML entry in manifest: ${entry}`)

  function graph(start, includeDynamic) {
    const seen = new Set()
    function visit(key) {
      if (seen.has(key)) return
      const chunk = manifest[key]
      if (!chunk) throw new Error(`Missing manifest dependency: ${key}`)
      seen.add(key)
      for (const child of chunk.imports || []) visit(child)
      if (includeDynamic) for (const child of chunk.dynamicImports || []) visit(child)
    }
    visit(start)
    return new Set([...seen].map(key => manifest[key].file).filter(file => /\.m?js$/.test(file)))
  }

  // Alias keys and shared chunks count only once per emitted file.
  const files = [...new Set(Object.values(manifest).map(c => c.file).filter(f => /\.m?js$/.test(f)))].sort()
  const measured = new Map()
  for (const file of files) {
    const resolved = path.resolve(root, file)
    if (!resolved.startsWith(root + path.sep)) throw new Error(`Asset outside build directory: ${file}`)
    const bytes = await fs.readFile(resolved)
    measured.set(file, { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length })
  }
  function sum(files, field) {
    return [...files].reduce((total, file) => total + measured.get(file)[field], 0)
  }
  const entries = {}
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!chunk.isEntry || !/\.m?js$/.test(chunk.file)) continue
    const initial = graph(key, false), reachable = graph(key, true)
    const deferred = new Set([...reachable].filter(file => !initial.has(file)))
    entries[key] = {
      initialFiles: [...initial].sort(), deferredFiles: [...deferred].sort(),
      initialBytes: sum(initial, 'bytes'), initialGzipBytes: sum(initial, 'gzipBytes'),
      reachableBytes: sum(reachable, 'bytes'), reachableGzipBytes: sum(reachable, 'gzipBytes'),
    }
  }
  if (!entries[entry]) throw new Error(`Entry does not emit JavaScript: ${entry}`)
  const initial = new Set(entries[entry].initialFiles)
  return {
    schemaVersion: 2, entry, entries,
    chunks: [...measured.values()].map(chunk => ({ ...chunk, initial: initial.has(chunk.file) })),
    initialBytes: entries[entry].initialBytes,
    initialGzipBytes: entries[entry].initialGzipBytes,
    // These totals intentionally still include ALL pages. They are not a
    // measurement of what a visitor downloads on the selected page.
    totalBytes: sum(files, 'bytes'), totalGzipBytes: sum(files, 'gzipBytes'),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await bundleReport(process.argv[2] || 'dist', process.argv[3] || 'index.html'), null, 2))
}
