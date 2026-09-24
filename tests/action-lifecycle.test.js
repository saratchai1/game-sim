import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as simulation from '../src/action/simulation.js'

// Execute the real action controller; replace only browser/renderer boundaries.
// The separate Playwright suite also exercises persisted events in Chromium.
const controller = readFileSync(new URL('../src/action/main.js', import.meta.url), 'utf8')
  .replace(/^import .*\n/gm, '')

class Target {
  constructor() { this.listeners = new Map(); this.captures = new Set() }
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name).add(fn)
  }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn) }
  fire(name, event = {}) {
    for (const fn of [...(this.listeners.get(name) || [])]) fn({ preventDefault() {}, ...event })
  }
  setPointerCapture(id) { this.captures.add(id) }
  hasPointerCapture(id) { return this.captures.has(id) }
  releasePointerCapture(id) { this.captures.delete(id) }
}

function harness(initial = simulation.createState()) {
  const elements = new Map(), window = new Target(), document = new Target()
  const canvasContext = new Proxy({}, { get: (object, key) => object[key] ?? (() => {}) })
  function element(selector) {
    if (!elements.has(selector)) {
      const e = new Target(), classes = new Set()
      Object.assign(e, { hidden: ['#pause-screen', '#completion', '#render-error'].includes(selector),
        style: {}, textContent: '', innerHTML: '', width: 160,
        focus() {}, setAttribute() {}, getContext: () => canvasContext,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
          toggle(c, force) { const on = force ?? !classes.has(c); if (on) classes.add(c); else classes.delete(c) } },
      })
      elements.set(selector, e)
    }
    return elements.get(selector)
  }
  document.querySelector = element; document.querySelectorAll = () => []
  document.pointerLockElement = null; document.hidden = false
  const store = new Map([[simulation.SAVE_KEY, simulation.serialize(initial)]]), frames = new Map()
  let denied = false, frameId = 0, clock = 0, world
  const localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { if (denied) throw new Error('quota denied'); store.set(key, value) },
  }
  class World {
    constructor() { world = this; this.disposals = 0; this.updates = 0; this.renderer = { domElement: element('canvas') } }
    update(game, camera) { this.updates++; this.player = { ...game.player }; this.camera = { ...camera } }
    dispose() { this.disposals++ }
  }
  const context = vm.createContext({ ...simulation, window, document, localStorage, console,
    RangerWorld: World, requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId },
    cancelAnimationFrame: id => frames.delete(id),
  })
  vm.runInContext(controller, context, { filename: 'src/action/main.js' })
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      clock += 1000 / 60
      const pending = [...frames.values()]; frames.clear()
      pending.forEach(fn => fn(clock))
    }
  }
  return { window, document, element, frames, tick, get world() { return world },
    read: () => JSON.parse(store.get(simulation.SAVE_KEY)),
    denyStorage: value => { denied = value },
    start: () => { element('#start').fire('click'); tick(2) },
    pause: () => element('#pause').fire('click'),
    resume: () => element('#resume').fire('click'),
    key: (code, repeat = false) => window.fire('keydown', { code, repeat }),
  }
}

test('cached round trips keep the renderer and resume exactly one loop with progress preserved', () => {
  const s = simulation.createState(); s.seeds = [2, 1, 3]; s.sites[0].plantedAt = 0; s.cleaned = ['t1']
  const h = harness(s); h.start()
  for (let trip = 0; trip < 2; trip++) {
    h.key('KeyW'); h.tick(12)
    h.window.fire('pagehide', { persisted: true })
    const saved = h.read(), updates = h.world.updates
    assert.equal(h.world.disposals, 0); assert.equal(h.frames.size, 0)
    h.tick(120); assert.equal(h.world.updates, updates)
    h.window.fire('pageshow', { persisted: true }); h.window.fire('pageshow', { persisted: true })
    assert.equal(h.frames.size, 1); assert.equal(h.element('#pause-screen').hidden, false)
    h.tick(30); assert.equal(h.read().time, saved.time)
    h.resume(); h.tick(30)
    assert.equal(h.world.player.x, saved.player.x); assert.equal(h.world.player.z, saved.player.z)
    h.key('KeyW'); h.tick(12); h.pause()
    assert.notEqual(h.read().player.z, saved.player.z)
    assert.deepEqual(h.read().seeds, s.seeds); assert.deepEqual(h.read().cleaned, s.cleaned)
    assert.equal(h.read().sites[0].plantedAt, 0)
  }
})

