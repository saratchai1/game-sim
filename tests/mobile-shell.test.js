import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [html, css, main] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/iphone-safari-fullscreen.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
])

test('iOS viewport covers the safe-area canvas', () => {
  assert.match(html, /width=device-width, initial-scale=1, viewport-fit=cover/)
  assert.match(css, /env\(safe-area-inset-top, 0px\)/)
  assert.match(css, /env\(safe-area-inset-right, 0px\)/)
  assert.match(css, /env\(safe-area-inset-bottom, 0px\)/)
  assert.match(css, /env\(safe-area-inset-left, 0px\)/)
})

test('game shell follows Safari dynamic viewport without letterboxing', () => {
  assert.match(css, /min-height:\s*100svh/)
  assert.match(css, /height:\s*100dvh/)
  assert.match(css, /\.game3d-shell[\s\S]*?max-width:\s*none/)
  assert.match(css, /\.game3d-shell[\s\S]*?aspect-ratio:\s*auto/)
  assert.match(css, /\.world-canvas[\s\S]*?width:\s*100%\s*!important/)
  assert.match(css, /\.world-canvas[\s\S]*?height:\s*100%\s*!important/)
})

test('short iPhone landscape gets a real mobile reflow and touch targets', () => {
  assert.match(css, /orientation:\s*landscape[\s\S]*?max-width:\s*900px[\s\S]*?max-height:\s*520px/)
  assert.match(css, /\.utility-rail button[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/)
  assert.match(css, /\.plant-dock[\s\S]*?max-width:\s*calc\(100vw - var\(--safe-left\) - var\(--safe-right\) - 16px\)/)
})

test('Safari overrides load after existing visual styles', () => {
  const restoration = main.indexOf("import './restoration.css'")
  const safari = main.indexOf("import './iphone-safari-fullscreen.css'")
  assert.ok(restoration >= 0)
  assert.ok(safari > restoration)
})
