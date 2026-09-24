import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createState, step, SITES, CACHES, STATION, FOREST, LOGS, floorHeight, distance, nearestAction, metrics, serialize, restore, isStorm } from '../src/action/simulation.js'

// A test driver, NOT player autopilot. Every movement goes through the actual
// rules at fixed timesteps. No teleporting, resource injection or instant growth.
function route(from, target) {
  const key = p => `${p.x},${p.z}`
  const start = { x: Math.round(from.x * 2) / 2, z: Math.round(from.z * 2) / 2 }
  const safe = p => p.x >= -16 && p.x <= 12 && p.z >= -41 && p.z <= 15
    && floorHeight(p.x, p.z) >= 0.73
    && !FOREST.some(t => distance(p, t) < t.radius + 0.65)
    && !LOGS.some(l => Math.hypot(Math.max(Math.abs(p.x - l.x) - l.half, 0), p.z - l.z) < l.radius + 0.6)
  const nodes = new Map([[key(start), { ...start, cost: 0, parent: null }]])
  const open = [key(start)], closed = new Set()
  while (open.length) {
    open.sort((a, b) => nodes.get(a).cost + distance(nodes.get(a), target) - nodes.get(b).cost - distance(nodes.get(b), target))
    const id = open.shift(), node = nodes.get(id)
    if (closed.has(id)) continue
    closed.add(id)
    if (distance(node, target) < 0.65) {
      const result = []
      for (let n = node; n; n = n.parent ? nodes.get(n.parent) : null) result.unshift({ x: n.x, z: n.z })
      return result
    }
    for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.5, 0, 0.5]) {
      if (!dx && !dz) continue
      const next = { x: node.x + dx, z: node.z + dz }, nextId = key(next)
      if (closed.has(nextId) || !safe(next) || !safe({ x: node.x + dx, z: node.z }) || !safe({ x: node.x, z: node.z + dz })) continue
      const cost = node.cost + Math.hypot(dx, dz)
      if (!nodes.has(nextId) || cost < nodes.get(nextId).cost) {
        nodes.set(nextId, { ...next, cost, parent: id }); open.push(nextId)
      }
    }
  }
  throw new Error(`No safe walkable route from ${key(from)} to ${key(target)}`)
}

function expedition(delay = 0) {
  let s = createState(), ticks = 0, sawStorm = false, crossedBridge = false, sawMud = false
  function tick(input = {}) {
    step(s, input, 0.05, 0); ticks++
    sawStorm ||= isStorm(s.time)
    sawMud ||= s.player.hazard?.startsWith('โคลน') || false
    crossedBridge ||= Math.abs(s.player.x + 10) < 1.25 && Math.abs(s.player.z + 18) < 1
    assert.equal(s.rescues, 0, 'planned route must not rely on rescue/teleport')
    assert.ok(s.player.health > 0, 'ranger survives the whole expedition')
    assert.ok(ticks < 18000, 'campaign must be completable in bounded game time')
  }
  function walk(target) {
    for (const point of route(s.player, target)) {
      let attempts = 0
      while (distance(s.player, point) > 0.19) {
        const dx = point.x - s.player.x, dz = point.z - s.player.z, length = Math.hypot(dx, dz)
        tick({ x: dx / length, z: -dz / length })
        assert.ok(++attempts < 180, `movement blocked near ${JSON.stringify(point)}`)
      }
    }
    tick()
  }
  function hold(kind, id) {
    tick()
    // Waiting here advances the normal clock; never alter plantedAt/time.
    if (kind === 'sample') {
      let wait = 0
      while (nearestAction(s)?.blocked && wait++ < 460) tick()
    }
    const target = nearestAction(s)
    assert.equal(target?.kind, kind); assert.equal(target?.id, id)
    assert.ok(!target.blocked, target.blocked || 'action must be available')
    for (let i = 0; i < Math.ceil(target.duration / 0.05) + 2; i++) tick({ interact: true })
    assert.equal(s.latch, true, 'hold-to-interact completed')
    tick()
  }
  for (let i = 0; i < delay / 0.05; i++) tick()
  walk(CACHES[0]); hold('supply', CACHES[0].id)
  for (const [i, site] of SITES.entries()) {
    s.selected = site.species // same user operation as pressing 1, 2 or 3
    walk(site)
    if (site.debris) hold('clean', site.debris)
    const previous = s.seeds[site.species]
    hold('plant', site.id)
    assert.equal(s.seeds[site.species], previous - 1)
    assert.equal(metrics(s).planted, i + 1)
    assert.equal(s.credits, 0, 'planting does not issue credits')
    if (i === 3) s = restore(serialize(s)) // real save/read-back, not a fixture
  }
  // Revisit grown trees, waiting under the normal growth clock when necessary.
  for (const i of [3, 2, 0]) { walk(SITES[i]); hold('sample', SITES[i].id) }
  assert.equal(s.samples, 3); assert.equal(s.credits, 0)
  walk(STATION); hold('verify', 'station')
  assert.equal(s.verified, true); assert.equal(s.credits, 6)
  for (let i = 0; i < 60; i++) tick({ interact: true })
  assert.equal(s.credits, 6, 'completion rewards cannot be repeated')
  const loaded = restore(serialize(s))
  assert.equal(loaded.verified, true); assert.equal(loaded.credits, 6)
  assert.equal(metrics(loaded).planted, 6); assert.equal(metrics(loaded).cleaned, 3)
  assert.equal(crossedBridge, true); assert.equal(sawMud, true)
  return { seconds: s.time, sawStorm, health: s.player.health }
}

test('fresh action campaign: walk, supplies, six sites, three debris, growth, samples, return MRV and reload', () => {
  const result = expedition()
  console.log(`Fresh expedition: ${result.seconds.toFixed(1)} simulated seconds, health ${result.health.toFixed(1)}`)
})
test('same complete expedition remains playable when departure is delayed into the storm cycle', () => {
  const result = expedition(90)
  assert.equal(result.sawStorm, true)
  console.log(`Storm expedition: ${result.seconds.toFixed(1)} simulated seconds, health ${result.health.toFixed(1)}`)
})
