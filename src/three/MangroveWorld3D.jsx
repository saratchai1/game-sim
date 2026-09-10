import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useCursor } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  PLOT_BLUEPRINT,
  SPECIES,
  clamp,
  stageFor,
} from './gameModel.js'

const SHORE_POINTS = [
  [-7.2, -3.45], [-6.25, -4.15], [-4.1, -4.45], [-1.75, -4.25],
  [0.45, -4.55], [2.85, -4.25], [5.45, -4.38], [7.2, -3.45],
  [7.55, -1.45], [7.25, 0.65], [7.5, 2.65], [6.35, 4.05],
  [4.05, 4.35], [1.85, 4.1], [-0.15, 4.45], [-2.5, 4.15],
  [-4.85, 4.35], [-6.75, 3.25], [-7.45, 1.2], [-7.25, -1.15],
]

function waterHeight(tide) {
  if (tide === 'น้ำขึ้น') return 0.2
  if (tide === 'น้ำกำลังขึ้น') return 0.08
  if (tide === 'น้ำกำลังลง') return -0.04
  return -0.17
}

function makeShoreGeometry(scale = 1, depth = 0.5) {
  const shape = new THREE.Shape()
  SHORE_POINTS.forEach(([x, y], index) => {
    const px = x * scale
    const py = y * scale
    if (index === 0) shape.moveTo(px, py)
    else shape.lineTo(px, py)
  })
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.17,
    bevelThickness: 0.15,
    curveSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}

function ShoreLayer({ scale, depth, y, color, roughness = 1 }) {
  const geometry = useMemo(() => makeShoreGeometry(scale, depth), [scale, depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} position={[0, y, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} flatShading />
    </mesh>
  )
}

function Water({ tide, weather }) {
  const mesh = useRef()
  const frame = useRef(0)
  const geometry = useMemo(() => new THREE.PlaneGeometry(54, 54, 42, 42), [])
  const level = waterHeight(tide)

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const y = position.getY(i)
      const wave = Math.sin(x * 0.36 + time * 0.85) * 0.07
        + Math.cos(y * 0.28 + time * 0.62) * 0.055
        + Math.sin((x + y) * 0.18 + time * 0.42) * 0.025
      position.setZ(i, wave)
    }
    position.needsUpdate = true
    frame.current += 1
    if (frame.current % 8 === 0) geometry.computeVertexNormals()
    if (mesh.current) mesh.current.position.y += (level - mesh.current.position.y) * 0.035
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, level, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color={weather === 'storm' ? '#3d8495' : '#32b8dc'}
        roughness={0.28}
        metalness={0.04}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

function CylinderBetween({ start, end, radius = 0.04, color = '#754225', segments = 7 }) {
  const transform = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    const length = direction.length()
    const midpoint = a.clone().add(b).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    )
    return { length, midpoint, quaternion }
  }, [start, end])

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius * 0.76, radius, transform.length, segments]} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  )
}

function LeafCluster({ position, scale, color, accent = false }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[0.48, 0]} />
      <meshStandardMaterial color={accent ? color : color} roughness={0.9} flatShading />
    </mesh>
  )
}

function GhostSprout({ active }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 0.22 + Math.sin(clock.getElapsedTime() * 2.2) * 0.035
    ref.current.rotation.y += 0.004
  })
  return (
    <group ref={ref} scale={active ? 1.1 : 0.9}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.36, 6]} />
        <meshStandardMaterial color="#6d4b2d" />
      </mesh>
      <mesh position={[-0.12, 0.36, 0]} rotation={[0, 0, -0.65]} scale={[0.22, 0.1, 0.1]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#8fd343" transparent opacity={0.78} />
      </mesh>
      <mesh position={[0.12, 0.4, 0]} rotation={[0, 0, 0.65]} scale={[0.22, 0.1, 0.1]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#58b84e" transparent opacity={0.78} />
      </mesh>
    </group>
  )
}

function DeadTree() {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} rotation={[0.08, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.25, 7]} />
        <meshStandardMaterial color="#786247" roughness={1} flatShading />
      </mesh>
      <CylinderBetween start={[0, 1.08, 0]} end={[-0.45, 1.45, 0.08]} radius={0.055} color="#786247" />
      <CylinderBetween start={[0.02, 0.95, 0]} end={[0.48, 1.25, -0.12]} radius={0.05} color="#786247" />
      <CylinderBetween start={[0, 0.22, 0]} end={[-0.55, 0.03, 0.34]} radius={0.045} color="#65533e" />
      <CylinderBetween start={[0, 0.22, 0]} end={[0.48, 0.03, -0.42]} radius={0.045} color="#65533e" />
    </group>
  )
}

