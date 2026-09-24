import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createState, SITES, CACHES, STATION, serialize } from '../src/action/simulation.js'
import { expeditionGuidance, bridgeLeg, fieldAdvice, relativeBearing, compassHeading } from '../src/action/guidance.js'
import { cylinderHitFraction, boomFraction } from '../src/action/camera-safety.js'

const stocked=()=>{const s=createState();s.seeds=[3,3,3];return s}
const restored=()=>{const s=stocked();s.cleaned=['t1','t2','t3'];s.sites.forEach(p=>p.plantedAt=0);s.time=65;return s}
test('guide starts with supplies and never mutates the expedition save',()=>{
  const s=createState(),before=serialize(s)
  assert.equal(expeditionGuidance(s).goal.id,CACHES[0].id)
  for(let i=0;i<40;i++){expeditionGuidance(s,i*.1);fieldAdvice(s,i*.1)}
  assert.equal(serialize(s),before)
})
test('guide identifies a missing required species even when other seedlings remain',()=>{
  const s=stocked();s.seeds=[0,3,3]
  assert.equal(expeditionGuidance(s).phase,'supply')
})
test('guide targets debris before the blocked planting site and then the site',()=>{
  const s=stocked();s.sites[0].plantedAt=0
  assert.equal(expeditionGuidance(s).goal.id,'t1')
  s.cleaned=['t1'];assert.equal(expeditionGuidance(s).goal.id,'p2')
})
test('samples guide picks a ready nearby tree rather than an immature first tree',()=>{
  const s=restored();s.sites[0].plantedAt=64;Object.assign(s.player,{x:SITES[4].x,z:SITES[4].z})
  const g=expeditionGuidance(s);assert.equal(g.phase,'evidence');assert.equal(g.goal.id,'p5');assert.equal(g.waiting,0)
})
test('guide reports remaining growth time when every unsampled tree is immature',()=>{
  const s=restored();s.sites.forEach(p=>p.plantedAt=60)
  assert.equal(expeditionGuidance(s).waiting,17)
})
test('six sites, three cleanups and three samples guide to MRV, never issue credits',()=>{
  const s=restored();s.sites.slice(0,3).forEach(p=>p.sampled=true);s.samples=3
  assert.equal(expeditionGuidance(s).goal,STATION);assert.equal(s.credits,0)
  s.verified=true;assert.equal(expeditionGuidance(s).phase,'complete')
})
test('bridge guidance progresses both ways and does not pull back a completed crossing',()=>{
  assert.equal(bridgeLeg({x:0,z:-10},{x:4,z:-25}).id,'bridge-south')
  assert.equal(bridgeLeg({x:-10,z:-13},{x:4,z:-25}).id,'bridge-north')
  assert.equal(bridgeLeg({x:-10,z:-23},{x:4,z:-25}),null)
  assert.equal(bridgeLeg({x:4,z:-27},{x:0,z:12}).id,'bridge-north')
  assert.equal(bridgeLeg({x:-10,z:-21},{x:0,z:12}).id,'bridge-south')
  assert.equal(bridgeLeg({x:-10,z:-12.5},{x:0,z:12}),null)
  assert.equal(bridgeLeg({x:-20,z:-12},{x:-20,z:-27}),null)
})
test('compass handles negative yaw and camera-relative target bearing',()=>{
  assert.equal(compassHeading(-Math.PI/2).label,'W')
  assert.equal(compassHeading(Math.PI/2).label,'E')
  assert.ok(Math.abs(relativeBearing({x:0,z:0},{x:1,z:0},Math.PI/2))<1e-10)
  assert.equal(Math.round(relativeBearing({x:0,z:0},{x:1,z:0})*180/Math.PI),90)
})
test('hazards warn before a storm, protect shelter and suggest jumping a visible log',()=>{
  const s=createState();s.time=96
  assert.match(fieldAdvice(s).title,/9 วินาที/)
  s.time=110;assert.equal(fieldAdvice(s).kind,'safe')
  s.player.z=-2;assert.equal(fieldAdvice(s).kind,'danger')
  s.time=10;s.player.z=-3;assert.equal(fieldAdvice(s).kind,'obstacle')
  assert.notEqual(fieldAdvice(s,Math.PI).kind,'obstacle')
})
test('camera boom catches narrow cylinders between the former discrete samples',()=>{
  const a={x:0,y:2,z:0},b={x:0,y:2,z:10},t={x:0,z:3.47,radius:.11,bottom:0,top:5}
  assert.ok(Math.abs(cylinderHitFraction(a,b,t)-.336)<1e-8)
  assert.ok(boomFraction(a,b,[t])<.336)
})
test('camera ignores trunks outside segment and above canopy; handles caps and origin inside',()=>{
  const t={x:0,z:3,radius:.5,bottom:0,top:5}
  assert.equal(cylinderHitFraction({x:0,y:6,z:0},{x:0,y:6,z:10},t),null)
  assert.equal(boomFraction({x:0,y:2,z:0},{x:0,y:2,z:-10},[t]),1)
  assert.equal(cylinderHitFraction({x:0,y:8,z:3},{x:0,y:2,z:3},t),.5)
  assert.equal(cylinderHitFraction({x:0,y:2,z:3},{x:0,y:2,z:6},t),0)
  assert.ok(Number.isFinite(boomFraction({x:0,y:2,z:3},{x:0,y:2,z:3},[t])))
})
