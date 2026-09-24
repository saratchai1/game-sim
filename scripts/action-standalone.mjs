// esbuild is already a locked Vite dependency; no CDN or extra app dependency.
import { build } from 'esbuild'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const result = await build({ entryPoints: ['src/action/main.js'], bundle: true, format: 'iife', minify: true, write: false, outfile: 'ranger.js', target: ['es2020'], legalComments: 'inline' })
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script')
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text
const template = await fs.readFile('action/index.html', 'utf8')
const entry = '<script type="module" src="/src/action/main.js"></script>'
assert.equal(template.split(entry).length, 2, 'Exactly one action entry must exist')
// A replacement function keeps $&, $` and $\' in minified Three.js code literal.
// Using a replacement string interprets these sequences and corrupts the embedded script.
const html = template.replace(entry, () => `<style>${css}</style><script>${js}</script>`)
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
assert.equal(scripts.length, 1, 'Standalone HTML must have exactly one inline script')
assert.equal(scripts[0][1], js, 'Embedding must preserve every byte of the JavaScript bundle')
new vm.Script(scripts[0][1], { filename: 'Mangrove-Ranger.html' })
await fs.mkdir('action-artifacts', { recursive: true })
await fs.writeFile('action-artifacts/Mangrove-Ranger.html', html)
console.log('Validated standalone HTML created. The farm link needs the repository server; action gameplay is self-contained.')
