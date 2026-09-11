# One-time transfer of the locally tested patch. Both source and result are SHA-256 checked.
# Deleted, together with its workflow, by the resulting source commit.
from pathlib import Path
import hashlib
patches = [
('src/App.jsx', '5edebe7225171bfa325939a17a6c3900167654b8ddc45af55909cbba5022343b', '3817522c5fadd1d5d479ecd23c80455652d7f3b6878536e31d64ddd233b55b89', [
(0,2,"""import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MangroveWorld3D from './LazyWorld.jsx'
"""),
(56,57,"""  const habitat = useMemo(() => habitatFor(game), [game])
"""),
(194,195,"""  const handlePlotClick = useCallback((plotId) => {
"""),
(201,202,"""  }, [game.plots, game.event, game.activeSpecies])
  const handleWorldPlotClick = useCallback((plotId) => {
    if (!photoMode) handlePlotClick(plotId)
  }, [photoMode, handlePlotClick])
  const clearWorldSelection = useCallback(() => setSelectedPlot(null), [])
"""),
(476,478,"""        onPlotClick={handleWorldPlotClick}
        onClearSelection={clearWorldSelection}
"""),
]),
('src/LivingWater.jsx', 'c9682fc81e8d185937ff91e84d7c503711b71a38276ef8c1db82299907c21144', 'fb8a94f7bb58a4f575b0b12fc7595c73e778cdb98dcfe64353b16c9ab6c39488', [
(0,1,"""import { memo, useMemo, useRef } from 'react'
"""),
(6,7,"""export default memo(function LivingWater({ tide, storm, score, golden }) {
"""),
(28,29,"""    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, -.58 + tide, 2, Math.min(delta, .1))
"""),
(31,32,"""    <planeGeometry args={[90, 80, 64, 48]} />
"""),
(54,55,"""})
"""),
]),
('src/MangroveWorld3DNatural.jsx', '93e9721475fd306a25fcfec2427125a4a130530a69eb02c3e93f2c2b0f3f9602', '87bc719c121bccd42f43ad241b825978f68a2526766a5de01cba8d74fbe1b05b', [
(8,9,"""import { memo, useEffect, useMemo, useRef, useState } from 'react'
"""),
(10,11,"""import { SceneryBatch, GrassPatch } from './SceneryBatch.jsx'
import { WorldResources, useWorldResources } from './WorldResources.jsx'
import { WorldPerformance, useDeviceQuality } from './WorldPerformance.jsx'
"""),
(126,126,"""  const resources = useWorldResources()
  const [sx, sy, sz] = start, [ex, ey, ez] = end
"""),
(127,129,"""    const a = new THREE.Vector3(sx, sy, sz), b = new THREE.Vector3(ex, ey, ez)
"""),
(131,136,"""    const midpoint = a.clone().add(b).multiplyScalar(.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
"""),
(137,145,"""  }, [sx, sy, sz, ex, ey, ez])
  return <mesh geometry={resources.geometry('cylinder', [1, 1.12, 1, 7])}
    material={resources.material({ color, roughness: .92, flatShading: true })}
    position={transform.midpoint} quaternion={transform.quaternion}
    scale={[radius, transform.length, radius]} castShadow={radius >= .06} dispose={null} />
"""),
(147,154,"""function TreeCanopy({ clusters, unhealthy }) {
  const items = useMemo(() => clusters.map(([position, scale, color]) => ({
    position, scale, color: unhealthy ? '#99854b' : color,
  })), [clusters, unhealthy])
  return <SceneryBatch name="tree-canopy" shape="leaf" args={[.48, 1]} items={items}
    roughness={.76} flatShading castShadow receiveShadow={false} />
"""),
(156,156,"""function branchInstance(start, end, radius, color) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end)
  const direction = b.clone().sub(a), length = direction.length()
  return { color, matrix: new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    new THREE.Vector3(radius, length, radius)) }
}

function TreeRoots({ species, seed, color }) {
  const items = useMemo(() => Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI * 2 * index / 8 + (species === 'rhizophora' ? pseudo(seed + index) * .18 : 0)
    if (species === 'rhizophora') return branchInstance(
      [Math.cos(angle) * .72, .02, Math.sin(angle) * .72],
      [Math.cos(angle) * .08, .62 + (index % 2) * .12, Math.sin(angle) * .08], .045, color)
    return { position: [Math.cos(angle) * .58, .07, Math.sin(angle) * .48],
      scale: [1, .15 + (index % 3) * .025, 1], color: '#9b795b' }
  }), [species, seed, color])
  return <SceneryBatch name="tree-roots" items={items}
    shape={species === 'rhizophora' ? 'cylinder' : 'cone'}
    args={species === 'rhizophora' ? [1, 1.12, 1, 7] : [.032, 1, 5]}
    roughness={species === 'rhizophora' ? .92 : 1} flatShading receiveShadow={false} />
}
"""),
(222,222,"""  const targetScale = stageScale * (0.91 + pseudo(plotId * 4.7) * .2)
"""),
(225,226,"""    growthScale.current = THREE.MathUtils.damp(growthScale.current, targetScale, 5.8, delta)
"""),
(271,301,"""      {(plot.species === 'rhizophora' || plot.species === 'avicennia') &&
        <TreeRoots species={plot.species} seed={seed} color={look.trunk} />}
"""),
(303,306,"""        <TreeCanopy clusters={clusters} unhealthy={plot.health < 45} />
"""),
(348,349,"""      <mesh position={[0, 0.28, 0]}>
"""),
(381,382,"""    if (!group.current || elapsed.current >= 1.45) return
"""),
(426,449,''),
(468,468,"""  const grass = useMemo(() => Array.from({ length: plot.tide === 'สูง' ? 5 : plot.tide === 'กลาง' ? 3 : 2 }, (_, index) => {
    const angle = Math.PI * 2 * index / 5 + plot.id
    return { position: [Math.cos(angle) * radiusX * .82, .03, Math.sin(angle) * radiusZ * .82],
      scale: .62 + pseudo(plot.id * 11 + index) * .18,
      color: plot.tide === 'สูง' ? '#69b64a' : '#7ab759' }
  }), [plot.id, plot.tide, radiusX, radiusZ])
"""),
(518,530,"""      <GrassPatch items={grass} name={`plot-grass-${plot.id}`} />
"""),
(532,533,"""        <mesh position={[0, 0.28, 0]}>
"""),
(613,629,"""  const items = useMemo(() => segments.map((segment) => ({
    position: [segment.x, .55, segment.z], rotation: [0, segment.rotation, segment.tilt],
    scale: [width, .12, segment.length], color: '#ae7240',
  })), [segments, width])
  return <SceneryBatch name="boardwalk-planks" items={items} castShadow />
"""),
(631,632,"""const CoastalTerrain = memo(function CoastalTerrain() {
"""),
(659,660,"""})
"""),
(662,672,"""const MudflatDetails = memo(function MudflatDetails() {
  const batches = useMemo(() => {
    const circles = [], shells = [], sticks = [], sprouts = [], grass = []
    for (let index = 0; index < 46; index += 1) {
      const x = -11.4 + pseudo(index * 5.33 + 2) * 22.8
      const z = -8.6 + pseudo(index * 8.19 + 9) * 14.1
      const scale = .45 + pseudo(index * 2.17 + 4) * .8
      const rotation = pseudo(index * 7.7 + 11) * Math.PI * 2
      if (index % 4 === 0) circles.push({ position: [x, .425, z], rotation: [-Math.PI / 2, 0, rotation],
        scale: [scale * 1.45, scale, 1], color: '#523d30' })
      else if (index % 4 === 1) shells.push({ position: [x, .455, z], rotation: [0, rotation, 0],
        scale: [scale, scale * .32, scale * .62], color: index % 3 ? '#d9c392' : '#efe0b4' })
      else if (index % 4 === 2) {
        sticks.push({ position: [x, .445 + .03 * scale, z], rotation: [0, rotation, Math.PI / 2], scale, color: '#765139' })
        const parent = new THREE.Object3D(), child = new THREE.Object3D()
        parent.position.set(x, .445, z); parent.rotation.y = rotation; parent.scale.setScalar(scale)
        child.position.set(.13, .05, .03); child.rotation.x = .3; parent.add(child); parent.updateMatrixWorld(true)
        sprouts.push({ matrix: child.matrixWorld.clone(), color: '#8abc55' })
      } else grass.push({ position: [x, .43, z], scale: scale * .42, color: index % 2 ? '#6cae4d' : '#80bd58' })
    }
    return { circles, shells, sticks, sprouts, grass }
  }, [])
  return <group name="mudflat-details">
    <SceneryBatch name="mudflat-impressions" items={batches.circles} shape="circle" args={[.24, 12]} basic opacity={.1} receiveShadow={false} />
    <SceneryBatch name="shore-shells" items={batches.shells} shape="sphere" args={[.11, 7, 5]} roughness={.95} />
    <SceneryBatch name="shore-sticks" items={batches.sticks} shape="cylinder" args={[.022, .03, .48, 5]} />
    <SceneryBatch name="shore-sprouts" items={batches.sprouts} shape="cone" args={[.045, .16, 5]} />
    <GrassPatch items={batches.grass} name="mudflat-grass" />
  </group>
})
"""),
(673,730,''),
(731,740,"""const ReedBeds = memo(function ReedBeds() {
  const reeds = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    position: [index % 2 === 0 ? -10.5 - pseudo(index * 3.1) * 6.5 : 10.5 + pseudo(index * 3.1) * 6.5,
      1.21, 6.9 + pseudo(index * 5.7) * 4.7],
    scale: .62 + pseudo(index * 8.3) * .48,
    color: index % 3 === 0 ? '#5ca843' : '#79bf54',
  })), [])
  return <GrassPatch items={reeds} name="shore-reeds" />
})
"""),
(741,749,''),
(751,751,"""  const supports = useMemo(() => [-.82, .82].flatMap((x) => [-.62, .62].map((z) => ({ position: [x, .38, z], color: '#76482a' }))), [])
"""),
(753,759,"""      <SceneryBatch name="hut-supports" items={supports} shape="cylinder" args={[.055, .075, .76, 7]} castShadow />
"""),
(782,784,"""const Nursery = memo(function Nursery({ level }) {
  const trays = useMemo(() => Array.from({ length: 4 + level * 2 }, (_, index) => ({
    position: [-.9 + (index % 4) * .6, .17, -.48 + Math.floor(index / 4) * .55], color: '#9c6536',
  })), [level])
  const seedlings = useMemo(() => trays.map((tray, index) => ({
    position: [tray.position[0], .34, tray.position[2]], color: index % 3 === 0 ? '#45a74b' : '#75bf50',
  })), [trays])
"""),
(797,809,"""        <SceneryBatch name="nursery-trays" items={trays} args={[.42, .12, .34]} castShadow />
        <SceneryBatch name="nursery-seedlings" items={seedlings} shape="cone" args={[.08, .28, 7]} roughness={1} flatShading />
"""),
(812,813,"""})

"""),
(832,833,"""    <group name="coast-drone" ref={drone} position={[5, 5.2, -2]} scale={0.65 + level * 0.06}>
"""),
(855,856,"""const DroneStation = memo(function DroneStation({ level }) {
"""),
(870,871,"""})
"""),
(872,873,"""
const CommunityVillage = memo(function CommunityVillage({ level }) {
"""),
(883,884,"""})

"""),
(912,930,"""const Dock = memo(function Dock() {
  const planks = useMemo(() => Array.from({ length: 8 }, (_, index) => ({
    position: [index * .56, 0, 0], color: '#9b6639',
  })), [])
  const posts = useMemo(() => [0, 3.95].map((x) => ({ position: [x, -.42, -.42], color: '#6e4a30' })), [])
  return <group position={[7.7, .14, 7.1]} rotation={[0, -.62, 0]}>
    <SceneryBatch name="dock-planks" items={planks} args={[.5, .14, 1.1]} castShadow />
    <SceneryBatch name="dock-posts" items={posts} shape="cylinder" args={[.075, .095, 1.12, 7]} castShadow />
  </group>
})

"""),
(965,966,"""const DecorativeMangroves = memo(function DecorativeMangroves() {
"""),
(981,982,"""})

"""),
(1069,1070,"""    <group name={`coast-bird-${seed}`} ref={group} scale={0.7}>
"""),
(1114,1139,"""  const { posts, rails } = useMemo(() => {
    const posts = [], rails = []
    for (let index = 0; index < count; index += 1) {
      const x = -11.5 + index * 1.6, z = -9.45 + Math.sin(index * .8) * .48
      posts.push({ position: [x, .1, z], rotation: [0, 0, (index % 2 ? 1 : -1) * .07], color: '#93603a' })
      if (index > 0) rails.push(branchInstance([-11.5 + (index - 1) * 1.6, .45, -9.45 + Math.sin((index - 1) * .8) * .48], [x, .45, z], .026, '#93603a'))
    }
    return { posts, rails }
  }, [count])
  return <group>
    {posts.length > 0 && <SceneryBatch name="barrier-posts" items={posts} shape="cylinder" args={[.075, .11, 1.25, 7]} castShadow />}
    {rails.length > 0 && <SceneryBatch name="barrier-rails" items={rails} shape="cylinder" args={[1, 1.12, 1, 7]} roughness={.92} flatShading />}
  </group>
"""),
(1141,1142,"""const Clouds = memo(function Clouds() {
  const resources = useWorldResources()
  const geometry = resources.geometry('sphere', [.8, 14, 10])
  const material = resources.material({ color: '#ffffff', roughness: .96, transparent: true, opacity: .92 })
"""),
(1154,1158,"""              <mesh key={cloudIndex} position={[cx, cy, cz]} scale={sphereScale} geometry={geometry} material={material} dispose={null} />
"""),
(1164,1165,"""})

"""),
(1223,1224,"""function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades, day, weather, fireflies, cameraReset, habitat, clean, protection, action, quality, onReady }) {
"""),
(1225,1226,"""  const crewTarget = useMemo(() => action?.plotId
    ? plotPosition(action.plotId).map((v, i) => i === 0 ? v + .8 : v)
    : action?.type === 'clean' ? [0, .48, -8.3]
    : action?.type === 'patrol' ? [1, .48, -9.4] : null, [action])
  const forecast = useMemo(() => forecastFor(day), [day])
"""),
(1231,1232,"""      <WorldPerformance plotPositions={PLOT_POSITIONS} quality={quality} onReady={onReady} />
"""),
(1233,1235,"""      <fog attach="fog" args={[skyColor, 38, 72]} />
      <ambientLight intensity={0.62} />
"""),
(1240,1243,"""        intensity={storm ? 1.15 : golden ? 2.4 : 2.2}
        shadow-mapSize-width={quality.shadowSize}
        shadow-mapSize-height={quality.shadowSize}
"""),
(1248,1248,"""        shadow-normalBias={0.025}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
"""),
(1259,1260,"""      <CoastCharacters action={action} target={crewTarget} storm={storm} />
"""),
(1292,1319,''),
(1322,1322,"""  const debris = useMemo(() => {
    const bottles = [], caps = []
    for (let i = 0; i < Math.max(3, 9 - stage * 2); i += 1) {
      const parent = new THREE.Object3D(), cap = new THREE.Object3D()
      parent.position.set(-10.5 + i * 2.3, .52, -8.2 + Math.sin(i * 3) * .7)
      parent.rotation.set(.1, i, 1.1); cap.position.y = .15; parent.add(cap); parent.updateMatrixWorld(true)
      bottles.push({ matrix: parent.matrixWorld.clone(), color: i % 2 ? '#ced0c1' : '#72adbe' })
      caps.push({ matrix: cap.matrixWorld.clone(), color: '#e98863' })
    }
    return { bottles, caps }
  }, [stage])
  const grass = useMemo(() => Array.from({ length: stage * 8 }, (_, i) => ({
    position: [-10.8 + pseudo(i * 5.2 + 2) * 20, .44, -8 + pseudo(i * 7.1 + 12) * 13],
    scale: .35 + pseudo(i * 9.3) * .5, color: i % 2 ? '#7aaf67' : '#428c65',
  })), [stage])
"""),
(1323,1325,"""    if (!litter.current || Math.abs(litter.current.scale.x - target) < .0001) return
    const size = THREE.MathUtils.damp(litter.current.scale.x, target, 5, Math.min(dt, .1))
"""),
(1329,1331,"""    <group ref={litter}>
      <SceneryBatch name="restoration-debris" items={debris.bottles} shape="cylinder" args={[.06, .06, .3, 6]} roughness={1} />
      <SceneryBatch name="debris-caps" items={debris.caps} args={[.07, .08, .07]} roughness={1} />
    </group>
    {grass.length > 0 && <GrassPatch items={grass} name="restoration-grass" />}
"""),
(1359,1360,"""function WebGLFallback({ onReady }) {
  useEffect(() => { onReady?.(true) }, [onReady])
"""),
(1368,1369,"""const MangroveWorld3DNatural = memo(function MangroveWorld3DNatural(props) {
  const quality = useDeviceQuality()
"""),
(1373,1375,"""        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, quality.maxDpr]}
"""),
(1377,1378,"""        fallback={<WebGLFallback onReady={props.onReady} />}
"""),
(1380,1381,"""        <WorldResources><WorldScene {...props} quality={quality} /></WorldResources>
"""),
(1384,1385,"""})
export default MangroveWorld3DNatural
"""),
]),
('src/VillageLife.jsx', 'a8879de58cd78a8117061776be4dfcd0ef25ec3d27e9d3143771e2a7f9e8930c', '7e648cec6710002de86b9cc5253d93f77c994324e3a5ba80f63131bab3f9de05', [
(1,2,"""import { memo, useEffect, useMemo, useRef } from 'react'
"""),
(5,5,"""import { useMotionBudget } from './useMotionBudget.js'

const PROP_ACTIVITY = { water:'water', nursery:'water', carry:'carry', market:'carry', repair:'repair', sweep:'sweep', nets:'nets' }
const propActivity = (activity) => PROP_ACTIVITY[activity] || ''
"""),
(21,22,"""const Villager = memo(function Villager({ resident, index, action, storm }) {
"""),
(24,26,"""  const bubbleNode=useRef(), propNodes=useRef({}), currentActivity=useRef(''), lastProp=useRef('')
  const nextPlanAt=useRef(index*.047), nextBubbleAt=useRef(index*.039)
  const planRef=useRef(villagePlan(resident.id,clock.current,storm))
  const motionDue=useMotionBudget(root,index+3)
  const availableProps=useMemo(()=>[...new Set(resident.route.map(stop=>propActivity(stop.activity)).filter(Boolean))],[resident])
"""),
(31,32,"""    if(bubbleNode.current) {
      bubbleNode.current.textContent=next?`${resident.name} · ${next}`:''
      bubbleNode.current.style.display=next?'block':'none'
    }
"""),
(41,41,"""  useEffect(()=>{planRef.current=villagePlan(resident.id,clock.current,storm);nextPlanAt.current=0},[resident.id,storm])

"""),
(45,46,"""    if(t>=nextPlanAt.current){
      planRef.current=villagePlan(resident.id,t,storm)
      nextPlanAt.current=t+.25
    }
    const plan=planRef.current
"""),
(58,64,"""    if(nextActivity!==currentActivity.current){
      currentActivity.current=nextActivity
      root.current.userData.villageActivity=nextActivity
      const prop=propActivity(nextActivity)
      if(prop!==lastProp.current){
        lastProp.current=prop
        for(const [key,node] of Object.entries(propNodes.current)) if(node) node.visible=key===prop
      }
      nextBubbleAt.current=0
    }
    if(t>=nextBubbleAt.current){
      nextBubbleAt.current=t+.25
      const routineSpeaker=Math.floor(state.clock.elapsedTime/3)%villageResidents.length===index
      if(storm&&!walking) updateBubble(routineSpeaker?(plan.label||'พายุมา เก็บของก่อน!'):'')
      else if(activeReaction) updateBubble(reaction?.speak?reaction.text:'')
      else if(!walking&&plan.label&&routineSpeaker) updateBubble(plan.label)
      else updateBubble('')
    }
    if(!motionDue(state.clock.elapsedTime,dt)) return
"""),
(98,99,"""          {side>0&&availableProps.map((activity)=><group key={activity} visible={false} ref={node=>{propNodes.current[activity]=node}}><VillagerProp activity={activity}/></group>)} 
"""),
(110,111,"""    <Html center position={[0,2.02,0]} zIndexRange={[3,1]} style={{pointerEvents:'none'}}><div
      ref={node=>{bubbleNode.current=node;if(node){node.textContent=currentBubble.current?`${resident.name} · ${currentBubble.current}`:'';node.style.display=currentBubble.current?'block':'none'}}}
      style={{...bubbleStyle,display:'none'}} /></Html>
"""),
(112,113,"""})
"""),
]),
('src/WorkerAnimationPose.js', 'e4ff35d99d4c0ba1cb593b9a9c3526c591a70571ffe3c2d8d64e75fbfe5582eb', 'eed9b4dfd13baeb01ef79128a78f69d66757059e16de6a81fa5937852f5a0574', [
(0,1,"""export const POSE_KEYS = ['body','head','bob','leftArm','rightArm','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee','wrist']
export function workerPose(state, time, output = {}) {
"""),
(2,9,"""  const p = output
  p.body=0; p.head=0; p.bob=Math.sin(time*1.8)*.008
  p.leftArm=.08; p.rightArm=-.08; p.leftElbow=-.12; p.rightElbow=-.12
  p.leftHip=0; p.rightHip=0; p.leftKnee=.06; p.rightKnee=.06; p.wrist=0
  if(state==='walk'){p.bob=Math.abs(stride)*.045;p.leftArm=-stride*.5;p.rightArm=stride*.5;p.leftHip=stride*.48;p.rightHip=-stride*.48;p.leftKnee=Math.max(0,-stride)*.65;p.rightKnee=Math.max(0,stride)*.65}
  if(state==='plant'){p.body=.42+s*.08;p.head=.2;p.leftArm=-.55;p.leftElbow=-.65;p.rightArm=-.8+s*.35;p.rightElbow=-.6-s*.25;p.leftHip=-.48;p.rightHip=-.24;p.leftKnee=.75;p.rightKnee=.45;p.bob=-.15+s*.025}
  if(state==='cleanup'){p.body=.17+Math.max(0,s)*.18;p.head=.2;p.leftArm=.05;p.leftElbow=-.22;p.rightArm=-.6+s*.25;p.rightElbow=-.45-s*.15;p.leftKnee=.16;p.rightKnee=.12}
  if(state==='inspect'){p.head=.12;p.leftArm=-.48;p.leftElbow=-1.15;p.rightArm=-.65;p.rightElbow=-1.4;p.bob=Math.sin(time*1.8)*.008}
  if(state==='maintain'){p.body=.16;p.head=.2;p.leftArm=.1;p.leftElbow=-.25;p.rightArm=-.65;p.rightElbow=-.45;p.wrist=-.65+s*.12}
  if(state==='mrv'){p.head=.24;p.leftArm=-.65;p.leftElbow=-1.1;p.rightArm=-.7;p.rightElbow=-1.0;p.wrist=Math.sin(time*2)*.07}
"""),
(13,14,"""  for(const key of POSE_KEYS) current[key]+=(target[key]-current[key])*alpha
"""),
]),
('src/WorkerCharacter.jsx', '8418621b7bc6510ef1ae40a11711364b459c288cfe46d24971e4cea95e4aa746', 'ada673bf2b310e79182c4c904f27d4db1367de2ffd7f64c16bbc181a87c3ca41', [
(7,7,"""import { useMotionBudget } from './useMotionBudget.js'
const JOINT_KEYS = ['leftArm','rightArm','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee']
"""),
(13,13,"""  const poseTarget = useRef({}), lastProp = useRef(null), labelVisible = useRef(false)
  const motionDue = useMotionBudget(root, index)
"""),
(21,22,"""  useFrame((frame,delta)=>{
"""),
(41,42,"""    if(label.current && labelVisible.current !== Boolean(job)) { labelVisible.current=Boolean(job); label.current.style.display=job?'block':'none' }
"""),
(44,45,"""    if(lastProp.current !== (job?.state || null)) {
      lastProp.current = job?.state || null
      for(const [key,node] of Object.entries(props.current)) if(node) node.visible=key.startsWith(job?.state+'-')
    }
    const poseDelta = motionDue(frame.clock.elapsedTime, dt)
    if (!poseDelta) return
    const p=smoothPose(pose.current,workerPose(state,t,poseTarget.current),poseDelta)
"""),
(48,49,"""    for(const key of JOINT_KEYS)joints.current[key].rotation.x=p[key]
"""),
(50,51,''),
]),
('src/WorkerShape.jsx', '44d94d48d5104a13234ec3995754b24f5c21bb2e0adb33174e0207c8e47b4b52', '4c296c1e5370bb186793bd2a757243f96604786b21fbb7024700d112e49508ad', [
(0,2,"""import { memo, useLayoutEffect, useRef } from 'react'
import { useWorldResources } from './WorldResources.jsx'
"""),
(3,8,"""
const shapes = {
  box: ['box', [1, 1, 1]], sphere: ['sphere', [.5, 14, 10]],
  tube: ['cylinder', [.42, .5, 1, 10]], cone: ['cone', [.5, 1, 10]],
  ring: ['torus', [.5, .06, 8, 16]],
"""),
(9,17,"""export default memo(function WorkerShape({ shape = 'box', color, position, scale, rotation, name, children, castShadow }) {
  const resources = useWorldResources(), mesh = useRef()
  const [kind, args] = shapes[shape]
  const size = Array.isArray(scale) ? Math.max(...scale) : scale ?? 1
  useLayoutEffect(() => { mesh.current?.updateMatrix() }, [position, scale, rotation])
  return <mesh ref={mesh} name={name} geometry={resources.geometry(kind, args)}
    material={resources.material({ color, roughness: .72, flatShading: false })}
    dispose={null} raycast={workerRaycast} position={position} scale={scale} rotation={rotation}
    matrixAutoUpdate={false} castShadow={castShadow ?? size >= .18}>{children}</mesh>
})
"""),
]),
]
results = []
for name, before, after, edits in patches:
    assert name.startswith('src/') and '..' not in Path(name).parts
    original = Path(name).read_bytes()
    assert hashlib.sha256(original).hexdigest() == before, f'Unexpected base: {name}'
    lines = original.decode('utf-8').splitlines(keepends=True)
    for start, end, text in reversed(edits):
        lines[start:end] = text.splitlines(keepends=True)
    result = ''.join(lines).encode('utf-8')
    actual = hashlib.sha256(result).hexdigest()
    assert actual == after, f'Result mismatch: {name}: {actual} != {after}'
    results.append((name, result))
for name, result in results:
    Path(name).write_bytes(result)
    print('Verified exact tested source:', name)