function MangroveTree({ plot }) {
  const ref = useRef()
  const species = SPECIES[plot.species]
  const stage = stageFor(plot)
  const growth = stage === 'seedling'
    ? 0.46 + plot.age * 0.13
    : stage === 'young'
      ? 0.72 + Math.min(plot.age - 2, 4) * 0.08
      : 1.08
  const healthMix = clamp((72 - plot.health) / 72, 0, 0.72)
  const leafColor = useMemo(() => {
    const healthy = new THREE.Color(species.leaf)
    return healthy.lerp(new THREE.Color('#9b874c'), healthMix).getStyle()
  }, [species.leaf, healthMix])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const phase = plot.id * 0.71
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.78 + phase) * 0.018
    ref.current.rotation.x = Math.cos(clock.getElapsedTime() * 0.62 + phase) * 0.012
  })

  if (plot.dead) return <DeadTree />

  const rootReach = plot.species === 'rhizophora' ? 0.68 : 0.48
  const trunkHeight = plot.species === 'sonneratia' ? 1.62 : 1.45
  const canopyY = trunkHeight + 0.36
  const canopy = species.canopy

  return (
    <group ref={ref} scale={[growth, growth, growth]}>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2 + plot.id * 0.11
        const reach = rootReach * (index % 2 === 0 ? 1 : 0.82)
        return (
          <CylinderBetween
            key={index}
            start={[Math.cos(angle) * 0.06, 0.36, Math.sin(angle) * 0.06]}
            end={[Math.cos(angle) * reach, 0.035, Math.sin(angle) * reach]}
            radius={plot.species === 'rhizophora' ? 0.06 : 0.043}
            color={species.trunk}
          />
        )
      })}

      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.105, 0.165, trunkHeight, 8]} />
        <meshStandardMaterial color={species.trunk} roughness={0.94} flatShading />
      </mesh>

      {stage !== 'seedling' && (
        <>
          <CylinderBetween start={[0, trunkHeight * 0.72, 0]} end={[-0.48, canopyY - 0.12, 0.15]} radius={0.07} color={species.trunk} />
          <CylinderBetween start={[0, trunkHeight * 0.75, 0]} end={[0.45, canopyY - 0.04, -0.2]} radius={0.065} color={species.trunk} />
          <CylinderBetween start={[0, trunkHeight * 0.8, 0]} end={[0.08, canopyY + 0.18, 0.42]} radius={0.055} color={species.trunk} />
        </>
      )}

      <LeafCluster position={[0, canopyY + 0.22, 0]} scale={[canopy[0], canopy[1], canopy[2]]} color={leafColor} />
      {stage !== 'seedling' && (
        <>
          <LeafCluster position={[-0.53, canopyY, 0.12]} scale={[0.76, 0.64, 0.72]} color={species.leafDark} />
          <LeafCluster position={[0.5, canopyY + 0.03, -0.16]} scale={[0.78, 0.65, 0.72]} color={leafColor} />
          <LeafCluster position={[0.05, canopyY + 0.02, 0.5]} scale={[0.68, 0.58, 0.7]} color={species.accent} accent />
        </>
      )}
      {stage === 'mature' && (
        <>
          <LeafCluster position={[-0.25, canopyY + 0.52, -0.18]} scale={[0.68, 0.55, 0.65]} color={leafColor} />
          <LeafCluster position={[0.42, canopyY + 0.42, 0.28]} scale={[0.62, 0.52, 0.62]} color={species.leafDark} />
        </>
      )}
    </group>
  )
}

