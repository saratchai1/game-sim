import * as THREE from 'three'
import { RangerAvatar } from './character.js'
import { SLOTS, CATALOG, PALETTES, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, DEFAULT_APPEARANCE, PRESETS, normalizeAppearance, applyPreset } from './appearance.js'

const PATHS={
 head:'M15 26c1-13 5-17 17-17s16 4 17 17M7 28q25 13 50 0M14 25q18 7 36 0M25 12l2 13',
 outer:'M22 9l10 5 10-5 15 14-9 10-5-5v28H21V28l-5 5-9-10zM32 15v41M25 10l-4 11 8 3M39 10l4 11-8 3M24 31h5v7h-5M36 31h5v7h-5',
 legs:'M20 8h24l3 47H34l-2-28-2 28H17zM20 15h24M21 23h6v12h-7M37 23h6v12h-6',
 feet:'M19 9h19v25l15 8v12H13V42l6-5zM13 48h40M20 17h17M22 23h12M22 29h12M32 39h9',
 back:'M18 15q0-6 14-6t14 6v39H18zM26 9V5h12v4M18 23h28M23 33h18v14H23zM18 29H12v19h6M46 29h6v19h-6M27 17v10M37 17v10',
 eyes:'M7 26l8-8h34l8 8M12 28h16v14H12zM36 28h16v14H36zM28 30h8M12 28l-5-2M52 28l5-2',
 hands:'M19 35V19q0-6 5-4V9q3-7 6-1v-3q5-4 6 2v2q5-4 6 3v4q5-3 5 4v17l-6 16H22l-9-17q-3-10 3-9zM24 15v17M30 8v23M36 9v22M42 16v16M22 45h20',
 tool:'M27 7h10v10H27zM32 17v21M24 38h16l3 10-11 11-11-11zM29 12h6M32 41v11',
}
export function slotIcon(slot,variant='',color='currentColor'){
 const path=variant==='none'||variant==='bare'?'M14 14l36 36M50 14L14 50':PATHS[slot]||PATHS.outer
 return `<svg viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
}
class WardrobeStudio {
 constructor(host,outfit){
  this.host=host;this.yaw=-.23;this.distance=4.65;this.pose='idle';this.elapsed=0;this.drag=null;this.resources=[];this.listeners=[]
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(33,1,.1,40)
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap
  this.renderer.shadowMap.autoUpdate=false;this.shadowTime=-1
  this.renderer.domElement.setAttribute('aria-label','พรีวิวตัวละครสามมิติ ลากเพื่อหมุนและเลื่อนเพื่อซูม');host.append(this.renderer.domElement)
  const key=new THREE.DirectionalLight('#ffedcd',3.4);key.position.set(-3,5,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024)
  Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:15});key.shadow.normalBias=.016
  this.scene.add(key,new THREE.HemisphereLight('#eaf2e6','#293830',2.1))
  const rim=new THREE.DirectionalLight('#9cddcd',2.7);rim.position.set(2,3,3);this.scene.add(rim)
  const fill=new THREE.DirectionalLight('#f1cf9f',.8);fill.position.set(4,2,-2);this.scene.add(fill)
  const geometry=new THREE.CylinderGeometry(.87,.95,.09,64),material=new THREE.MeshStandardMaterial({color:'#334540',roughness:.7,metalness:.15})
  const floor=new THREE.Mesh(geometry,material);floor.position.y=-.01;floor.receiveShadow=true;this.scene.add(floor);this.resources.push(geometry,material)
  const ringGeo=new THREE.TorusGeometry(.88,.009,6,64),ringMat=new THREE.MeshStandardMaterial({color:'#cab782',metalness:.5,roughness:.5})
  const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.041;this.scene.add(ring);this.resources.push(ringGeo,ringMat)
  this.setOutfit(outfit)
  const on=(event,fn,options)=>{host.addEventListener(event,fn,options);this.listeners.push(()=>host.removeEventListener(event,fn,options))}
  on('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX};host.setPointerCapture(e.pointerId)})
  on('pointermove',e=>{if(this.drag?.id!==e.pointerId)return;this.yaw+=(e.clientX-this.drag.x)*.011;this.drag.x=e.clientX})
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(event,()=>{this.drag=null})
  on('wheel',e=>{e.preventDefault();this.distance=THREE.MathUtils.clamp(this.distance+e.deltaY*.0028,3.15,5.8)},{passive:false})
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize()
 }
 setOutfit(outfit){this.avatar?.dispose();this.avatar=new RangerAvatar(outfit);this.scene.add(this.avatar.root);this.renderer.domElement.dataset.outfit=this.avatar.signature;this.renderer.shadowMap.needsUpdate=true}
 resize(){const r=this.host.getBoundingClientRect();this.camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);this.camera.updateProjectionMatrix();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false)}
 update(dt){
  this.elapsed+=dt;const r=this.host.getBoundingClientRect()
  // Fit the complete rig above the pedestal in short phone landscape viewports.
  const distance=this.distance+(r.width/r.height<.65?.9:0)
  this.camera.position.set(0,1.40,-distance);this.camera.lookAt(0,1.13,0)
  this.avatar.root.rotation.y=this.yaw;this.avatar.update(dt,this.elapsed,{moving:this.pose==='walk',grounded:true})
  if(this.elapsed-this.shadowTime>.13){this.renderer.shadowMap.needsUpdate=true;this.shadowTime=this.elapsed}
  this.renderer.render(this.scene,this.camera)
 }
 dispose(){this.observer.disconnect();this.listeners.forEach(fn=>fn());this.avatar.dispose();this.resources.forEach(r=>r.dispose());this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove()}
}
export class RangerWardrobe {
 constructor({onApply,onClose}){this.onApply=onApply;this.onClose=onClose;this.opened=false;this.slot='head';this.tab='equipment';this.studio=null}
 open(equipped,looks=[]){
  if(this.opened)return
  this.opened=true;this.draft=normalizeAppearance(equipped);this.looks=Array.from({length:3},(_,i)=>looks[i]?normalizeAppearance(looks[i]):null)
  this.returnFocus=document.activeElement
  this.root=document.createElement('section');this.root.className='ranger-locker';this.root.id='wardrobe-screen';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','locker-title')
  this.root.innerHTML=`
    <header class="locker-header"><div class="locker-brand"><span class="locker-mark">${slotIcon('outer')}</span><div><small>MANGROVE RANGER / CHARACTER STUDIO</small><h1 id="locker-title">FIELD LOCKER <span>ห้องแต่งตัว</span></h1></div></div><div class="locker-session"><i></i> ภารกิจหยุดชั่วคราว</div><button class="locker-close" id="locker-close" aria-label="ปิดห้องแต่งตัว">×</button></header>
    <div class="locker-body"><aside class="locker-equipment"><div class="locker-section-label">EQUIPPED <span>08 SLOTS</span></div><div id="locker-slots"></div><div class="locker-cosmetic"><i>◇</i><p>แต่งตัวได้อิสระ<small>ไอเทมทั้งหมดเลือกได้ฟรี<br>ไม่มีผลต่อพลังหรือเครดิต</small></p></div></aside>
    <section class="locker-preview"><div class="locker-avatar-label"><span>RANGER / 01</span><h2>เจ้าหน้าที่ฟื้นฟูชายฝั่ง</h2><small>LIVE 3D PREVIEW</small></div><div id="locker-canvas" class="locker-canvas"></div><div class="locker-orbit-hint">ลากเพื่อหมุน · เลื่อนเพื่อซูม</div><div class="locker-camera"><button data-angle="-.23" aria-label="มองด้านหน้า">ด้านหน้า</button><button data-angle="2.9" aria-label="มองด้านหลัง">ด้านหลัง</button><span></span><button data-pose="idle" aria-pressed="true">ยืน</button><button data-pose="walk" aria-pressed="false">เดิน</button></div></section>
    <section class="locker-collection"><nav class="locker-tabs" aria-label="หมวดแต่งตัว"><button data-tab="equipment" aria-pressed="true">อุปกรณ์</button><button data-tab="appearance" aria-pressed="false">รูปลักษณ์</button><button data-tab="loadouts" aria-pressed="false">ชุดสำเร็จ</button></nav><div id="locker-content" class="locker-content"></div></section></div>
    <footer class="locker-footer"><div><strong id="locker-status" role="status" aria-live="polite">ชุดจะเปลี่ยนในเกมเมื่อกดบันทึกและสวมใส่</strong><small>บันทึกในเบราว์เซอร์นี้ · แยกจากความคืบหน้าภารกิจ</small></div><div class="locker-footer-actions"><button id="locker-cancel" class="locker-secondary">ยกเลิก</button><button id="locker-apply" class="locker-primary">บันทึกและสวมใส่ <span>↗</span></button></div></footer>`
  document.body.append(this.root)
  this.app=document.querySelector('.ranger-app');this.appInert=this.app?.inert;if(this.app)this.app.inert=true
  this.root.addEventListener('click',e=>this.click(e))
  this.root.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return
    const list=[...this.root.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(el=>el.getClientRects().length)
    const first=list[0],last=list.at(-1)
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  })
  try{this.studio=new WardrobeStudio(this.root.querySelector('#locker-canvas'),this.draft)}
  catch(error){console.error('Wardrobe preview failed',error);this.root.querySelector('#locker-canvas').textContent='เปิดพรีวิวไม่ได้ ลองปิดแล้วเปิดห้องแต่งตัวอีกครั้ง'}
  this.render();this.root.querySelector('#locker-close').focus()
 }
 click(e){
  const b=e.target.closest('button');if(!b)return
  if(b.id==='locker-close'||b.id==='locker-cancel')return this.cancel()
  if(b.id==='locker-apply'){
    if(this.onApply(this.draft,this.looks)){this.close();this.onClose(true)}
    else {this.status('บันทึกไม่ได้ ชุดยังไม่ถูกเปลี่ยน กรุณาตรวจพื้นที่จัดเก็บ',true)}
    return
  }
  if(b.dataset.slot){this.slot=b.dataset.slot;this.tab='equipment';this.render();return}
  if(b.dataset.tab){this.tab=b.dataset.tab;this.render();return}
  if(b.dataset.item){this.draft[this.slot]=b.dataset.item;this.change();return}
  if(b.dataset.field){this.draft[b.dataset.field]=b.dataset.value;this.change();return}
  if(b.dataset.preset){this.draft=applyPreset(PRESETS.find(p=>p.id===b.dataset.preset),this.draft);this.change();return}
  if(b.dataset.store!==undefined){this.looks[Number(b.dataset.store)]={...this.draft};this.render();this.status('เก็บชุดไว้ในช่องแล้ว กดบันทึกและสวมใส่เพื่อบันทึกถาวร');return}
  if(b.dataset.load!==undefined){const look=this.looks[Number(b.dataset.load)];if(look){this.draft=normalizeAppearance(look);this.change()}return}
  if(b.dataset.angle&&this.studio)this.studio.yaw=Number(b.dataset.angle)
  if(b.dataset.pose&&this.studio){this.studio.pose=b.dataset.pose;for(const p of this.root.querySelectorAll('[data-pose]'))p.setAttribute('aria-pressed',String(p===b))}
 }
 change(){this.draft=normalizeAppearance(this.draft);this.studio?.setOutfit(this.draft);this.render();this.status('พรีวิวชุดใหม่ · กดบันทึกและสวมใส่เพื่อนำไปใช้ในเกม')}
 status(text,error=false){const el=this.root.querySelector('#locker-status');el.textContent=text;el.classList.toggle('locker-error',error)}
 render(){
  const a=this.draft,p=PALETTES.find(p=>p.id===a.palette)
  this.root.style.setProperty('--outfit-color',p.color)
  this.root.querySelector('#locker-slots').innerHTML=SLOTS.map(s=>`<button class="locker-slot ${this.tab==='equipment'&&this.slot===s.id?'active':''}" data-slot="${s.id}" aria-pressed="${this.tab==='equipment'&&this.slot===s.id}"><span class="slot-art">${slotIcon(s.id)}</span><span><small>${s.en}</small><b>${CATALOG[s.id].find(i=>i.id===a[s.id]).name}</b></span><i>›</i></button>`).join('')
  for(const tab of this.root.querySelectorAll('[data-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.tab===this.tab))
  const content=this.root.querySelector('#locker-content')
  if(this.tab==='equipment'){
    const s=SLOTS.find(s=>s.id===this.slot),selected=CATALOG[s.id].find(i=>i.id===a[s.id])
    content.innerHTML=`<div class="collection-heading"><div><small>YOUR COLLECTION / ${s.en}</small><h2>${s.name}</h2></div><span>${CATALOG[s.id].length} ไอเทม</span></div><div class="locker-item-grid">${CATALOG[s.id].map(i=>`<button class="locker-item ${a[s.id]===i.id?'selected':''}" data-item="${i.id}" aria-pressed="${a[s.id]===i.id}"><span class="item-tag">${i.label}</span><span class="item-art">${slotIcon(s.id,i.id,p.trim)}</span><span class="item-name">${i.name}</span><small>${a[s.id]===i.id?'✓ กำลังลอง':'ลองสวมใส่'}</small></button>`).join('')}</div><div class="locker-description"><span>ITEM DETAIL</span><h3>${selected.name}</h3><p>${selected.description}</p></div>${this.swatches('palette','สีชุด',PALETTES,a.palette)}<p class="locker-fineprint">ทุกไอเทมเป็นของตกแต่ง ไม่มีร้านเงินจริงหรือระบบสุ่ม</p>`
  } else if(this.tab==='appearance'){
    content.innerHTML=`<div class="collection-heading"><div><small>MAKE IT YOURS</small><h2>รูปลักษณ์ตัวละคร</h2></div></div>${this.swatches('skin','โทนผิว',SKIN_TONES,a.skin)}<div class="locker-custom-block"><h3>ทรงผม</h3><div class="locker-hair-grid">${HAIR_STYLES.map((h,i)=>`<button data-field="hair" data-value="${h.id}" aria-pressed="${a.hair===h.id}"><span class="hair-shape hair-${i}"></span>${h.name}</button>`).join('')}</div><small>เลือก “ไม่สวมหมวก” เพื่อเห็นทรงผมชัดเจน</small></div>${this.swatches('hairColor','สีผม',HAIR_COLORS,a.hairColor)}${this.swatches('palette','สีชุด',PALETTES,a.palette)}`
  } else {
    content.innerHTML=`<div class="collection-heading"><div><small>READY FOR THE FIELD</small><h2>ชุดสำเร็จรูป</h2></div></div><div class="locker-presets">${PRESETS.map(p=>`<button class="locker-preset" data-preset="${p.id}"><span style="color:${PALETTES.find(c=>c.id===p.outfit.palette).color}">${slotIcon('outer')}</span><div><small>${p.en}</small><b>${p.name}</b><p>${p.description}</p></div><i>›</i></button>`).join('')}</div><div class="locker-custom-block"><h3>ชุดที่ฉันจัดไว้ <small>3 ช่อง</small></h3><div class="locker-saved">${this.looks.map((look,i)=>`<div><b>0${i+1}</b><span>${look?'บันทึกชุดส่วนตัว':'ช่องว่าง'}</span><button data-load="${i}" ${look?'':'disabled'}>ใช้ชุด</button><button data-store="${i}">เก็บชุดนี้</button></div>`).join('')}</div><small>ช่องชุดจะถูกบันทึกพร้อมปุ่มบันทึกและสวมใส่ด้านล่าง</small></div>`
  }
 }
 swatches(field,title,options,value){return `<div class="locker-custom-block"><h3>${title}<small>${options.find(o=>o.id===value)?.name||''}</small></h3><div class="locker-swatches">${options.map(o=>`<button style="--swatch:${o.color}" data-field="${field}" data-value="${o.id}" aria-label="${title}: ${o.name}" title="${o.name}" aria-pressed="${value===o.id}"><span></span>${value===o.id?'<i>✓</i>':''}</button>`).join('')}</div></div>`}
 update(dt){if(this.opened)this.studio?.update(dt)}
 cancel(){if(!this.opened)return;this.close();this.onClose(false)}
 close(){if(!this.opened)return;this.opened=false;this.studio?.dispose();this.studio=null;this.root.remove();if(this.app)this.app.inert=this.appInert;this.returnFocus?.focus?.()}
 dispose(){this.close()}
}
