import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { bundleReport } from '../scripts/bundle-report.mjs'

const manifest = () => ({
  'index.html': { isEntry: true, file: 'assets/farm.js', imports: ['_ui'], dynamicImports: ['world'] },
  'action/index.html': { isEntry: true, file: 'assets/action.js', imports: ['_three'] },
  _ui: { file: 'assets/ui.js' },
  _three: { file: 'assets/three.js' },
  world: { isDynamicEntry: true, file: 'assets/world.js', imports: ['_three', '_ui'] },
  'style.css': { file: 'assets/style.css' },
})
const sizes = { 'farm.js': 100, 'action.js': 300, 'ui.js': 200, 'three.js': 2000, 'world.js': 500 }
async function fixture(t, data = manifest()) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ranger-bundle-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, '.vite')); await fs.mkdir(path.join(root, 'assets'))
  await fs.writeFile(path.join(root, '.vite/manifest.json'), JSON.stringify(data))
  for (const [file, count] of Object.entries(sizes)) await fs.writeFile(path.join(root, 'assets', file), 'x'.repeat(count))
  return root
}
test('farm initial bytes exclude the separate action entry and lazy Three.js', async t => {
  const report = await bundleReport(await fixture(t))
  assert.equal(report.entry, 'index.html'); assert.equal(report.initialBytes, 300)
  assert.deepEqual(report.entries['index.html'].initialFiles, ['assets/farm.js', 'assets/ui.js'])
  assert.equal(report.entries['index.html'].reachableBytes, 2800)
  assert.equal(report.totalBytes, 3100)
})
test('action initial bytes include its own static Three.js dependency', async t => {
  const report = await bundleReport(await fixture(t), 'action/index.html')
  assert.equal(report.initialBytes, 2300)
  assert.equal(report.entries['action/index.html'].reachableBytes, 2300)
  assert.deepEqual(report.entries['action/index.html'].deferredFiles, [])
})
test('shared dependencies, alias files and cyclic imports are counted once', async t => {
  const data = manifest(); data._alias = { file: 'assets/ui.js', imports: ['index.html'] }
  data['index.html'].imports.push('_alias')
  const report = await bundleReport(await fixture(t, data))
  assert.equal(report.initialBytes, 300); assert.equal(report.totalBytes, 3100)
})
test('missing selected entry fails instead of silently measuring another page', async t => {
  await assert.rejects(bundleReport(await fixture(t), 'missing.html'), /Missing HTML entry/)
})
test('missing imported chunk fails instead of under-reporting initial load', async t => {
  const data = manifest(); data['index.html'].imports.push('_missing')
  await assert.rejects(bundleReport(await fixture(t, data)), /Missing manifest dependency/)
})
test('one-page historical builds keep the same initial and total figures', async t => {
  const data = manifest(); delete data['action/index.html']
  const report = await bundleReport(await fixture(t, data))
  assert.equal(report.initialBytes, 300); assert.equal(report.totalBytes, 2800)
  assert.equal(Object.keys(report.entries).length, 1)
})
test('CLI accepts an explicit HTML entry and emits valid JSON', async t => {
  const root = await fixture(t)
  const raw = execFileSync(process.execPath, ['scripts/bundle-report.mjs', root, 'action/index.html'], { encoding: 'utf8' })
  assert.equal(JSON.parse(raw).initialBytes, 2300)
})