function PlantingSpot({ plot, blueprint, selected, selectedSpecies, onPlant, onClear, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const ring = useRef()
  useCursor(hovered)
  const empty = !plot.species
  const dead = plot.dead
  const fit = empty ? clamp(
    Number(SPECIES[selectedSpecies].tides.includes(blueprint.tide))
      + Number(SPECIES[selectedSpecies].soils.includes(blueprint.soil)),
    0,
    2,
  ) : 0

  useFrame(({ clock }) => {
    if (!ring.current) return
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.4 + plot.id) * 0.06
    ring.current.scale.setScalar(pulse)
    ring.current.rotation.z += selected ? 0.006 : 0.002
  })

  const ringColor = dead ? '#e36542' : fit === 2 ? '#99df3f' : fit === 1 ? '#ffd45a' : '#f29357'

  return (
    <group position={[blueprint.position[0], 0.55, blueprint.position[2]]}>
      <mesh
        position={[0, -0.08, 0]}
        scale={[1.04, 0.16, 0.88]}
        castShadow
        receiveShadow
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(plot.id)
          if (empty) onPlant(plot.id)
          else if (dead) onClear(plot.id)
        }}
      >
        <sphereGeometry args={[0.76, 18, 10]} />
        <meshStandardMaterial
          color={dead ? '#80664b' : empty ? '#7d6547' : '#6f5e43'}
          roughness={1}
          flatShading
        />
      </mesh>

      {(empty || dead || selected || hovered) && (
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <torusGeometry args={[0.79, selected ? 0.055 : 0.035, 8, 36]} />
          <meshBasicMaterial color={selected ? '#ffffff' : ringColor} transparent opacity={selected ? 0.95 : 0.72} />
        </mesh>
      )}

      {empty ? <GhostSprout active={selected || hovered} /> : <MangroveTree plot={plot} />}
    </group>
  )
}

function Hut({ position = [-6.1, 0.55, -3.25], level = 1 }) {
  return (
    <group position={position} rotation={[0, 0.12, 0]}>
      {[-0.58, 0.58].flatMap((x) => [-0.48, 0.48].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 0.6, 6]} />
          <meshStandardMaterial color="#76502e" />
        </mesh>
      )))}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.88, 1.15]} />
        <meshStandardMaterial color="#f2c365" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.15, 0.72, 4]} />
        <meshStandardMaterial color="#cf623a" roughness={0.94} flatShading />
      </mesh>
      <mesh position={[0.72, 0.6, 0.15]} castShadow>
        <boxGeometry args={[0.12, 0.54, 0.12]} />
        <meshStandardMaterial color="#855936" />
      </mesh>
      <mesh position={[0.1, 0.76, 0.585]}>
        <boxGeometry args={[0.38, 0.52, 0.04]} />
        <meshStandardMaterial color="#7c4a2c" />
      </mesh>
      {level > 1 && (
        <mesh position={[-0.47, 0.78, 0.59]}>
          <boxGeometry args={[0.34, 0.3, 0.035]} />
          <meshStandardMaterial color="#7ad9ea" emissive="#4c9db0" emissiveIntensity={0.15} />
        </mesh>
      )}
    </group>
  )
}

function Nursery({ level }) {
  const modules = Math.max(1, level + 1)
  return (
    <group position={[5.85, 0.53, -3.18]} rotation={[0, -0.16, 0]}>
      {Array.from({ length: modules }).map((_, row) => (
        <group key={row} position={[(row - (modules - 1) / 2) * 0.72, 0, 0]}>
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.14, 1.35]} />
            <meshStandardMaterial color="#8b6338" roughness={1} />
          </mesh>
          {[-0.42, 0, 0.42].map((z) => (
            <group key={z} position={[0, 0.18, z]} scale={0.42}>
              <GhostSprout active={false} />
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.9, -0.83]} castShadow>
        <boxGeometry args={[1.75, 0.32, 0.12]} />
        <meshStandardMaterial color="#f4d56c" />
      </mesh>
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, 0.48, -0.83]} castShadow>
          <boxGeometry args={[0.1, 0.82, 0.1]} />
          <meshStandardMaterial color="#6d4a2d" />
        </mesh>
      ))}
    </group>
  )
}

