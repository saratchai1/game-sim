// esbuild is already a locked Vite dependency; no CDN or extra app dependency.
import { build } from 'esbuild'
import fs from 'node:fs/promises'
const result = await build({ entryPoints: ['src/action/main.js'], bundle: true, format: 'iife', minify: true, write: false, outfile: 'ranger.js', target: ['es2020'], legalComments: 'inline' })
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script')
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text
let html = await fs.readFile('action/index.html', 'utf8')
html = html.replace('<script type="module" src="/src/action/main.js"></script>', `<style>${css}</style><script>${js}</script>`)
await fs.mkdir('action-artifacts', { recursive: true })
await fs.writeFile('action-artifacts/Mangrove-Ranger.html', html)
console.log('Standalone playable HTML created. The farm link requires the repository server; action gameplay itself is self-contained.')
