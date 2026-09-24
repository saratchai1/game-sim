import * as THREE from 'three'
import { expeditionGuidance, fieldAdvice, compassHeading } from './guidance.js'
import { floorHeight } from './simulation.js'
import './field-guide.css'

// Presentation owned by the existing world loop. No second renderer, timer,
// storage key, teleport, or automatic interaction is introduced here.
export class FieldGuide {
  constructor(world, onRecenter) {
    this.world=world; this.resources=[]; this.lastLatch=true; this.burstTime=-10; this.hudTime=1
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)')
    this.root=new THREE.Group(); world.scene.add(this.root)
    const own=o=>(this.resources.push(o),o)
    const gold=own(new THREE.MeshBasicMaterial({color:'#efd18c',transparent:true,opacity:.85,depthWrite:false}))
    this.beacon=new THREE.Group(); this.root.add(this.beacon)
    const ring=new THREE.Mesh(own(new THREE.RingGeometry(.65,.71,36)),gold)
    ring.rotation.x=-Math.PI/2;ring.position.y=.045;this.beacon.add(ring)
    this.diamond=new THREE.Mesh(own(new THREE.OctahedronGeometry(.19)),gold)
    this.diamond.position.y=2.15;this.beacon.add(this.diamond)
    const stem=new THREE.Mesh(own(new THREE.CylinderGeometry(.016,.016,1.3,5)),gold)
    stem.position.y=1.13;this.beacon.add(stem)
    this.burst=new THREE.Group();this.root.add(this.burst)
    this.burstMaterial=own(new THREE.MeshBasicMaterial({color:'#a5eac4',transparent:true,opacity:0,depthWrite:false}))
    this.burstRing=new THREE.Mesh(own(new THREE.RingGeometry(.85,.92,36)),this.burstMaterial)
    this.burstRing.rotation.x=-Math.PI/2;this.burst.add(this.burstRing)
    this.route=document.createElement('div');this.route.className='route-hint'
    this.route.innerHTML='<span class="route-arrow" aria-hidden="true">↑</span><div><strong></strong><small></small></div>'
    document.querySelector('.mission').append(this.route)
    this.arrow=this.route.querySelector('.route-arrow');this.routeTitle=this.route.querySelector('strong');this.routeDetail=this.route.querySelector('small')
    this.advice=document.createElement('div');this.advice.className='field-advice'
    this.advice.innerHTML='<strong></strong><small></small>'
    document.querySelector('.map-panel').append(this.advice)
    this.adviceTitle=this.advice.querySelector('strong');this.adviceDetail=this.advice.querySelector('small')
    this.recenter=document.createElement('button');this.recenter.type='button';this.recenter.className='icon-button camera-recenter';this.recenter.id='camera-recenter'
    this.recenter.setAttribute('aria-label','คืนมุมกล้องด้านหลังตัวละคร');this.recenter.title='คืนมุมกล้องด้านหลังตัวละคร [Q]'
    this.recenter.innerHTML='<span aria-hidden="true">↺</span><span class="recenter-label">คืนมุมกล้อง</span><kbd>Q</kbd>'
    this.onRecenter=onRecenter;this.recenter.addEventListener('click',onRecenter)
    document.querySelector('.top-actions').prepend(this.recenter)
    this.compass=document.querySelector('.compass>div')
    this.compass.innerHTML='<span></span><span>·</span><b></b><span>·</span><span></span>'
    this.headingNodes=[this.compass.children[0],this.compass.children[2],this.compass.children[4]]
  }
  update(s, camera, dt, active) {
    const guide=expeditionGuidance(s,camera.yaw)
    this.beacon.visible=guide.phase!=='complete'
    this.beacon.position.set(guide.target.x,floorHeight(guide.target.x,guide.target.z)+.08,guide.target.z)
    if(!this.reducedMotion.matches) {
      this.diamond.rotation.y=s.time*.65
      this.diamond.position.y=2.15+Math.sin(s.time*2)*.09
    } else {this.diamond.rotation.y=0;this.diamond.position.y=2.15}
    if(active&&s.latch&&!this.lastLatch) {
      this.burstTime=s.time;this.burst.position.set(s.player.x,s.player.y+.08,s.player.z)
    }
    this.lastLatch=s.latch
    const elapsed=s.time-this.burstTime
    this.burst.visible=!this.reducedMotion.matches&&elapsed>=0&&elapsed<1.1
    if(this.burst.visible){this.burstRing.scale.setScalar(.4+elapsed*1.5);this.burstMaterial.opacity=(1-elapsed/1.1)*.65}
    this.recenter.disabled=!active
    this.hudTime+=dt
    if(this.hudTime<.1)return
    this.hudTime=0
    this.route.hidden=guide.phase==='complete'
    this.arrow.style.transform=`rotate(${guide.bearing}rad)`
    this.routeTitle.textContent=guide.label
    this.routeDetail.textContent=guide.viaBridge?'เส้นทางสะพานแนะนำ · ต้องเดินหลบสิ่งกีดขวาง':guide.distance<2.15?'ถึงจุดแล้ว · ทำตามคำแนะนำปุ่ม E':guide.waiting?`พร้อมเก็บอีก ${guide.waiting} วินาที`:'ตามลูกศรไปยังเป้าหมาย'
    this.headingNodes.forEach((node,i)=>{node.textContent=compassHeading(camera.yaw+(i-1)*Math.PI/4).label})
    const advice=fieldAdvice(s,camera.yaw)
    this.advice.dataset.kind=advice.kind;this.adviceTitle.textContent=advice.title;this.adviceDetail.textContent=advice.detail
    this.world.host.dataset.guideTarget=guide.goal.id||'station'
    this.world.host.dataset.guideRoute=guide.viaBridge?'bridge':'direct'
    this.world.host.dataset.guidePhase=guide.phase
    this.world.host.dataset.cameraYaw=String(camera.yaw)
  }
  dispose() {
    this.recenter.removeEventListener('click',this.onRecenter)
    this.route.remove();this.advice.remove();this.recenter.remove();this.root.removeFromParent()
    this.resources.forEach(resource=>resource.dispose())
  }
}
