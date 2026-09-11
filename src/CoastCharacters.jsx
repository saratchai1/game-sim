import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const PEOPLE = [
  { name: 'มะลิ', role: 'นักปลูก', shirt: '#e9b94f', skin: '#c88b61', home: [-8, .48, 5.3], end: [-3.7, .48, 2.7], tool: 'plant' },
  { name: 'นนท์', role: 'ผู้ดูแลชายฝั่ง', shirt: '#ea927f', skin: '#a96949', home: [4, .48, -2.7], end: [-.6, .48, 1.7], tool: 'clean' },
  { name: 'อิง', role: 'นักสำรวจ', shirt: '#66b4bf', skin: '#d8a378', home: [-9.3, .48, -7.5], end: [-4.3, .48, -7.1], tool: 'survey' },
]
function Limb({ limbRef, position, color, leg = false }) {
  return <group ref={limbRef} position={position}><mesh position={[0, leg ? -.2 : -.17, 0]} castShadow><capsuleGeometry args={[leg ? .075 : .065, leg ? .26 : .22, 3, 6]} /><meshStandardMaterial color={color} roughness={.85} /></mesh>{leg && <mesh position={[0,-.4,.04]}><boxGeometry args={[.16,.15,.24]} /><meshStandardMaterial color="#3b4c49" /></mesh>}</group>
}
function FieldCharacter({ person, index, action, target, storm }) {
  const root = useRef(), body = useRef(), head = useRef(), armL = useRef(), armR = useRef(), legL = useRef(), legR = useRef()
  const [hovered, setHovered] = useState(false)
  const clock = useRef(index * 4)
  const waveUntil = useRef(0)
  const assignmentUntil = useRef(0)
  const assigned = action && (action.type === 'plant' || action.type === 'care' ? index === 0 : action.type === 'clean' || action.type === 'patrol' ? index === 1 : index === 2)
  const goal = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { if (assigned) assignmentUntil.current = clock.current + 16 }, [action, assigned])
  useFrame((_, delta) => {
    if (!root.current) return
    const dt = Math.min(delta, .06)
    clock.current += dt
    const t = clock.current
    const active = assigned && t < assignmentUntil.current
    // A walk / pause / work cycle, in world seconds rather than frames.
    const cycle = t % 20
    const toEnd = cycle < 10
    const position = active && target ? target : toEnd ? person.end : person.home
    goal.set(position[0], person.home[1], position[2])
    const dx = goal.x - root.current.position.x, dz = goal.z - root.current.position.z
    const distance = Math.hypot(dx, dz)
    const walking = distance > .18
    if (walking) {
      const step = Math.min(distance, dt * (storm ? .95 : .65))
      root.current.position.x += dx / distance * step
      root.current.position.z += dz / distance * step
      const desired = Math.atan2(dx, dz)
      root.current.rotation.y += Math.atan2(Math.sin(desired - root.current.rotation.y), Math.cos(desired - root.current.rotation.y)) * Math.min(1, dt * 7)
    }
    const wave = hovered || t < waveUntil.current
    const work = !walking && !wave
    const stride = walking ? Math.sin(t * 9) * .55 : 0
    legL.current.rotation.x = stride; legR.current.rotation.x = -stride
    armL.current.rotation.x = -stride
    armR.current.rotation.x = wave ? -2.4 + Math.sin(t * 8) * .25 : work ? -.7 + Math.sin(t * 3.5) * .45 : stride
    armR.current.rotation.z = wave ? -.4 : -.1
    body.current.rotation.x = work && person.tool !== 'survey' ? .15 + Math.sin(t * 3.5) * .12 : 0
    body.current.position.y = walking ? Math.abs(Math.sin(t * 9)) * .035 : Math.sin(t * 2) * .008
    head.current.rotation.y = work ? Math.sin(t * 1.2) * .25 : 0
  })
  return <group name={`crew-${index}`} ref={root} position={person.home} scale={1.15}
    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }} onPointerOut={() => setHovered(false)}
    onClick={(e) => { e.stopPropagation(); waveUntil.current = clock.current + 3 }}>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,.012,0]}><circleGeometry args={[.33,16]} /><meshBasicMaterial color="#223e33" transparent opacity={.18} depthWrite={false} /></mesh>
    <group ref={body}>
      <mesh position={[0,.76,0]} castShadow><capsuleGeometry args={[.19,.34,4,8]} /><meshStandardMaterial color={person.shirt} roughness={.8} /></mesh>
      <mesh position={[0,.77,-.2]} castShadow><boxGeometry args={[.28,.32,.17]} /><meshStandardMaterial color="#698675" roughness={.95} /></mesh>
      <group ref={head} position={[0,1.2,0]}>
        <mesh castShadow scale={[.94,1.06,.95]}><sphereGeometry args={[.23,10,8]} /><meshStandardMaterial color={person.skin} roughness={.8} /></mesh>
        <mesh position={[0,.17,0]}><cylinderGeometry args={[.34,.34,.045,12]} /><meshStandardMaterial color="#e4ca8c" /></mesh>
        <mesh position={[0,.245,0]}><cylinderGeometry args={[.18,.22,.15,10]} /><meshStandardMaterial color="#eddcb2" /></mesh>
        <mesh position={[0,.2,0]}><cylinderGeometry args={[.222,.223,.045,10]} /><meshStandardMaterial color={person.shirt} /></mesh>
        {[-.075,.075].map((x) => <mesh key={x} position={[x,.015,.208]}><sphereGeometry args={[.025,6,4]} /><meshBasicMaterial color="#263d39" /></mesh>)}
        <mesh position={[0,-.065,.219]} rotation={[0,0,Math.PI]}><torusGeometry args={[.044,.008,4,8,Math.PI]} /><meshBasicMaterial color="#753f31" /></mesh>
      </group>
      <Limb limbRef={legL} position={[-.1,.48,0]} color="#4c6868" leg />
      <Limb limbRef={legR} position={[.1,.48,0]} color="#4c6868" leg />
      <Limb limbRef={armL} position={[-.255,.9,0]} color={person.skin} />
      <group ref={armR} position={[.255,.9,0]}>
        <mesh position={[0,-.17,0]}><capsuleGeometry args={[.064,.22,3,6]} /><meshStandardMaterial color={person.skin} /></mesh>
        {person.tool === 'survey' ? <group position={[0,-.3,.09]} rotation={[-.5,0,0]}><mesh><boxGeometry args={[.24,.32,.035]} /><meshStandardMaterial color="#264b51" /></mesh><mesh position={[0,0,.021]}><planeGeometry args={[.17,.23]} /><meshBasicMaterial color="#c7e7cd" /></mesh></group> : <group position={[0,-.32,.07]}><mesh><cylinderGeometry args={[.02,.02,.7,5]} /><meshStandardMaterial color="#a28150" /></mesh><mesh position={[0,-.34,0]}><boxGeometry args={[person.tool === 'clean' ? .25 : .15,.16,.035]} /><meshStandardMaterial color={person.tool === 'clean' ? '#dfc696' : '#718e91'} /></mesh></group>}
      </group>
    </group>
    {hovered && <Html center position={[0,1.9,0]} zIndexRange={[2,1]} style={{ pointerEvents: 'none' }}><div className="character-name"><b>{person.name}</b><span>{person.role} · คลิกทักทาย</span></div></Html>}
  </group>
}
export default function CoastCharacters({ action, target, storm }) {
  return <group>{PEOPLE.map((person,index) => <FieldCharacter key={person.name} person={person} index={index} action={action} target={target} storm={storm} />)}</group>
}
