import test from 'node:test'
import assert from 'node:assert/strict'
import { createFrameScheduler } from '../src/action/frame-loop.js'
function harness() {
  const native=new Map(), timers=new Map();let id=0,hidden=false,time=250
  const loop=createFrameScheduler({requestNative:fn=>{native.set(++id,fn);return id},cancelNative:n=>native.delete(n),
    setTimer:fn=>{timers.set(++id,fn);return id},clearTimer:n=>timers.delete(n),now:()=>time,isHidden:()=>hidden})
  return{native,timers,loop,hide:v=>{hidden=v},nativeTick:()=>{const callbacks=[...native.values()];native.clear();callbacks.forEach(fn=>fn(time))},
    recoveryTick:()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());time+=250}}
}
test('normal frames cancel their recovery timer and deliver only once',()=>{
 const h=harness();let calls=0;h.loop.request(()=>calls++);const late=[...h.timers.values()][0]
 h.nativeTick();late();assert.equal(calls,1);assert.equal(h.loop.pendingCount,0);assert.equal(h.timers.size,0)
})
test('foreground recovery cancels a starved native frame and ignores its late callback',()=>{
 const h=harness();let calls=0;h.loop.request(()=>calls++);const late=[...h.native.values()][0]
 h.recoveryTick();late(600);assert.equal(calls,1);assert.equal(h.native.size,0);assert.equal(h.loop.pendingCount,0)
})
test('pagehide cancellation stops both the native frame and foreground recovery',()=>{
 const h=harness();let calls=0;const token=h.loop.request(()=>calls++)
 h.loop.cancel(token);h.loop.cancel(token);h.nativeTick();h.recoveryTick();assert.equal(calls,0);assert.equal(h.loop.pendingCount,0)
})
test('hidden pages never get recovery ticks and never create a polling loop',()=>{
 const h=harness();let calls=0;h.loop.request(()=>calls++);h.hide(true);h.recoveryTick()
 assert.equal(calls,0);assert.equal(h.timers.size,0);assert.equal(h.native.size,1)
 h.hide(false);h.nativeTick();assert.equal(calls,1);assert.equal(h.loop.pendingCount,0)
})
test('a resumed self-scheduling loop retains exactly one outstanding frame and timer',()=>{
 const h=harness();let calls=0,token
 function draw(){calls++;token=h.loop.request(draw)}
 token=h.loop.request(draw)
 for(let i=0;i<5;i++){h.recoveryTick();assert.equal(h.loop.pendingCount,1);assert.equal(h.native.size,1);assert.equal(h.timers.size,1)}
 h.loop.cancel(token);assert.equal(calls,5);assert.equal(h.loop.pendingCount,0);assert.equal(h.timers.size,0)
})
