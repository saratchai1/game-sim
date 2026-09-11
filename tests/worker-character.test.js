import test from 'node:test'
import assert from 'node:assert/strict'
import { workerTask, workerVariants, workerTools, workerRaycast } from '../src/workerVariants.js'
import { workerPose, smoothPose } from '../src/WorkerAnimationPose.js'

test('actual game actions select the appropriate worker, animation and tool',()=>{
  for(const [type,state,worker]of [['plant','plant',0],['clean','cleanup',1],['clear','cleanup',1],['survey','inspect',2],['patrol','inspect',1],['care','maintain',0],['mrv','mrv',2]]){
    assert.deepEqual(workerTask({type,plotId:5}),{state,worker,plotId:5})
    assert.notEqual(workerTools[state],'none')
  }
  assert.equal(workerTask(null),null)
  assert.equal(workerTask({type:'failed-plant'}),null)
})
test('seven states have finite, distinct poses and explicit elbow/knee joints',()=>{
  const states=['idle','walk','plant','cleanup','inspect','maintain','mrv']
  const poses=states.map(s=>workerPose(s,.63))
  assert.equal(new Set(poses.map(p=>JSON.stringify(p))).size,7)
  for(const p of poses){
    for(const v of Object.values(p))assert.ok(Number.isFinite(v)&&Math.abs(v)<Math.PI)
    for(const k of ['leftElbow','rightElbow','leftKnee','rightKnee'])assert.ok(k in p)
  }
  assert.notDeepEqual(workerPose('walk',0),workerPose('walk',.1))
})
test('pose blending is frame-rate independent at normal frame intervals',()=>{
  const target=workerPose('plant',1),a=workerPose('idle',0),b=workerPose('idle',0)
  for(let i=0;i<60;i++)smoothPose(a,target,1/60)
  for(let i=0;i<30;i++)smoothPose(b,target,1/30)
  for(const key in a)assert.ok(Math.abs(a[key]-b[key])<1e-10)
})
test('worker primitives return no raycast intersections and variants are bounded',()=>{
  const hits=[];workerRaycast({},hits)
  assert.deepEqual(hits,[])
  assert.equal(new Set(workerVariants.map(v=>v.hat)).size,3)
  assert.equal(new Set(workerVariants.map(v=>v.skin)).size,3)
  workerVariants.forEach(v=>{assert.ok(v.width>.8&&v.width<1.2);assert.ok(v.height>.8&&v.height<1.2)})
})
