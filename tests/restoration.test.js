import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialGame, suitability } from '../src/game-data.js'
import { advanceDay } from '../src/game-engine.js'
import { restoreGame, rewardPlant, reconcileDeaths } from '../src/coast-progression.js'
import { forecastFor, habitatFor, crewLeft, crewAction, crewRule, contractOffers, acceptContract, claimContract, contractProgress, prepareSoil, settleRestoration, stormDamage } from '../src/restoration.js'

const forest = (count = 6, age = 1) => {
  const g = createInitialGame()
  g.plots = g.plots.map((p,i) => i < count ? { ...p, species: p.tide === 'ต่ำ' ? 'sonneratia' : p.tide === 'สูง' ? 'avicennia' : 'rhizophora', age, health: 80 } : p)
  g.stats.planted = count
  return g
}
const reload = (g) => restoreGame(JSON.parse(JSON.stringify(g)), createInitialGame())

test('two crew jobs/day with single-use actions survive reload; bankrupt cleanup remains possible', () => {
  let g = forest(); g.coins = 0
  const initial = g
  const before = structuredClone(g)
  g = crewAction(g, 'clean')
  assert.equal(g.coins, 45)
  assert.equal(g.plots[0].health, 82)
  assert.equal(crewLeft(g), 1)
  assert.deepEqual(initial, before, 'original fixture not changed')
  assert.strictEqual(crewAction(g,'clean'),g)
  g = crewAction(reload(g),'care')
  assert.equal(g.coins,20)
  assert.equal(crewLeft(g),0)
  assert.equal(g.plots.filter(p=>p.health===96).length,3)
  assert.strictEqual(crewAction(g,'patrol'),g)
  const next = advanceDay(g).game
  assert.equal(crewLeft(next),2)
  assert.equal(crewAction(next,'clean').coins,next.coins+45)
})

test('crew jobs require living habitat; locked, unaffordable and event actions do not mutate state', () => {
  const g = createInitialGame()
  for (const key of ['care','survey','patrol','missing']) assert.strictEqual(crewAction(g,key),g)
  let established = forest(6,6)
  assert.equal(crewRule(established,'survey').ok,true)
  established.coins=0
  assert.strictEqual(crewAction(established,'survey'),established)
  established = {...established,event:{id:'storm'}}
  assert.strictEqual(crewAction(established,'clean'),established)
})

test('contracts count actions since acceptance and grant a reward exactly once', () => {
  let g = crewAction(createInitialGame(),'clean')
  g = acceptContract(g,'cleanup')
  assert.equal(contractProgress(g).value,0)
  assert.strictEqual(claimContract(g),g)
  g = crewAction(advanceDay(g).game,'clean')
  g = crewAction(advanceDay(g).game,'clean')
  assert.equal(contractProgress(g).ready,true)
  const coins = g.coins
  const paid = claimContract(reload(g))
  assert.equal(paid.coins,coins+75)
  assert.equal(paid.expedition.completed,1)
  assert.equal(paid.expedition.streak,1)
  assert.strictEqual(claimContract(paid),paid)
  assert.strictEqual(acceptContract({...paid,expedition:{...paid.expedition,offerDay:paid.day}},'cleanup').expedition.contract,null)
})

test('expiry is inclusive of the deadline; does not fine coins and resets only the streak', () => {
  let g = createInitialGame()
  g.expedition.streak=3; g.expedition.completed=3
  g = acceptContract(g,'roots')
  for(let i=0;i<2;i++) g=advanceDay(g).game
  assert.equal(contractProgress(g).daysLeft,1)
  const coins=g.coins
  g=advanceDay(g).game
  assert.equal(g.expedition.contract,null)
  assert.equal(g.coins,coins)
  assert.equal(g.expedition.streak,0)
  assert.equal(g.expedition.completed,3)
  assert.equal(reload(g).expedition.lastOutcome.type,'expired')
})

test('contract board never offers planting to a full forest and surveys unlock at three mature trees', () => {
  const g=forest(16,6)
  for(let day=1;day<10;day++) {
    const offers=contractOffers({...g,day})
    assert.ok(!offers.some(o=>o.id==='roots'))
    assert.equal(new Set(offers.map(o=>o.id)).size,offers.length)
  }
  assert.equal(crewRule(forest(2,6),'survey').unlocked,false)
  assert.equal(crewRule(forest(3,6),'survey').unlocked,true)
})

