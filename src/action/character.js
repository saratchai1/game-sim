import * as THREE from 'three'
import { normalizeAppearance, appearanceSignature, PALETTES, SKIN_TONES, HAIR_COLORS } from './appearance.js'

// One original articulated model is shared by gameplay and the wardrobe preview.
// Geometry is generated locally, batched per rigid joint/material, then released on replacement.
export class RangerAvatar {
  constructor(value) {
    this.appearance=normalizeAppearance(value);this.signature=appearanceSignature(value)
    this.root=new THREE.Group();this.root.name='ranger-avatar';this.resources=new Set();this.disposed=false
    this.joints={};this.eyeGroups=[];this.time=0
    const a=this.appearance,p=PALETTES.find(p=>p.id===a.palette)
    const mat=(color,roughness=.82,metalness=0)=>this.keep(new THREE.MeshStandardMaterial({color,roughness,metalness}))
    this.m={cloth:mat(p.color),darkCloth:mat(p.dark),trim:mat(p.trim),pants:mat(a.legs==='waders'?'#455958':'#495149'),
      skin:mat(SKIN_TONES.find(s=>s.id===a.skin).color,.68),hair:mat(HAIR_COLORS.find(h=>h.id===a.hairColor).color,.87),
      leather:mat('#725640',.75),sole:mat('#232b29',.94),metal:mat('#abb5aa',.35,.68),gold:mat('#bf9f60',.38,.5),
      lining:mat('#dcd8c8',.95),eye:mat('#f2e6d2',.4),iris:mat('#506552',.4),black:mat('#1c2927',.55),
      lip:mat('#985f4d',.8),orange:mat('#c9713b'),glass:mat(a.eyes==='shades'?'#263c43':'#996e36',.19,.45),
      light: this.keep(new THREE.MeshStandardMaterial({color:'#b5e5d7',emissive:'#589b89',emissiveIntensity:.6,roughness:.3})),
    }
    this.g={sphere:this.keep(new THREE.SphereGeometry(1,20,14)),small:this.keep(new THREE.SphereGeometry(1,10,8)),
      cylinder:this.keep(new THREE.CylinderGeometry(1,1,1,16)),cone:this.keep(new THREE.CylinderGeometry(.8,1,1,16)),
      box:this.keep(this.roundedBox()),flatBox:this.keep(new THREE.BoxGeometry(1,1,1)),
      ring:this.keep(new THREE.TorusGeometry(1,.11,8,24)), disc:this.keep(new THREE.CylinderGeometry(1,1,1,32)),
    }
    this.build();this.batch(this.root)
  }
  keep(value){this.resources.add(value);return value}
  roundedBox(){
    const s=new THREE.Shape(),r=.11,w=.5
    s.moveTo(-w+r,-w);s.lineTo(w-r,-w);s.quadraticCurveTo(w,-w,w,-w+r);s.lineTo(w,w-r);s.quadraticCurveTo(w,w,w-r,w);s.lineTo(-w+r,w);s.quadraticCurveTo(-w,w,-w,w-r);s.lineTo(-w,-w+r);s.quadraticCurveTo(-w,-w,-w+r,-w)
    const g=new THREE.ExtrudeGeometry(s,{depth:.78,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.11,curveSegments:4});g.translate(0,0,-.39);g.computeVertexNormals();return g
  }
  group(name,pos,parent=this.root){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);this.joints[name]=g;return g}
  mesh(g,m,pos,scale=[1,1,1],parent=this.root,rotation=null){
    const o=new THREE.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);if(rotation)o.rotation.set(...rotation)
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o
  }
  ball(p,s,m,parent){return this.mesh(this.g.sphere,m,p,s,parent)}
  box(p,s,m,parent,rotation){return this.mesh(this.g.box,m,p,s,parent,rotation)}
  bar(a,b,r,m,parent){const x=new THREE.Vector3(...a),v=new THREE.Vector3(...b).sub(x);const o=this.mesh(this.g.cylinder,m,x.addScaledVector(v,.5).toArray(),[r,v.length(),r],parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
  ring(p,s,m,parent,rotation=[Math.PI/2,0,0]){return this.mesh(this.g.ring,m,p,s,parent,rotation)}
  loft(rings){
    const pos=[],idx=[],n=24
    for(const [y,x,z] of rings)for(let k=0;k<=n;k++){const a=k/n*Math.PI*2;pos.push(Math.sin(a)*x,y,Math.cos(a)*z)}
    for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){const a=j*(n+1)+k,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return this.keep(g)
  }
  build(){
    const a=this.appearance,m=this.m
    // Boots sit on the collision floor. All equipment remains purely cosmetic.
    const hip=this.group('hip',[0,.96,0]);this.ball([0,0,0],[.265,.19,.16],m.pants,hip)
    this.box([0,.07,-.015],[.55,.065,.33],m.leather,hip)
    this.box([0,.07,-.19],[.09,.06,.025],m.metal,hip)
    this.box([0,.07,-.212],[.05,.033,.012],m.sole,hip)
    for(const x of [-.20,.20])this.box([x,.07,-.163],[.032,.075,.025],m.pants,hip)
    const torso=this.group('torso',[0,1.07,0])
    const bottom=a.outer==='parka'?-.24:-.09
    this.mesh(this.loft([[bottom,.26,.16],[bottom+.04,.29,.18],[.08,.29,.18],[.34,.355,.185],[.44,.31,.165],[.55,.13,.115]]),m.cloth,[0,0,0],[1,1,1],torso)
    // Tailored panels, placket, twin pocket flaps, exposed zipper and stitching.
    this.box([0,.17,-.184],[.038,.57,.014],m.darkCloth,torso)
    this.box([0,.16,-.198],[.008,.53,.008],m.metal,torso)
    this.ring([.022,.37,-.212],[.024,.038,.016],m.metal,torso,[0,0,0])
    this.box([0,bottom+.03,0],[.565,.041,.343],m.darkCloth,torso)
    for(const side of [-1,1]){
      const x=side*.195
      this.box([x,.29,-.188],[.195,.16,.028],m.darkCloth,torso)
      this.box([x,.29,-.209],[.178,.145,.019],m.cloth,torso)
      this.box([x,.366,-.223],[.20,.049,.018],m.trim,torso)
      this.ball([x,.35,-.24],[.013,.013,.009],m.gold,torso)
      this.bar([x-side*.08,.235,-.229],[x+side*.08,.235,-.229],.0035,m.trim,torso)
      this.box([side*.19,.005,-.166],[.155,.105,.037],m.darkCloth,torso,[0,side*.12,side*-.08])
      this.box([side*.13,.492,-.099],[.145,.142,.05],m.darkCloth,torso,[.21,0,side*-.43])
      this.box([side*.125,.508,-.121],[.128,.125,.028],m.cloth,torso,[.19,0,side*-.43])
      this.bar([side*.29,.42,-.134],[side*.19,.47,-.11],.008,m.trim,torso)
    }
    // Embroidered-style insignia: shield and raised leaf, not a borrowed logo.
    this.box([-.19,.286,-.234],[.087,.089,.009],m.lining,torso)
    const leaf=this.ball([-.194,.291,-.242],[.019,.032,.004],m.darkCloth,torso);leaf.rotation.z=-.43
    this.bar([-.202,.27,-.247],[-.186,.31,-.247],.0025,m.gold,torso)
    if(a.outer==='parka'){
      this.ball([0,.41,.15],[.225,.17,.13],m.darkCloth,torso)
      this.ball([0,.45,.18],[.19,.095,.08],m.lining,torso)
      for(const side of [-1,1])this.box([side*.245,.18,-.19],[.16,.036,.016],m.lining,torso)
      this.box([0,.16,.184],[.53,.04,.012],m.lining,torso)
    }
    if(a.outer==='survey'){
      this.box([-.28,.13,-.187],[.094,.145,.055],m.black,torso)
      this.bar([-.29,.20,-.19],[-.29,.36,-.185],.013,m.black,torso)
      this.box([-.277,.165,-.22],[.061,.026,.008],m.light,torso)
      for(let i=0;i<3;i++)this.bar([.17+i*.023,.34,-.24],[.17+i*.023,.40,-.24],.007,i===1?m.orange:m.metal,torso)
      this.box([.24,.075,-.21],[.09,.07,.012],m.lining,torso)
    }
    this.buildHead(torso)
    for(const side of [-1,1]){this.buildArm(side,torso);this.buildLeg(side,hip)}
    this.buildPack(torso)
  }
  buildHead(torso){
    const a=this.appearance,m=this.m
    this.mesh(this.g.cylinder,m.skin,[0,.584,0],[.093,.17,.09],torso)
    const head=this.group('head',[0,.77,-.012],torso)
    // Separate cranial/jaw volumes; front is -Z in both studio and expedition.
    this.ball([0,0,0],[.199,.245,.168],m.skin,head)
    this.ball([0,-.117,-.031],[.154,.129,.14],m.skin,head)
    this.ball([0,-.193,-.060],[.095,.040,.073],m.skin,head)
    for(const side of [-1,1]){
      this.ball([side*.190,-.012,.004],[.039,.064,.039],m.skin,head)
      this.ball([side*.210,-.011,-.019],[.013,.036,.008],m.lip,head)
      this.ball([side*.116,-.059,-.130],[.055,.049,.029],m.skin,head)
      const eye=this.group(`eye${side}`,[side*.074,.027,-.159],head);this.eyeGroups.push(eye)
      this.ball([0,0,0],[.045,.023,.013],m.eye,eye)
      this.ball([0,.001,-.012],[.0185,.021,.0045],m.iris,eye)
      this.ball([0,.001,-.016],[.0085,.014,.0025],m.black,eye)
      this.ball([-.005,.009,-.019],[.004,.004,.0015],m.eye,eye)
      this.bar([side*.036,.065,-.166],[side*.108,.07,-.152],.011,m.hair,head)
      this.bar([side*.045,.002,-.169],[side*.107,.005,-.159],.0035,m.skin,head)
    }
    this.ball([0,-.012,-.17],[.029,.059,.027],m.skin,head)
    this.ball([0,-.051,-.195],[.036,.024,.034],m.skin,head)
    for(const x of [-.021,.021])this.ball([x,-.066,-.207],[.007,.004,.008],m.lip,head)
    this.bar([-.045,-.128,-.160],[.045,-.128,-.160],.005,m.lip,head)
    this.ball([0,-.139,-.16],[.034,.008,.006],m.skin,head)
    // Hair cap + locks, visible sides even with headwear. Each style has a distinct silhouette.
    const hairGeo=this.keep(new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.53))
    this.mesh(hairGeo,m.hair,[0,.045,.013],[.205,.221,.171],head)
    for(const side of [-1,1])this.box([side*.183,.048,.02],[.025,.12,.073],m.hair,head)
    if(a.hair==='swept')for(let i=0;i<7;i++){
      const lock=this.ball([-.14+i*.044,.174+Math.sin(i*.48)*.026,-.104],[.046,.077,.055],m.hair,head);lock.rotation.z=-.65
    }
    if(a.hair==='crop')for(let i=0;i<8;i++)this.ball([Math.sin(i)*.11,.229,.02+Math.cos(i)*.07],[.047,.023,.055],m.hair,head)
    if(a.hair==='tied'){
      this.ball([0,.038,.178],[.11,.132,.055],m.hair,head)
      this.ball([0,.055,.238],[.060,.065,.06],m.hair,head)
      this.box([0,.013,.232],[.075,.03,.08],m.darkCloth,head)
      this.ball([0,-.079,.237],[.05,.103,.057],m.hair,head)
    }
    const hat=this.group('hat',[0,.22,0],head)
    if(a.head==='ranger'){
      this.mesh(this.g.disc,m.darkCloth,[0,0,-.02],[.315,.018,.294],hat)
      this.mesh(this.g.disc,m.cloth,[0,.012,-.02],[.305,.012,.284],hat)
      this.mesh(this.g.cone,m.cloth,[0,.107,.015],[.195,.185,.178],hat)
      this.ball([0,.191,.015],[.17,.026,.154],m.cloth,hat)
      this.mesh(this.g.cylinder,m.leather,[0,.058,.013],[.193,.041,.175],hat)
      this.box([0,.08,-.167],[.071,.079,.021],m.gold,hat)
      this.ball([0,.083,-.180],[.018,.027,.006],m.darkCloth,hat)
      for(const x of [-.23,.23])this.bar([x,0,.07],[x*.75,-.26,.07],.006,m.leather,hat)
    }
    if(a.head==='cap'){
      this.mesh(hairGeo,m.cloth,[0,-.07,.013],[.205,.235,.18],hat)
      this.box([0,-.035,-.19],[.345,.021,.22],m.darkCloth,hat,[-.12,0,0])
      this.box([0,-.022,-.186],[.329,.012,.218],m.cloth,hat,[-.12,0,0])
      this.ball([0,.175,.013],[.025,.016,.025],m.trim,hat)
      this.box([0,.059,-.167],[.068,.07,.012],m.trim,hat)
      for(const x of [-.09,.09])this.bar([x,.073,-.15],[x*.5,.158,-.062],.003,m.trim,hat)
    }
    if(a.head==='helmet'){
      this.mesh(hairGeo,m.orange,[0,-.058,.009],[.221,.239,.197],hat)
      this.mesh(this.g.disc,m.darkCloth,[0,-.040,.01],[.228,.037,.21],hat)
      for(const x of [-.11,.11])this.box([x,.086,.02],[.019,.025,.26],m.trim,hat,[.12,0,0])
      this.box([0,.062,-.205],[.13,.091,.055],m.black,hat)
      this.box([0,.062,-.239],[.093,.050,.02],m.light,hat)
      for(const side of [-1,1])this.bar([side*.195,-.06,.02],[side*.12,-.35,-.063],.012,m.black,hat)
    }
    if(a.eyes!=='none'){
      for(const side of [-1,1]){
        this.ring([side*.081,.027,-.189],[.055,.039,.025],a.eyes==='goggles'?m.sole:m.gold,head,[0,0,0])
        this.ball([side*.081,.027,-.188],[.048,.032,.010],m.glass,head)
        this.bar([side*.125,.035,-.177],[side*.193,.034,.022],.009,m.sole,head)
        this.bar([side*.055,.043,-.20],[side*.087,.049,-.197],.0035,m.lining,head)
      }
      this.bar([-.022,.029,-.193],[.022,.029,-.193],.009,m.metal,head)
      if(a.eyes==='goggles')this.box([0,.046,.172],[.355,.045,.025],m.sole,head)
    }
  }
  buildArm(side,torso){
    const a=this.appearance,m=this.m,arm=this.group(`arm${side}`,[side*.344,.425,0],torso)
    this.ball([side*.016,-.10,0],[.109,.19,.11],m.cloth,arm)
    this.mesh(this.g.cone,m.cloth,[0,-.18,0],[.095,.24,.096],arm)
    const elbow=this.group(`elbow${side}`,[0,-.31,0],arm)
    this.ball([0,0,0],[.082,.083,.083],a.outer==='survey'?m.skin:m.cloth,elbow)
    this.mesh(this.g.cone,a.outer==='survey'?m.skin:m.cloth,[0,-.125,0],[.069,.25,.072],elbow)
    this.ball([0,-.234,0],[.067,.067,.07],a.outer==='survey'?m.skin:m.cloth,elbow)
    this.mesh(this.g.cylinder,m.darkCloth,[0,-.246,0],[.072,.045,.074],elbow)
    if(a.outer==='parka')this.mesh(this.g.cylinder,m.lining,[0,-.138,0],[.075,.025,.078],elbow)
    this.box([side*.085,-.045,0],[.02,.10,.085],m.darkCloth,arm)
    const hand=this.group(`hand${side}`,[0,-.298,0],elbow),gloved=a.hands!=='bare',hm=gloved?m.leather:m.skin
    this.ball([0,-.045,0],[.057,.08,.04],hm,hand)
    if(gloved)this.box([0,-.025,.026],[.085,.066,.014],m.darkCloth,hand)
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.024,l=.044-Math.abs(i-1.5)*.004
      this.mesh(this.g.cylinder,hm,[x,-.107,0],[.010,l,.011],hand)
      this.ball([x,-.123-l*.25,-.009],[.010,.015,.012],a.hands==='work'?m.leather:m.skin,hand)
    }
    this.ball([-side*.057,-.052,-.015],[.020,.037,.021],hm,hand).rotation.z=-side*.4
    if(side===-1){this.box([0,-.222,-.081],[.073,.061,.022],m.black,elbow);this.box([0,-.222,-.096],[.047,.034,.006],m.light,elbow)}
    if(side===1)this.buildTool(hand)
  }
  buildLeg(side,hip){
    const a=this.appearance,m=this.m,leg=this.group(`leg${side}`,[side*.145,-.02,0],hip)
    this.mesh(this.g.cone,m.pants,[0,-.20,0],[.125,.41,.123],leg)
    this.ball([0,-.04,0],[.125,.1,.13],m.pants,leg)
    this.bar([side*.118,-.075,-.03],[side*.108,-.37,-.031],.005,m.trim,leg)
    if(a.legs==='cargo'){
      this.box([side*.116,-.20,.02],[.045,.18,.17],m.darkCloth,leg)
      this.box([side*.145,-.125,.02],[.021,.041,.187],m.pants,leg)
      this.ball([side*.16,-.139,-.014],[.007,.008,.01],m.gold,leg)
    }
    const knee=this.group(`knee${side}`,[0,-.412,0],leg)
    this.ball([0,-.017,0],[.105,.10,.111],m.pants,knee)
    this.mesh(this.g.cone,m.pants,[0,-.179,.008],[.093,.35,.099],knee)
    if(a.legs==='trek'){
      this.box([0,-.032,-.109],[.166,.167,.04],m.darkCloth,knee)
      this.box([0,-.039,-.139],[.121,.113,.023],m.sole,knee)
      for(const x of [-.044,.044])this.bar([x,0,-.15],[x,-.081,-.15],.003,m.trim,knee)
    }
    if(a.legs==='waders')this.box([0,-.155,-.09],[.13,.28,.019],m.darkCloth,knee)
    const foot=this.group(`foot${side}`,[0,-.388,0],knee)
    const bm=a.feet==='rubber'?m.darkCloth:a.feet==='tactical'?m.sole:m.leather
    this.box([0,.01,-.07],[.235,.13,.354],bm,foot)
    this.box([0,-.045,-.073],[.250,.061,.377],m.sole,foot)
    this.box([0,.045,-.166],[.217,.079,.158],bm,foot)
    this.box([0,.068,-.084],[.085,.14,.135],m.darkCloth,foot,[-.35,0,0])
    this.mesh(this.g.cylinder,bm,[0,a.feet==='rubber'?.195:.092,0],[.11,a.feet==='rubber'?.34:.145,.12],foot)
    this.mesh(this.g.cylinder,m.trim,[0,a.feet==='rubber'?.36:.16,0],[.111,.022,.121],foot)
    for(let i=0;i<5;i++)this.box([0,-.072,-.22+i*.074],[.238,.015,.024],m.sole,foot)
    if(a.feet!=='rubber')for(let i=0;i<4;i++){
      const y=.093+i*.015,z=-.146+i*.028
      this.bar([-.059,y,z],[.059,y+.012,z+.022],.004,m.trim,foot)
      this.bar([.059,y,z],[-.059,y+.012,z+.022],.004,m.trim,foot)
      for(const x of [-.069,.069])this.ball([x,y,z],[.008,.005,.008],m.metal,foot)
    }
    this.bar([-.091,.01,-.225],[.091,.01,-.225],.004,m.trim,foot)
  }
  buildPack(torso){
    const a=this.appearance,m=this.m
    if(a.back==='none')return
    const pack=this.group('pack',[0,.25,.19],torso),rescue=a.back==='rescue',small=a.back==='daypack',pm=rescue?m.orange:m.leather
    const h=small?.46:.61,w=small?.44:.53
    this.box([0,0,.105],[w,h,.29],pm,pack)
    this.box([0,-h*.18,.269],[w*.83,h*.43,.08],rescue?m.lining:m.darkCloth,pack)
    this.box([0,h*.43,.13],[w*1.04,.16,.32],pm,pack)
    this.bar([-.08,h*.50,.13],[-.08,h*.62,.13],.014,m.darkCloth,pack)
    this.bar([-.08,h*.62,.13],[.08,h*.62,.13],.014,m.darkCloth,pack)
    this.bar([.08,h*.62,.13],[.08,h*.50,.13],.014,m.darkCloth,pack)
    for(const side of [-1,1]){
      this.box([side*w*.32,0,.284],[.031,h,.020],m.darkCloth,pack)
      this.box([side*w*.32,-h*.16,.302],[.059,.058,.026],m.metal,pack)
      this.box([side*w*.32,-h*.16,.321],[.030,.026,.007],m.sole,pack)
      this.bar([side*.27,.47,.155],[side*.29,.28,-.17],.025,m.darkCloth,torso)
      this.bar([side*.29,.28,-.17],[side*.27,-.04,-.15],.021,m.darkCloth,torso)
      this.box([side*.28,.08,-.175],[.062,.072,.024],m.metal,torso)
      this.box([side*(w*.5+.038),-.09,.1],[.10,.21,.14],pm,pack)
    }
    if(a.back==='expedition'){
      this.mesh(this.g.cylinder,m.darkCloth,[0,h*.65,.13],[.105,.57,.105],pack,[0,0,Math.PI/2])
      for(const x of [-.19,.19])this.mesh(this.g.cylinder,m.trim,[x,h*.65,.13],[.109,.028,.109],pack,[0,0,Math.PI/2])
      this.mesh(this.g.cylinder,m.metal,[w*.5+.06,-.02,.115],[.056,.245,.056],pack)
      this.mesh(this.g.cylinder,m.black,[w*.5+.06,.113,.115],[.038,.035,.038],pack)
      this.ring([-w*.5-.075,.124,.04],[.036,.061,.034],m.gold,pack,[0,0,0])
    }
    if(rescue){
      this.box([0,.085,.273],[.08,.13,.012],m.lining,pack)
      this.box([0,.085,.28],[.15,.05,.014],m.lining,pack)
    }
  }
  buildTool(hand){
    const a=this.appearance,m=this.m
    const tool=this.group('tool',[.025,-.04,-.064],hand)
    if(a.tool==='trowel'){
      this.bar([0,.055,0],[0,-.23,0],.024,m.leather,tool)
      this.ring([0,.10,0],[.047,.064,.04],m.leather,tool,[0,0,0])
      this.ball([0,-.31,0],[.073,.121,.022],m.metal,tool)
      this.bar([0,-.20,-.02],[0,-.38,-.02],.006,m.gold,tool)
    }
    if(a.tool==='scanner'){
      this.box([0,-.035,0],[.135,.22,.055],m.black,tool,[.1,0,0])
      this.box([0,.001,-.038],[.099,.104,.007],m.light,tool,[.1,0,0])
      for(let i=0;i<3;i++)this.ball([-.036+i*.036,-.078,-.036],[.009,.009,.004],m.gold,tool)
      this.bar([.04,.081,.007],[.04,.163,.007],.013,m.black,tool)
    }
    if(a.tool==='lantern'){
      this.ring([0,-.066,0],[.11,.13,.075],m.black,tool,[0,0,0])
      this.mesh(this.g.cylinder,m.black,[0,-.20,0],[.11,.045,.11],tool)
      this.mesh(this.g.cylinder,m.light,[0,-.29,0],[.068,.15,.068],tool)
      this.mesh(this.g.cylinder,m.black,[0,-.386,0],[.11,.045,.11],tool)
      for(let i=0;i<4;i++){const t=i*Math.PI/2;this.bar([Math.sin(t)*.09,-.22,Math.cos(t)*.09],[Math.sin(t)*.09,-.366,Math.cos(t)*.09],.011,m.gold,tool)}
    }
  }
  batch(group){
    for(const child of [...group.children])if(child.isGroup)this.batch(child)
    const batches=new Map()
    for(const child of [...group.children])if(child.isMesh){const key=child.material; if(!batches.has(key))batches.set(key,[]);batches.get(key).push(child)}
    for(const [material,meshes] of batches){
      if(meshes.length<2)continue
      const positions=[],normals=[]
      for(const mesh of meshes){mesh.updateMatrix();let g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix)
        const p=g.attributes.position.array,n=g.attributes.normal.array
        for(let i=0;i<p.length;i++){positions.push(p[i]);normals.push(n[i])}g.dispose();group.remove(mesh)
      }
      const geo=this.keep(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.computeBoundingSphere()
      const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='rigid-batch';group.add(mesh)
    }
  }
  update(dt,time,player={},progress=0){
    const moving=Boolean(player.moving),running=Boolean(player.sprinting),air=player.grounded===false
    const gait=moving?Math.sin(time*(running?12:7.4)):0,mag=moving?(running?.72:.44):0
    const smooth=(o,axis,v)=>{o.rotation[axis]=THREE.MathUtils.damp(o.rotation[axis],v,12,Math.min(dt,.1))}
    const work=progress>0
    this.joints.torso.position.y=1.07+(moving?Math.abs(gait)*.027:Math.sin(time*1.8)*.004)
    smooth(this.joints.torso,'x',work?-.17:running?-.09:0)
    smooth(this.joints.head,'y',moving?0:Math.sin(time*.56)*.045)
    for(const side of [-1,1]){
      const swing=gait*mag*side
      smooth(this.joints[`leg${side}`],'x',air?(side===1?-.42:.24):swing)
      smooth(this.joints[`knee${side}`],'x',air?-.54:-(Math.max(0,-gait*side)*(running?.85:.52)*(moving?1:0)+.05))
      smooth(this.joints[`arm${side}`],'x',work?.83+Math.sin(time*6)*.09:-swing*.68)
      smooth(this.joints[`arm${side}`],'z',side*(work?.06:.12))
      smooth(this.joints[`elbow${side}`],'x',work?1.05:running?.75:.16)
    }
    const blink=time%5.8>5.64?.12:1
    for(const eye of this.eyeGroups)eye.scale.y=blink
    if(this.joints.pack)smooth(this.joints.pack,'z',gait*(moving?.025:0))
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();this.resources.forEach(o=>o.dispose?.());this.resources.clear()}
}