function Drone({ level }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.32 + Math.sin(clock.getElapsedTime() * 2.15) * 0.12
    ref.current.rotation.y += 0.012
  })
  return (
    <group position={[6.15, 0.57, 2.92]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[0.76, 0.86, 0.13, 28]} />
        <meshStandardMaterial color="#e9e6d8" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.071, 0]}>
        <torusGeometry args={[0.46, 0.05, 8, 28]} />
        <meshStandardMaterial color="#42a7d7" />
      </mesh>
      <group ref={ref} scale={0.75 + level * 0.08}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.16, 0.28]} />
          <meshStandardMaterial color="#f8b833" metalness={0.08} roughness={0.45} />
        </mesh>
        {[
          [-0.42, 0, -0.32], [0.42, 0, -0.32], [-0.42, 0, 0.32], [0.42, 0, 0.32],
        ].map(([x, y, z], index) => (
          <group key={index}>
            <CylinderBetween start={[0, 0, 0]} end={[x, y, z]} radius={0.025} color="#3f5361" segments={6} />
            <mesh position={[x, 0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.018, 12]} />
              <meshStandardMaterial color="#395463" transparent opacity={0.72} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function DockAndBoat({ tide }) {
  const boat = useRef()
  const level = waterHeight(tide)
  useFrame(({ clock }) => {
    if (!boat.current) return
    boat.current.position.y = level + 0.23 + Math.sin(clock.getElapsedTime() * 1.4) * 0.045
    boat.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.7) * 0.025
  })
  return (
    <group>
      <group position={[-6.25, 0.44, 3.7]} rotation={[0, 0.08, 0]}>
        {Array.from({ length: 7 }).map((_, index) => (
          <mesh key={index} position={[index * 0.38 - 1.1, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.13, 1.05]} />
            <meshStandardMaterial color={index % 2 ? '#a16c39' : '#b77a41'} roughness={1} />
          </mesh>
        ))}
        {[-0.46, 0.46].flatMap((z) => [-1.05, 1.2].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, -0.32, z]} castShadow>
            <cylinderGeometry args={[0.055, 0.07, 0.78, 7]} />
            <meshStandardMaterial color="#76502f" />
          </mesh>
        )))}
      </group>
      <group ref={boat} position={[-4.3, level + 0.23, 4.65]} rotation={[0, -0.24, 0]}>
        <mesh scale={[1.05, 0.34, 0.48]} castShadow>
          <sphereGeometry args={[0.72, 16, 8]} />
          <meshStandardMaterial color="#e95d3e" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.62, 0.34, 0.55]} />
          <meshStandardMaterial color="#fff1c0" />
        </mesh>
        <mesh position={[0.08, 0.48, 0]} rotation={[0, 0, 0.04]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.95, 6]} />
          <meshStandardMaterial color="#5a4231" />
        </mesh>
      </group>
    </group>
  )
}