test('soil preparation costs once, improves both domain fit and save restoration', () => {
  let g=createInitialGame()
  const p=g.plots[3]
  assert.equal(suitability(p,'sonneratia'),1)
  g=prepareSoil(g,p.id)
  assert.equal(g.coins,920)
  assert.equal(suitability(g.plots[3],'sonneratia'),2)
  assert.strictEqual(prepareSoil(g,p.id),g)
  assert.equal(suitability(reload(g).plots[3],'sonneratia'),2)
  assert.strictEqual(prepareSoil({...g,coins:0},15).coins,0)
})

test('forecast is stable and cycles through all six events without consecutive repeats', () => {
  const seen=[]
  for(let day=1;day<=60;day++) {
    const f=forecastFor(day)
    if(day%5===4) assert.equal(f.eventId,forecastFor(day+1).todayEvent)
    if(day%5===0) seen.push(f.todayEvent)
  }
  assert.equal(new Set(seen.slice(0,6)).size,6)
  seen.slice(1).forEach((id,i)=>assert.notEqual(id,seen[i]))
  assert.deepEqual(forecastFor(19),forecastFor(19))
})

test('patrol preparation persists until the forecast hazard and reduces actual damage', () => {
  let g=forest(4); g.day=4
  g=crewAction(g,'patrol')
  assert.equal(g.expedition.protectionDay,5)
  assert.strictEqual(crewAction(g,'patrol'),g)
  g=advanceDay(reload(g)).game
  assert.equal(g.event.id,'storm')
  assert.equal(stormDamage(g,false),7)
  assert.equal(stormDamage(g,true),0)
  assert.equal(stormDamage({...g,day:10},false),15)
})

test('habitat recovers and regresses with living trees while achievements stay permanent', () => {
  const g=forest(16,8)
  g.biodiversity=60;g.plots[1].species='avicennia'
  const restored=settleRestoration(g)
  assert.equal(habitatFor(restored).stage,3)
  assert.ok(restored.expedition.achievements.includes('bay'))
  assert.strictEqual(settleRestoration(restored),restored)
  const damaged={...restored,plots:restored.plots.map(p=>({...p,dead:true,health:0}))}
  assert.equal(habitatFor(damaged).stage,0)
  assert.deepEqual(reload(damaged).expedition.achievements,restored.expedition.achievements)
})

test('new save fields reject malformed tasks, ids, counters and deadlines; old saves migrate', () => {
  const g=createInitialGame();delete g.expedition
  assert.equal(crewLeft(reload(g)),2)
  g.expedition={crewDay:1,used:['clean','clean','bogus'],counters:{clean:NaN},contract:{id:'cleanup',start:0,acceptedDay:1,deadline:999},achievements:['bay','bay','bad']}
  const restored=reload(g)
  assert.equal(restored.expedition.contract,null)
  assert.deepEqual(restored.expedition.used,['clean'])
  assert.equal(restored.expedition.counters.clean,0)
  assert.deepEqual(restored.expedition.achievements,['bay'])
})

test('daily simulation is deterministic and immutable, blocks on events, and counts each death once', () => {
  const g=forest(3);g.plots[0].species='avicennia';g.plots[0].health=6
  const snapshot=structuredClone(g)
  const a=advanceDay(g),b=advanceDay(g)
  assert.deepEqual(a,b)
  assert.deepEqual(g,snapshot)
  assert.ok(a.game.stats.dead<=1)
  assert.equal(a.report.deaths,a.game.stats.dead)
  const blocked={...a.game,event:{id:'storm'}}
  assert.strictEqual(advanceDay(blocked).game,blocked)
  assert.equal(advanceDay(blocked).report,null)
})

test('a fresh game can complete a planting contract and grow into survey unlock without injected resources', () => {
  let g=acceptContract(createInitialGame(),'roots')
  for(const [id,species] of [[1,'sonneratia'],[5,'rhizophora'],[11,'avicennia']]) {
    const plot=g.plots.find(p=>p.id===id)
    assert.equal(suitability(plot,species),2)
    const costs={sonneratia:62,rhizophora:70,avicennia:54}
    g={...g,coins:g.coins-costs[species],stats:{...g.stats,planted:g.stats.planted+1},plots:g.plots.map(p=>p.id===id?{...p,species,health:96}:p)}
    g=rewardPlant(g,2)
  }
  assert.equal(contractProgress(g).ready,true)
  g=claimContract(g)
  for(let i=0;i<6;i++) {
    g=crewAction(g,'clean')
    g=advanceDay(g).game
    if(g.event) g=reconcileDeaths(g,{...g,event:null,plots:g.plots.map(p=>p.species&&p.age<6?{...p,health:p.health-stormDamage(g,false)}:p)})
  }
  assert.equal(habitatFor(g).mature,3)
  assert.equal(crewRule(g,'survey').ok,true)
  assert.ok(g.coins>500)
})