test('discarded page saves, disposes once and cannot restart its animation', () => {
  const h = harness(); h.start(); h.key('KeyW'); h.tick(12)
  h.window.fire('pagehide', { persisted: false })
  assert.equal(h.world.disposals, 1); assert.equal(h.frames.size, 0)
  assert.ok(h.read().time > 0)
  h.window.fire('pageshow', { persisted: true }); h.window.fire('pagehide', { persisted: false })
  assert.equal(h.world.disposals, 1); assert.equal(h.frames.size, 0)
})

test('cache restore before Start preserves the introduction', () => {
  const h = harness()
  h.window.fire('pagehide', { persisted: true }); h.window.fire('pageshow', { persisted: true })
  h.tick(60)
  assert.equal(h.element('#intro').hidden, false); assert.equal(h.element('#pause-screen').hidden, true)
  assert.equal(h.read().time, 0)
  h.start(); h.key('KeyW'); h.tick(12); h.pause(); assert.ok(h.read().time > 0)
})

test('cached completion keeps the result dialog instead of covering it with pause', () => {
  const h = harness(); h.start(); h.element('#completion').hidden = false
  h.window.fire('pagehide', { persisted: true }); h.window.fire('pageshow', { persisted: true })
  assert.equal(h.element('#completion').hidden, false); assert.equal(h.element('#pause-screen').hidden, true)
  h.element('#continue').fire('click'); h.key('KeyW'); h.tick(12); h.pause()
  assert.equal(h.element('#completion').hidden, true); assert.ok(h.read().time > 0)
})

test('holding Escape pauses once instead of toggling on keyboard repeats', () => {
  const h = harness(); h.start(); h.key('Escape'); const saved = h.read().time
  for (let i = 0; i < 4; i++) { h.key('Escape', true); h.tick(30) }
  assert.equal(h.element('#pause-screen').hidden, false); assert.equal(h.read().time, saved)
  h.key('Escape'); assert.equal(h.element('#pause-screen').hidden, true)
})

test('pause releases joystick and look pointers; stale move events do not drift', () => {
  const h = harness(); h.start(); const stick = h.element('#joystick'), host = h.element('#ranger-world')
  stick.fire('pointerdown', { pointerId: 1, clientX: 75, clientY: 50 })
  host.fire('pointerdown', { pointerId: 2, clientX: 100, clientY: 100 })
  h.tick(12); h.pause(); const saved = h.read()
  assert.equal(stick.hasPointerCapture(1), false); assert.equal(host.hasPointerCapture(2), false)
  h.resume()
  stick.fire('pointermove', { pointerId: 1, clientX: 90, clientY: 50 })
  host.fire('pointermove', { pointerId: 2, clientX: 500, clientY: 100 })
  h.tick(30); h.pause()
  assert.equal(h.read().player.x, saved.player.x); assert.equal(h.read().player.z, saved.player.z)
  assert.equal(h.world.camera.yaw, 0)
})

test('successful save clears an earlier storage warning without replacing the game', () => {
  const h = harness(); h.start(); h.denyStorage(true); h.pause()
  assert.equal(h.element('#save-status').classList.contains('save-warning'), true)
  h.denyStorage(false); h.resume(); h.key('KeyW'); h.tick(12); h.pause()
  assert.equal(h.element('#save-status').classList.contains('save-warning'), false)
  assert.ok(h.read().time > 0)
})

test('switching away saves and pauses; resume clears stuck keyboard input', () => {
  const h = harness(); h.start(); h.key('KeyW'); h.tick(12)
  h.document.hidden = true; h.document.fire('visibilitychange'); const saved = h.read()
  h.tick(120); assert.equal(h.read().time, saved.time)
  h.document.hidden = false; h.document.fire('visibilitychange')
  assert.equal(h.element('#pause-screen').hidden, false)
  h.resume(); h.tick(30); h.pause()
  assert.equal(h.read().player.z, saved.player.z); assert.equal(h.world.disposals, 0)
})