function GrassTuft({ position, rotation = 0, scale = 1 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[-0.12, 0, 0.12].map((x, index) => (
        <mesh key={x} position={[x, 0.18 + index * 0.025, 0]} rotation={[0, 0, (index - 1) * 0.22]} castShadow>
          <coneGeometry args={[0.055, 0.42, 5]} />
          <meshStandardMaterial color={index === 1 ? '#65aa45' : '#83bd4b'} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function GroundDecor() {
  const tufts = useMemo(() => [
    [-6.25, -2.05, 0.4, 0.85], [-5.6, -1.5, 1.2, 0.7], [-6.35, 0.15, 0.1, 0.8],
    [-3.35, 3.45, 0.8, 0.7], [-0.25, 3.65, 1.9, 0.85], [2.85, 3.5, 0.4, 0.75],
    [5.85, 1.9, 1.4, 0.8], [6.25, 0.25, 0.2, 0.7], [6.2, -1.35, 1.9, 0.72],
    [-3.1, -3.45, 1.1, 0.76], [0.55, -3.55, 0.3, 0.8], [3.55, -3.4, 1.6, 0.7],
    [-3.55, 0.2, 0.5, 0.6], [3.35, 0.25, 1.2, 0.65], [0.25, 2.15, 0.8, 0.55],
  ], [])
  return (
    <group>
      {tufts.map(([x, z, rotation, scale], index) => (
        <GrassTuft key={index} position={[x, 0.53, z]} rotation={rotation} scale={scale} />
      ))}
      {[
        [-6.65, 2.25, 0.25], [6.55, 3.05, 0.35], [6.8, -2.65, 0.3], [-5.8, -3.05, 0.22],
      ].map(([x, z, size], index) => (
        <mesh key={index} position={[x, 0.48, z]} scale={[size * 1.3, size, size]} rotation={[0.2, index, 0.1]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? '#8b9a72' : '#9aa783'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Cloud({ seed, storm = false }) {
  const ref = useRef()
  const start = useMemo(() => ({
    x: -12 + (seed * 4.7) % 24,
    y: 7.5 + (seed % 3) * 0.75,
    z: -8 + (seed * 3.1) % 15,
    speed: 0.16 + (seed % 4) * 0.035,
    scale: 0.75 + (seed % 3) * 0.18,
  }), [seed])

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.x += delta * start.speed
    if (ref.current.position.x > 13) ref.current.position.x = -13
  })

  return (
    <group ref={ref} position={[start.x, start.y, start.z]} scale={start.scale}>
      {[
        [-0.65, 0, 0, 0.72], [0, 0.15, 0, 0.92], [0.72, 0.02, 0, 0.66], [0.2, -0.08, 0.25, 0.72],
      ].map(([x, y, z, scale], index) => (
        <mesh key={index} position={[x, y, z]} scale={[scale * 1.35, scale, scale]}>
          <dodecahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color={storm ? '#7f9298' : '#ffffff'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Rain() {
  const geometryRef = useRef()
  const positions = useMemo(() => {
    const array = new Float32Array(420 * 3)
    for (let i = 0; i < 420; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 20
      array[i * 3 + 1] = Math.random() * 11 + 1
      array[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    return array
  }, [])

  useFrame((_, delta) => {
    for (let i = 0; i < positions.length / 3; i += 1) {
      positions[i * 3 + 1] -= delta * 7.5
      positions[i * 3] -= delta * 0.9
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 10 + Math.random() * 3
        positions[i * 3] = (Math.random() - 0.5) * 20
      }
    }
    if (geometryRef.current) geometryRef.current.attributes.position.needsUpdate = true
  })

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#dff6ff" size={0.055} transparent opacity={0.72} depthWrite={false} />
    </points>
  )
}

function Sun({ storm }) {
  return (
    <mesh position={[-8.5, 9.5, -10]} scale={storm ? 0.65 : 1}>
      <sphereGeometry args={[1.2, 24, 16]} />
      <meshBasicMaterial color={storm ? '#d9d7b0' : '#ffd65b'} transparent opacity={storm ? 0.35 : 0.95} />
    </mesh>
  )
}

function Scene({
  game,
  selectedPlot,
  selectedSpecies,
  onPlant,
  onClear,
  onSelectPlot,
}) {
  const tide = game.tide
  const storm = game.weather === 'storm'
  const sky = storm ? '#819fa9' : game.weather === 'rain' ? '#9bc4d0' : '#82d8ff'

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 21, 43]} />
      <hemisphereLight args={[storm ? '#c9d7dc' : '#e9fbff', '#72784d', storm ? 0.72 : 1.05]} />
      <ambientLight intensity={storm ? 0.38 : 0.58} />
      <directionalLight
        position={[-8, 13, 9]}
        intensity={storm ? 1.05 : 2.05}
        color={storm ? '#d7e1e0' : '#fff0c4'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-bias={-0.00025}
      />

      <Sun storm={storm} />
      <Water tide={tide} weather={game.weather} />
      <ShoreLayer scale={1.01} depth={0.6} y={-0.18} color="#8b724a" />
      <ShoreLayer scale={0.965} depth={0.2} y={0.31} color="#7eb84a" roughness={0.96} />
      <GroundDecor />

      <Hut level={game.upgrades.community + 1} />
      <Nursery level={game.upgrades.nursery} />
      <Drone level={game.upgrades.drone} />
      <DockAndBoat tide={tide} />

      {game.plots.map((plot) => {
        const blueprint = PLOT_BLUEPRINT.find((item) => item.id === plot.id)
        return (
          <PlantingSpot
            key={plot.id}
            plot={plot}
            blueprint={blueprint}
            selected={selectedPlot === plot.id}
            selectedSpecies={selectedSpecies}
            onPlant={onPlant}
            onClear={onClear}
            onSelect={onSelectPlot}
          />
        )
      })}

      {[1, 2, 3, 4].map((seed) => <Cloud key={seed} seed={seed} storm={storm} />)}
      {(storm || game.weather === 'rain') && <Rain />}

      <OrbitControls
        makeDefault
        target={[0, 0.7, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.65}
        maxPolarAngle={1.15}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={0.65}
        minZoom={38}
        maxZoom={72}
      />
    </>
  )
}

export default function MangroveWorld3D({
  game,
  selectedPlot,
  selectedSpecies,
  onPlant,
  onClear,
  onSelectPlot,
}) {
  return (
    <div className="world3d-shell">
      <Canvas
        className="world3d-canvas"
        orthographic
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [12.5, 12.5, 15.5], zoom: 49, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
        onPointerMissed={() => onSelectPlot(null)}
      >
        <Scene
          game={game}
          selectedPlot={selectedPlot}
          selectedSpecies={selectedSpecies}
          onPlant={onPlant}
          onClear={onClear}
          onSelectPlot={onSelectPlot}
        />
      </Canvas>
      <div className="camera-hint" aria-hidden="true">
        <span>↔</span> ลากเพื่อหมุน · เลื่อนเพื่อซูม
      </div>
    </div>
  )
}
