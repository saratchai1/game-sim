import './ranger.css'
import { RangerWorld } from './world.js'
import { SAVE_KEY, SPECIES, SITES, TRASH, CACHES, STATION, FOREST, CAMP, createState, restore, serialize, step, metrics, objective, nearestAction, tide, isStorm, distance, rescue, clamp } from './simulation.js'

const $ = (selector) => document.querySelector(selector)
const host = $('#ranger-world')
let game
try { game = restore(localStorage.getItem(SAVE_KEY)) } catch { game = createState() }
let paused = true, started = false, completionSeen = game.verified, raf = 0, last = 0, accumulator = 0, hudTime = 0, saveTime = 0
let world = null
const camera = { yaw: 0, pitch: 0.31, distance: 7 }
const keys = new Set(), touch = { x: 0, z: 0, jump: false, sprint: false, interact: false }
const listeners = [], on = (el, event, fn, options) => { el.addEventListener(event, fn, options); listeners.push(() => el.removeEventListener(event, fn, options)) }
function save() {
  try { localStorage.setItem(SAVE_KEY, serialize(game)); $('#save-status').textContent = 'บันทึกในเครื่องแล้ว' }
  catch { $('#save-status').textContent = 'บันทึกไม่ได้ · อย่าปิดหน้านี้'; $('#save-status').classList.add('save-warning') }
}
function release() { keys.clear(); Object.assign(touch,{x:0,z:0,jump:false,sprint:false,interact:false}); $('#stick-knob').style.transform = 'translate(0,0)' }
function setPaused(value) {
  paused = value; release(); accumulator = 0
  $('#pause-screen').hidden = !value || !started
  if(value && document.pointerLockElement) document.exitPointerLock()
  if(value && started) save()
}
function start() {
  $('#intro').hidden = true; started = true; setPaused(false); save(); host.focus()
}
function select(index) { game.selected = index; updateHUD(); save() }
function resume() { setPaused(false); host.focus() }
function finish() {
  completionSeen = true; setPaused(true); $('#pause-screen').hidden = true; $('#completion').hidden = false
  $('#result-time').textContent = `${Math.floor(game.time / 60)}:${String(Math.floor(game.time % 60)).padStart(2,'0')}`
  const m = metrics(game); $('#result-impact').textContent = `${m.biodiversity} / ${m.community} / ${m.resilience}`
}

