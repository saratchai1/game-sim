import test from 'node:test'
import assert from 'node:assert/strict'
import { VILLAGE_PHASE_SECONDS, socialPairs, villageBoundsOk, villagePhase, villagePlan, villageReaction, villageResidents } from '../src/village-life.js'

test('five distinct residents have four bounded activity stops',()=>{
  assert.equal(villageResidents.length,5)
  assert.equal(new Set(villageResidents.map(v=>v.id)).size,5)
  for(const resident of villageResidents){
    assert.equal(resident.route.length,4)
    assert.ok(villageBoundsOk(resident.home))
    resident.route.forEach(stop=>assert.ok(villageBoundsOk(stop.point),`${resident.id} route escaped village bounds`))
  }
})

test('village phase cycles deterministically across four routines',()=>{
  assert.deepEqual([0,1,2,3,4].map(i=>villagePhase(i*VILLAGE_PHASE_SECONDS)),[0,1,2,3,0])
  assert.equal(villagePlan('som',0).activity,'nets')
  assert.equal(villagePlan('som',VILLAGE_PHASE_SECONDS*2).activity,'chat-market')
  assert.equal(villagePlan('missing',0),null)
})

test('social phases pair residents at nursery and market',()=>{
  assert.deepEqual(socialPairs(VILLAGE_PHASE_SECONDS),[['dao','mee']])
  assert.deepEqual(socialPairs(VILLAGE_PHASE_SECONDS*2),[['som','noi']])
  assert.deepEqual(socialPairs(0),[])
})

test('player actions trigger role-specific village reactions',()=>{
  assert.equal(villageReaction({type:'plant'},'mee').mood,'cheer')
  assert.equal(villageReaction({type:'clean'},'som').text,'ชายฝั่งสะอาดขึ้นแล้ว')
  assert.equal(villageReaction({type:'survey'},'noi'),null)
  assert.equal(villageReaction(null,'dao'),null)
})

test('storms send every resident home with a shelter routine',()=>{
  for(const resident of villageResidents){
    const plan=villagePlan(resident.id,99,true)
    assert.deepEqual(plan.point,resident.home)
    assert.equal(plan.activity,'shelter')
    assert.match(plan.label,/พายุ/)
  }
})
