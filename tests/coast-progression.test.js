import test from 'node:test'
import assert from 'node:assert/strict'
import { freshJourney, rankFor, missionFor, claimMission, rewardPlant, fieldwork, discoverWildlife, diversityBonus, reconcileDeaths, restoreGame } from '../src/coast-progression.js'

const fixture = () => ({
  version: 2, day: 1, coins: 960, gems: 12, estimatedCarbon: 0, credits: 0,
  biodiversity: 10, community: 12, coastal: 10, marketPrice: 86,
  activeSpecies: 'rhizophora', event: null, upgrades: { nursery: 0, mrv: 0, community: 0 },
  stats: { planted: 0, dead: 0, verified: 0, sold: 0 }, claimedChapters: [], log: [], journey: freshJourney(),
  plots: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, tide: 'กลาง', soil: 'เลน', species: null, age: 0, health: 100, dead: false })),
})

 test('perfect planting caps cashback below minimum planting cost and breaks on a poor fit', () => {
  let g = fixture()
  for (let i = 0; i < 8; i++) g = rewardPlant(g, 2)
  assert.equal(g.journey.combo, 5)
  assert.equal(g.journey.perfect, 8)
  assert.equal(g.coins - 960, 120)
  const next = rewardPlant(g, 1)
  assert.equal(next.journey.combo, 0)
  assert.equal(next.coins, g.coins)
  assert.equal(next.journey.bestCombo, 5)
})

test('fieldwork recovers a bankrupt project once per game day, including after reload', () => {
  const initial = fixture()
  const g = { ...initial, coins: 0, plots: initial.plots.map((p, i) => ({ ...p, species: 'rhizophora', health: i ? 99 : 0, dead: i === 0 })) }
  const result = fieldwork(g)
  assert.equal(result.coins, 45)
  assert.equal(result.plots[1].health, 100)
  assert.equal(result.plots[0].health, 0)
  assert.equal(result.plots[0].dead, true)
  const loaded = restoreGame(JSON.parse(JSON.stringify(result)), fixture())
  assert.strictEqual(fieldwork(loaded), loaded)
  assert.equal(fieldwork({ ...loaded, day: 2 }).coins, 90)
  const blocked = { ...g, event: { id: 'storm' } }
  assert.strictEqual(fieldwork(blocked), blocked)
})

test('missions require the goal and only award each chapter once', () => {
  const g = fixture()
  assert.strictEqual(claimMission(g), g)
  g.journey.perfect = 3
  const next = claimMission(g)
  assert.equal(next.coins, 1060)
  assert.equal(next.journey.xp, 35)
  assert.equal(next.journey.mission, 1)
  assert.strictEqual(claimMission(next), next)
  assert.equal(g.coins, 960, 'input state is immutable')
})

test('repeat deliveries consume credits, track sales, and cannot repeat on the same day', () => {
  const g = fixture()
  g.journey.mission = 6
  g.credits = 30
  const mission = missionFor(g)
  const next = claimMission(g)
  assert.equal(next.credits, 25)
  assert.equal(next.stats.sold, 5)
  assert.equal(next.coins, g.coins + mission.coins)
  assert.strictEqual(claimMission(next), next)
  const reloaded = restoreGame(JSON.parse(JSON.stringify(next)), fixture())
  assert.strictEqual(claimMission(reloaded), reloaded)
  assert.equal(claimMission({ ...reloaded, day: 2 }).credits, 18)
})

test('wildlife awards are permanent, single-use, and require living habitat', () => {
  const g = fixture()
  g.plots = g.plots.map((p, i) => ({ ...p, species: i < 4 ? 'sonneratia' : null, age: 6 }))
  g.biodiversity = 30
  const found = discoverWildlife(g)
  assert.equal(found.journey.discovered.length, 4)
  assert.equal(found.coins, 1195)
  assert.equal(found.journey.xp, 100)
  assert.strictEqual(discoverWildlife(found), found)
  const lostHabitat = { ...found, plots: found.plots.map((p) => ({ ...p, dead: true })) }
  assert.strictEqual(discoverWildlife(lostHabitat), lostHabitat)
  assert.equal(lostHabitat.journey.discovered.length, 4)
  assert.strictEqual(discoverWildlife({ ...g, plots: lostHabitat.plots }).coins, 960)
})

test('three-species bonus vanishes when one species dies', () => {
  const g = fixture()
  const species = ['rhizophora', 'avicennia', 'sonneratia']
  g.plots = g.plots.map((p, i) => ({ ...p, species: species[i] || null }))
  assert.equal(diversityBonus(g), 1.15)
  g.plots[2].dead = true
  assert.equal(diversityBonus(g), 1)
})

test('storm and king tide deaths are counted exactly once', () => {
  const before = fixture()
  before.stats.planted = 2
  before.plots[0] = { ...before.plots[0], species: 'rhizophora', health: 6 }
  before.plots[1] = { ...before.plots[1], species: 'rhizophora', health: 4, dead: true }
  before.stats.dead = 1
  const damaged = { ...before, plots: before.plots.map((p) => ({ ...p, health: p.health - 8 })) }
  const next = reconcileDeaths(before, damaged)
  assert.equal(next.stats.dead, 2)
  assert.equal(next.plots[0].dead, true)
  assert.equal(reconcileDeaths(next, next).stats.dead, 2)
})

test('legacy saves preserve money and plots while gaining valid progression defaults', () => {
  const legacy = fixture()
  delete legacy.journey
  legacy.coins = 1234
  legacy.plots[0].species = 'rhizophora'
  const result = restoreGame(legacy, fixture())
  assert.equal(result.coins, 1234)
  assert.equal(result.plots[0].species, 'rhizophora')
  assert.equal(result.journey.fieldworkDay, 0)
  assert.equal(missionFor(result).goal, 3)
})

test('invalid saves cannot inject unknown species, duplicate claims, or NaN resources', () => {
  const bad = fixture()
  bad.coins = NaN
  bad.plots[0].species = 'bad-species'
  bad.plots[1].health = Infinity
  bad.upgrades.nursery = 90
  bad.claimedChapters = [0, 0, 1, 7, '2']
  const next = restoreGame(bad, fixture())
  assert.equal(next.coins, 960)
  assert.equal(next.plots[0].species, null)
  assert.equal(next.plots[1].health, 100)
  assert.equal(next.upgrades.nursery, 3)
  assert.deepEqual(next.claimedChapters, [0, 1])
  assert.equal(restoreGame({ plots: [] }, fixture()).plots.length, 16)
  assert.equal(rankFor(900).level, 5)
  assert.equal(rankFor(900).progress, 100)
})