$('#inventory').innerHTML = SPECIES.map((s,i) => `<button class="seed-slot" data-seed="${i}" aria-label="เลือก${s.name}" style="--seed-color:${s.color}"><span class="seed-number">${i+1}</span><span class="seed-icon"><i></i></span><span><strong>${s.name}</strong><small data-count="${i}">0 กล้า</small></span></button>`).join('')
for(const button of document.querySelectorAll('[data-seed]')) on(button,'click',()=>select(Number(button.dataset.seed)))
on($('#start'),'click',start)
on($('#pause'),'click',()=>setPaused(true))
on($('#resume'),'click',resume)
on($('#continue'),'click',()=>{ $('#completion').hidden=true; resume() })
on($('#rescue'),'click',()=>{ rescue(game); camera.yaw=0; save(); resume() })
on($('#restart'),'click',()=>{
  if(!window.confirm('เริ่มภารกิจแอ็กชันใหม่? เกมฟาร์มเดิมจะไม่ถูกลบ')) return
  game=createState();completionSeen=false;camera.yaw=0;save();resume()
})
on($('#camera-lock'),'click',()=>{
  if(!world) return
  const result=world.renderer.domElement.requestPointerLock?.()
  result?.catch?.(()=>{ $('#save-status').textContent='ใช้การลากเมาส์หมุนกล้องแทนได้' })
})
on(window,'keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','Space','KeyE','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault()
  if(e.code==='Escape' && started && $('#completion').hidden) { setPaused(!paused); return }
  if(paused) return
  keys.add(e.code)
  if(['Digit1','Digit2','Digit3'].includes(e.code)) select(Number(e.code.at(-1))-1)
})
on(window,'keyup',e=>keys.delete(e.code))
on(window,'blur',()=>{ if(started&&!paused)setPaused(true); release() })
on(document,'visibilitychange',()=>{if(document.hidden&&started)setPaused(true)})
let lookPointer=null
on(host,'pointerdown',e=>{ if(paused)return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId) })
on(host,'pointermove',e=>{
  if(paused)return
  let dx=0,dy=0
  if(document.pointerLockElement) {dx=e.movementX;dy=e.movementY}
  else if(lookPointer?.id===e.pointerId) {dx=e.clientX-lookPointer.x;dy=e.clientY-lookPointer.y;lookPointer.x=e.clientX;lookPointer.y=e.clientY}
  camera.yaw+=dx*.004;camera.pitch=clamp(camera.pitch+dy*.003,.05,.7)
})
for(const event of ['pointerup','pointercancel','lostpointercapture']) on(host,event,()=>{lookPointer=null})
on(host,'wheel',e=>{e.preventDefault();camera.distance=clamp(camera.distance+e.deltaY*.008,3.2,9)}, {passive:false})
on(host,'contextmenu',e=>e.preventDefault())
const stick=$('#joystick');let stickPointer=null
function moveStick(e) {
  if(stickPointer!==e.pointerId)return
  const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.max(1,Math.hypot(dx,dy)/32)
  touch.x=clamp(dx/d/32,-1,1);touch.z=clamp(-dy/d/32,-1,1)
  $('#stick-knob').style.transform=`translate(${dx/d}px,${dy/d}px)`
}
on(stick,'pointerdown',e=>{if(paused)return;stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)})
on(stick,'pointermove',moveStick)
for(const event of ['pointerup','pointercancel','lostpointercapture']) on(stick,event,()=>{stickPointer=null;touch.x=0;touch.z=0;$('#stick-knob').style.transform='translate(0,0)'})
for(const [selector,key] of [['#touch-e','interact'],['#touch-jump','jump'],['#touch-sprint','sprint']]) {
  const b=$(selector)
  on(b,'pointerdown',e=>{if(paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);touch[key]=true})
  for(const event of ['pointerup','pointercancel','lostpointercapture']) on(b,event,()=>{touch[key]=false})
}
function drawMap() {
  const canvas=$('#minimap'),ctx=canvas.getContext('2d'),w=canvas.width
  ctx.clearRect(0,0,w,w);ctx.fillStyle='#213d35';ctx.fillRect(0,0,w,w)
  const map=(x,z)=>[(x+31)/64*w,(z+46)/72*w]
  ctx.fillStyle='#467e79';const sea=map(14,-46);ctx.fillRect(sea[0],0,w-sea[0],w)
  ctx.fillStyle='#497b74';const creek=map(-13,-20);ctx.fillRect(creek[0],creek[1],w-creek[0],7)
  ctx.fillStyle='#4c6650';FOREST.forEach(t=>{const[x,y]=map(t.x,t.z);ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()})
  const mark=(p,color,r)=>{const[x,y]=map(p.x,p.z);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  SITES.forEach((p,i)=>mark(p,game.sites[i].plantedAt!==null?'#98dfbd':'#dcc898',3.2))
  for(const c of CACHES) mark(c,'#dba35e',2.5)
  mark(STATION,'#f4eccd',3)
  const target=objective(game).target,[tx,ty]=map(target.x,target.z);ctx.strokeStyle='#efd08c';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(tx,ty,6,0,Math.PI*2);ctx.stroke()
  const[x,y]=map(game.player.x,game.player.z);ctx.save();ctx.translate(x,y);ctx.rotate(-game.player.heading);ctx.fillStyle='#fffde9';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-3.5,4);ctx.lineTo(3.5,4);ctx.closePath();ctx.fill();ctx.restore()
}
function updateHUD() {
  const p=game.player,m=metrics(game),obj=objective(game),near=nearestAction(game)
  $('#health-fill').style.width=`${p.health}%`;$('#health-value').textContent=Math.ceil(p.health)
  $('#stamina-fill').style.width=`${p.stamina}%`;$('#stamina-value').textContent=Math.ceil(p.stamina)
  $('#mission-title').textContent=obj.title;$('#mission-detail').textContent=obj.detail
  $('#target-distance').textContent=`${Math.round(distance(p,obj.target))} m`
  $('#plant-count').textContent=`${m.planted}/6`;$('#trash-count').textContent=`${m.cleaned}/3`;$('#sample-count').textContent=`${m.samples}/3`
  $('#biodiversity').textContent=m.biodiversity;$('#community').textContent=m.community;$('#resilience').textContent=m.resilience
  $('#credit-count').textContent=game.credits
  $('#weather').textContent=isStorm(game.time)?'พายุชายฝั่ง':game.time%160>88?'พายุกำลังใกล้เข้ามา':'อากาศเปิด'
  $('#tide').textContent=tide(game.time)>.6?'น้ำขึ้นสูง':tide(game.time)>.38?'น้ำกำลังเปลี่ยนระดับ':'น้ำลง'
  $('#hazard').hidden=!p.hazard;$('#hazard').textContent=p.hazard||''
  $('#bearing').textContent=`${String(Math.round((camera.yaw*180/Math.PI+3600)%360)).padStart(3,'0')}°`
  $('#prompt').hidden=!near
  if(near) {
    $('#prompt-title').textContent=near.blocked||near.title
    $('#prompt-note').textContent=near.blocked?'สำรวจหรือเลือกเครื่องมือให้พร้อมก่อน':'หยุดเดิน แล้วกด E ค้าง / แตะปุ่มลงมือค้าง'
    $('#prompt').classList.toggle('blocked',Boolean(near.blocked))
  }
  $('#action-progress').style.width=`${clamp(game.progress)*100}%`
  $('#touch-e').classList.toggle('available',Boolean(near&&!near.blocked))
  $('#notice').hidden=game.messageTime<=0;$('#notice').textContent=game.message
  document.querySelectorAll('[data-seed]').forEach(b=>{const i=Number(b.dataset.seed);b.classList.toggle('selected',i===game.selected);b.setAttribute('aria-pressed',String(i===game.selected))})
  game.seeds.forEach((n,i)=>$(`[data-count="${i}"]`).textContent=`${n} กล้า`)
  drawMap()
}
function animate(ms) {
  raf=requestAnimationFrame(animate)
  const dt=Math.min(.1,last?(ms-last)/1000:1/60);last=ms
  if(!paused) {
    accumulator+=dt
    const input={x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x,
      z:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.z,
      sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.sprint,jump:keys.has('Space')||touch.jump,interact:keys.has('KeyE')||touch.interact}
    const oldAction=game.latch
    let frames=0
    while(accumulator>=1/60&&frames++<6) {step(game,input,1/60,camera.yaw);accumulator-=1/60}
    saveTime+=dt
    if((!oldAction&&game.latch)||saveTime>3) {save();saveTime=0}
    if(game.verified&&!completionSeen)finish()
  }
  world?.update(game,camera,dt)
  hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0}
}
try {
  world=new RangerWorld(host);updateHUD();raf=requestAnimationFrame(animate)
} catch(error) {
  console.error('Action renderer failed',error)
  $('#intro').hidden=true;$('#render-error').hidden=false
  $('#error-detail').textContent='เปิด WebGL ไม่สำเร็จ ลองเปิด Hardware Acceleration หรือใช้เบราว์เซอร์อื่น เกมฟาร์มเดิมยังเปิดจากลิงก์ด้านล่างได้'
}
on(window,'pagehide',()=>{
  if(started)save();cancelAnimationFrame(raf);listeners.forEach(remove=>remove());world?.dispose()
},{once:true})
