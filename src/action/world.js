import * as THREE from 'three'
import { RangerAvatar } from './character.js'
import { CAMP, CACHES, FOREST, LOGS, MUD, SITES, SPECIES, STATION, TRASH, terrainHeight, floorHeight, tide, isStorm, random } from './simulation.js'

// Original procedural scene. No downloaded images, models or runtime CDN calls.
export class RangerWorld {
  constructor(host, appearance) {
    this.appearance = appearance; this.avatar = null
    this.host = host; this.resources = new Set(); this.plants = []; this.debris = []
    this.cameraObstacles = []; this.cameraRay = new THREE.Raycaster(); this.shadowTime = -1
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#b9cabb')
    this.scene.fog = new THREE.FogExp2('#b9cabb', 0.021)
    this.camera = new THREE.PerspectiveCamera(53, 1, 0.08, 130)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.25 : 1.6))
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.setAttribute('aria-label', 'ฉากแอ็กชันป่าชายเลนสามมิติ')
    host.append(this.renderer.domElement)
    this.scene.add(new THREE.HemisphereLight('#dce7cd', '#283d2b', 1.65))
    this.sun = new THREE.DirectionalLight('#ffe6ac', 3.2)
    this.sun.position.set(-22, 37, -29); this.sun.castShadow = true
    Object.assign(this.sun.shadow.camera, { left: -38, right: 38, top: 45, bottom: -45, near: 1, far: 100 })
    this.sun.shadow.mapSize.set(1536, 1536); this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.055
    this.sun.target.position.set(0, 0, -12); this.scene.add(this.sun, this.sun.target)
    this.scene.add(new THREE.AmbientLight('#b8c6a1', 0.2))
    this.g = {
      sphere: this.keep(new THREE.SphereGeometry(1, 12, 9)),
      trunk: this.keep(new THREE.CylinderGeometry(0.73, 1, 1, 9)),
      box: this.keep(new THREE.BoxGeometry(1, 1, 1)),
      leaf: this.keep(new THREE.SphereGeometry(1, 8, 6)),
      blade: this.keep(new THREE.ConeGeometry(1, 1, 3)),
    }
    this.m = {
      bark: this.mat('#63503a'), leaves: this.mat('#426345'), wood: this.mat('#92744a'),
      dark: this.mat('#273d37'), metal: this.mat('#9da9a2', { metalness: 0.45, roughness: 0.43 }),
      soil: this.mat('#503a27'), gold: this.mat('#dca952'), teal: this.mat('#86d9bc'),
    }
    this.buildTerrain(); this.buildForest(); this.buildCamp(); this.buildCourse(); this.buildCharacter(); this.buildAtmosphere()
    this.scene.updateMatrixWorld(true)
    this.camera.position.set(0, 3.5, 16); this.lookTarget = new THREE.Vector3(0, 2, 11)
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host); this.resize()
  }
  keep(obj) { this.resources.add(obj); return obj }
  mat(color, rest = {}) { return this.keep(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...rest })) }
  mesh(geo, mat, pos, scale = [1,1,1], parent = this.scene) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m
  }
  box(pos, size, mat = this.m.wood, parent) { return this.mesh(this.g.box, mat, pos, size, parent) }
  beam(a, b, radius, mat, parent = this.scene) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from)
    const m = this.mesh(this.g.trunk, mat, from.clone().add(to).multiplyScalar(0.5).toArray(), [radius, direction.length(), radius], parent)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize()); return m
  }
  instances(geo, entries, material) {
    if (!entries.length) return
    const mesh = new THREE.InstancedMesh(geo, material, entries.length), temp = new THREE.Object3D()
    entries.forEach((e,i) => {
      temp.position.set(...e.p); temp.scale.set(...e.s); temp.rotation.set(...(e.r || [0,0,0])); temp.updateMatrix()
      mesh.setMatrixAt(i, temp.matrix); if (e.c) mesh.setColorAt(i, new THREE.Color(e.c))
    })
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.scene.add(mesh); return mesh
  }
  buildTerrain() {
    const geo = this.keep(new THREE.PlaneGeometry(74, 84, 148, 168)); geo.rotateX(-Math.PI / 2); geo.translate(0,0,-10)
    const p = geo.attributes.position, colors = [], color = new THREE.Color(), rng = random(993)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainHeight(x,z); p.setY(i, y)
      const path = Math.abs(x - Math.sin(z * 0.15) * 0.8) < 3.2
      color.set(y < 0.2 ? '#564d39' : x > 12 ? '#afa27d' : path ? '#9b8255' : '#536346')
      color.multiplyScalar(0.86 + rng() * 0.26); colors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3)); geo.computeVertexNormals()
    this.mesh(geo, this.mat('#ffffff', { vertexColors: true }), [0,0,0]).castShadow = false
    this.water = this.mesh(this.keep(new THREE.PlaneGeometry(150,150)), this.mat('#5f9f98', { transparent: true, opacity: 0.88, roughness: 0.28, metalness: 0.12 }), [0,0,0])
    this.water.rotation.x = -Math.PI / 2; this.water.castShadow = false
    const mud = this.mesh(this.keep(new THREE.CircleGeometry(MUD.radius,48)), this.mat('#534c38', { transparent:true, opacity:0.82, depthWrite:false }), [MUD.x, terrainHeight(MUD.x,MUD.z)+0.04, MUD.z], [1,0.8,1])
    mud.rotation.x = -Math.PI / 2
    const stoneEntries = [], grassEntries = [], leafEntries = []
    for (let i = 0; i < 2000; i++) {
      const x = -30 + rng()*44, z = -45+rng()*69, y = terrainHeight(x,z)
      if (y < 0.3 || Math.abs(x) < 3.3 || [...SITES, ...CACHES, CAMP].some(t => Math.hypot(t.x-x,t.z-z)<2.2)) continue
      if (Math.abs(x+10)<1.7 && Math.abs(z+18)<7) continue
      const h = 0.18+rng()*0.52
      grassEntries.push({p:[x,y+h/2,z],s:[0.08,h,0.08],r:[0,rng()*6.28,0.1-rng()*0.2],c:['#6c7950','#7a8858','#456c45'][i%3]})
      if (i % 10 === 0) {
        for(let j=0;j<6;j++) {const a=j*Math.PI/3; leafEntries.push({p:[x+Math.cos(a)*.28,y+.23,z+Math.sin(a)*.28],s:[.12,.07,.55],r:[.25,a,.22],c:'#577d50'})}
      }
      if (i % 26 === 0) stoneEntries.push({p:[x,y-.03,z],s:[.28+rng()*.5,.3+rng()*.6,.4+rng()*.5],r:[rng(),rng(),0]})
    }
    this.instances(this.g.blade,grassEntries,this.mat('#ffffff'))
    this.instances(this.g.leaf,leafEntries,this.mat('#ffffff'))
    this.instances(this.keep(new THREE.DodecahedronGeometry(1,1)),stoneEntries,this.mat('#7c8270'))
  }
  buildForest() {
    const trunks=[], roots=[], crowns=[], branches=[]
    for (const t of FOREST) {
      const y=terrainHeight(t.x,t.z), h=5.8*t.scale, a=t.phase
      trunks.push({p:[t.x,y+h*.5,t.z],s:[.24*t.scale,h,.24*t.scale],r:[.04*Math.sin(a),a,.035]})
      for(let i=0;i<6;i++) {
        const angle=a+i*1.047, r=.65*t.scale
        const start=new THREE.Vector3(t.x+Math.cos(angle)*r,y+.04,t.z+Math.sin(angle)*r)
        const end=new THREE.Vector3(t.x,y+1.1*t.scale,t.z), v=end.clone().sub(start)
        const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize())
        roots.push({p:start.add(end).multiplyScalar(.5).toArray(),s:[.055*t.scale,v.length(),.055*t.scale],r:new THREE.Euler().setFromQuaternion(q).toArray().slice(0,3)})
      }
      for(let i=0;i<5;i++) {
        const angle=a+i*1.256, r=(i===0?.4:1.6)*t.scale
        crowns.push({p:[t.x+Math.cos(angle)*r,y+h+(i%2)*.65,t.z+Math.sin(angle)*r],s:[1.65*t.scale,.85*t.scale,1.45*t.scale],r:[0,angle,.1],c:['#567546','#3d6540','#6f8950'][i%3]})
        const start=new THREE.Vector3(t.x,y+h*.7,t.z), end=new THREE.Vector3(t.x+Math.cos(angle)*r,y+h,t.z+Math.sin(angle)*r),v=end.clone().sub(start)
        const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize())
        branches.push({p:start.add(end).multiplyScalar(.5).toArray(),s:[.085*t.scale,v.length(),.085*t.scale],r:new THREE.Euler().setFromQuaternion(q).toArray().slice(0,3)})
      }
    }
    this.instances(this.g.trunk,trunks,this.m.bark); this.instances(this.g.trunk,roots,this.m.bark); this.instances(this.g.trunk,branches,this.m.bark)
    this.instances(this.g.sphere,crowns,this.mat('#ffffff'))
  }
  text(text, position, width=3, parent=this.scene) {
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#152b25'; ctx.fillRect(0,0,512,128)
    ctx.strokeStyle='#cdb47b'; ctx.lineWidth=5; ctx.strokeRect(4,4,504,120)
    ctx.fillStyle='#f6eac7'; ctx.font='bold 34px sans-serif'; ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64)
    const texture=this.keep(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace
    const m=this.keep(new THREE.SpriteMaterial({map:texture})); const sprite=new THREE.Sprite(m);sprite.position.set(...position);sprite.scale.set(width,width/4,1);parent.add(sprite)
  }
  buildCamp() {
    const tentMat=this.mat('#526951', {side:THREE.DoubleSide})
    for(const [cx,cz] of [[0,16],[-10,-26.8]]) {
      for(const x of [-2.4,2.4]) for(const z of [-1.5,1.5]) this.beam([cx+x,terrainHeight(cx+x,cz+z),cz+z],[cx+x,3.8,cz+z],.07,this.m.wood)
      const roof=this.box([cx,4,cz],[5.7,.14,4],tentMat);roof.rotation.z=.06
      this.cameraObstacles.push(roof)
      this.box([cx,1,cz],[5.4,.22,3.5],this.m.wood)
    }
    for(const cache of CACHES) {
      const y=floorHeight(cache.x,cache.z), g=new THREE.Group();g.position.set(cache.x,y,cache.z);this.scene.add(g)
      this.box([0,.38,0],[1.1,.75,.85],this.m.gold,g)
      this.box([0,.8,0],[1.2,.09,.93],this.m.wood,g)
      this.box([0,.42,.44],[.14,.5,.05],this.m.metal,g)
      for(let i=0;i<3;i++) {this.beam([-.35+i*.35,.84,0],[-.35+i*.35,1.3,0],.015,this.m.bark,g);this.mesh(this.g.leaf,this.m.leaves,[-.35+i*.35,1.3,0],[.16,.06,.1],g)}
      this.text('SEEDLINGS',[0,1.8,0],1.9,g)
    }
    const y=terrainHeight(STATION.x,STATION.z)
    this.box([STATION.x,y+.75,STATION.z],[1.6,.12,1.05],this.m.wood)
    for(const dx of [-.65,.65]) this.box([STATION.x+dx,y+.36,STATION.z],[.1,.75,.7])
    this.box([STATION.x,y+1.13,STATION.z],[.65,.58,.06],this.m.dark)
    this.box([STATION.x,y+1.14,STATION.z+.045],[.53,.4,.02],this.mat('#70c5ad',{emissive:'#56b6a0',emissiveIntensity:.4}))
    this.text('MRV • BASE CAMP',[STATION.x,2.9,STATION.z],2.6)
  }
  youngTree(kind) {
    const g=new THREE.Group(), color=this.mat(SPECIES[kind].color)
    this.beam([0,0,0],[0,1.8,0],.09,this.m.bark,g)
    const spread=kind===2?1.15:kind===1?.7:.9
    for(let i=0;i<5;i++) {
      const a=i*1.256
      this.mesh(this.g.leaf,color,[Math.sin(a)*spread*.45,1.55+(i%2)*.35,Math.cos(a)*spread*.45],[spread*.7,kind===1?.7:.4,spread*.6],g)
      if(kind===0) this.beam([Math.sin(a)*.55,0,Math.cos(a)*.55],[0,.65,0],.035,this.m.bark,g)
      if(kind===1) this.beam([Math.sin(a)*.45,0,Math.cos(a)*.45],[Math.sin(a)*.45,.22,Math.cos(a)*.45],.024,this.m.bark,g)
    }
    return g
  }
  buildCourse() {
    for(const log of LOGS) {
      const y=terrainHeight(log.x,log.z)+log.radius
      this.beam([log.x-log.half,y,log.z],[log.x+log.half,y,log.z],log.radius,this.m.bark)
      for(let i=0;i<3;i++) this.beam([log.x+i-1,y+.2,log.z],[log.x+i-1.2,y+.55,log.z-.55],.06,this.m.bark)
    }
    // Physical bridge surface matches floorHeight, including accessible ramps.
    for(let i=0;i<21;i++) {
      const z=-23.8+i*.57, y=floorHeight(-10,z)
      this.box([-10,y-.08,z],[2.48,.15,.51],i%2?this.m.wood:this.m.bark)
      if(i%4===0) for(const x of [-11.12,-8.88]) this.beam([x,y-.5,z],[x,y+1,z],.055,this.m.wood)
    }
    for(const x of [-11.12,-8.88]) this.beam([x,2.25,-22],[x,2.25,-14],.038,this.m.wood)
    this.text('HIGH ROUTE',[-10,2.5,-12],2.2)
    for(const site of SITES) {
      const y=floorHeight(site.x,site.z), group=new THREE.Group();group.position.set(site.x,y+.03,site.z);this.scene.add(group)
      const ring=this.mesh(this.keep(new THREE.RingGeometry(.65,.72,40)),this.mat(SPECIES[site.species].color,{side:THREE.DoubleSide,transparent:true,opacity:.65}),[0,.015,0],[1,1,1],group);ring.rotation.x=-Math.PI/2;ring.castShadow=false
      const marker=this.youngTree(site.species);marker.scale.setScalar(.18);group.add(marker)
      const plant=this.youngTree(site.species);plant.visible=false;group.add(plant)
      const orb=this.mesh(this.keep(new THREE.OctahedronGeometry(.11)),this.mat('#eac781',{emissive:'#ba8537',emissiveIntensity:.9}),[0,2.7,0],[1,1,1],group);orb.visible=false
      this.plants.push({group,ring,marker,plant,orb})
    }
    const plastic=this.mat('#c27944'), net=this.mat('#415150')
    for(const t of TRASH) {
      const group=new THREE.Group();group.position.set(t.x,terrainHeight(t.x,t.z)+.06,t.z);this.scene.add(group)
      for(let i=0;i<5;i++) this.box([Math.sin(i*3)*.4,.15+(i%2)*.12,Math.cos(i*4)*.28],[.26,.16,.34],i%2?plastic:net,group).rotation.y=i
      this.debris.push({id:t.id,group})
    }
  }
  buildCharacter() { this.setAppearance(this.appearance) }
  setAppearance(value) {
    const next = new RangerAvatar(value)
    if (this.avatar?.signature === next.signature) { next.dispose(); return }
    if (this.character) {
      next.root.position.copy(this.character.position)
      next.root.rotation.copy(this.character.rotation)
    }
    this.avatar?.dispose()
    this.avatar = next; this.character = next.root
    this.renderer.domElement.dataset.outfit = next.signature
    this.scene.add(this.character); this.renderer.shadowMap.needsUpdate = true
  }
  buildAtmosphere() {
    const rng=random(12), geo=this.keep(new THREE.BufferGeometry()), positions=new Float32Array(900)
    for(let i=0;i<positions.length;i+=3) {positions[i]=(rng()-.5)*28;positions[i+1]=rng()*15;positions[i+2]=(rng()-.5)*28}
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3))
    this.rain=new THREE.Points(geo,this.keep(new THREE.PointsMaterial({color:'#d0dfde',size:.055,transparent:true,opacity:.7})));this.scene.add(this.rain)
    const motesGeo=this.keep(new THREE.BufferGeometry()), motes=new Float32Array(180)
    for(let i=0;i<motes.length;i+=3) {motes[i]=(rng()-.5)*40;motes[i+1]=1+rng()*7;motes[i+2]=-35+rng()*60}
    motesGeo.setAttribute('position',new THREE.BufferAttribute(motes,3));this.motes=new THREE.Points(motesGeo,this.keep(new THREE.PointsMaterial({color:'#ffdf91',size:.048,transparent:true,opacity:.75})));this.scene.add(this.motes)
    // Distant sky disc, not an overlay over the playable world.
    const sun=this.mesh(this.g.sphere,this.keep(new THREE.MeshBasicMaterial({color:'#ffedbf'})),[-30,32,-55],[2.8,2.8,2.8]);sun.castShadow=false
  }
  resize() {
    const {width,height}=this.host.getBoundingClientRect();this.camera.aspect=Math.max(1,width)/Math.max(1,height);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false)
  }
  update(s, camera, dt) {
    const p=s.player,time=s.time;this.character.position.set(p.x,p.y,p.z)
    const turn=Math.atan2(Math.sin(p.heading-this.character.rotation.y),Math.cos(p.heading-this.character.rotation.y))
    this.character.rotation.y+=turn*Math.min(1,dt*14)
    this.avatar.update(dt,time,p,s.progress)
    this.water.position.y=tide(time)
    const storm=isStorm(time);this.rain.visible=storm;this.rain.position.set(p.x,0,p.z)
    if(storm) {const a=this.rain.geometry.attributes.position;for(let i=0;i<a.count;i++) a.setY(i,(a.getY(i)-dt*18+15)%15);a.needsUpdate=true}
    this.scene.fog.color.lerp(new THREE.Color(storm?'#718c83':'#b9cabb'),Math.min(1,dt*.5));this.scene.background.copy(this.scene.fog.color)
    this.sun.intensity=THREE.MathUtils.damp(this.sun.intensity,storm?1.2:3.2,2,dt)
    this.motes.position.x=Math.sin(time*.08)*.5
    this.debris.forEach(t=>{t.group.visible=!s.cleaned.includes(t.id)})
    this.plants.forEach((entry,i)=>{
      const site=s.sites[i],planted=site.plantedAt!==null
      entry.marker.visible=!planted;entry.plant.visible=planted
      entry.ring.material.opacity=Math.hypot(p.x-SITES[i].x,p.z-SITES[i].z)<5?.75:.22
      if(planted) {
        const age=time-site.plantedAt,goal=.23+Math.min(1,age/35)*.95
        const scale=THREE.MathUtils.damp(entry.plant.scale.x,goal,4,dt);entry.plant.scale.setScalar(scale)
        entry.plant.rotation.z=Math.sin(time*1.4+i)*.024
        entry.orb.visible=age>=22&&!site.sampled;entry.orb.position.y=2.65+Math.sin(time*2+i)*.1;entry.orb.rotation.y=time
      }
    })
    const look=new THREE.Vector3(p.x+Math.sin(camera.yaw)*.5,p.y+1.48,p.z-Math.cos(camera.yaw)*.5)
    const length=camera.distance*Math.cos(camera.pitch)
    const goal=new THREE.Vector3(p.x-Math.sin(camera.yaw)*length,p.y+1.4+Math.sin(camera.pitch)*camera.distance,p.z+Math.cos(camera.yaw)*length)
    // Pull in before the actual shelter geometry; open sides alone do not prevent roof occlusion.
    const rayDirection=goal.clone().sub(look), rayLength=rayDirection.length()
    this.cameraRay.set(look,rayDirection.normalize());this.cameraRay.far=rayLength
    const shelterHit=this.cameraRay.intersectObjects(this.cameraObstacles,false)[0]
    if(shelterHit) goal.copy(look).addScaledVector(rayDirection,Math.max(.6,shelterHit.distance-.45))
    for(let f=.2;f<1;f+=.1) {
      const q=look.clone().lerp(goal,f)
      if(FOREST.some(t=>Math.hypot(q.x-t.x,q.z-t.z)<.6&&q.y<terrainHeight(t.x,t.z)+5*t.scale)) {goal.copy(look.clone().lerp(goal,Math.max(.25,f-.12)));break}
    }
    goal.y=Math.max(goal.y,floorHeight(goal.x,goal.z)+.45)
    this.camera.position.lerp(goal,1-Math.exp(-dt*9));this.lookTarget.lerp(look,1-Math.exp(-dt*11));this.camera.lookAt(this.lookTarget)
    if(time-this.shadowTime>.2||time<this.shadowTime) {this.renderer.shadowMap.needsUpdate=true;this.shadowTime=time}
    this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.ready='true'
  }
  dispose() {
    this.avatar?.dispose();this.resizeObserver.disconnect();this.scene.traverse(o=>{if(o.isInstancedMesh)o.dispose()});this.resources.forEach(o=>o.dispose?.());this.renderer.dispose();this.renderer.domElement.remove()
  }
}
