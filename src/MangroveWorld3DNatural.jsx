import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  Html,
  OrbitControls,
  RoundedBox,
  Sparkles,
} from '@react-three/drei'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SceneryBatch, GrassPatch } from './SceneryBatch.jsx'
import { WorldResources, useWorldResources } from './WorldResources.jsx'
import { WorldPerformance, useDeviceQuality } from './WorldPerformance.jsx'
import LivingWater from './LivingWater.jsx'
import CoastCharacters from './CoastCharacters.jsx'
import { forecastFor } from './restoration.js'
import { suitability } from './game-data.js'

const SPECIES_LOOK = {
  rhizophora: {
    trunk: '#86512f',
    leaf: '#2e9d49',
    leafLight: '#69c950',
    leafDark: '#187638',
    canopy: 'round',
  },
  avicennia: {
    trunk: '#8d694a',
    leaf: '#65ab5d',
    leafLight: '#a3d76d',
    leafDark: '#3b8447',
    canopy: 'tall',
  },
  sonneratia: {
    trunk: '#795039',
    leaf: '#3dad66',
    leafLight: '#82d77b',
    leafDark: '#1f7f4c',
    canopy: 'wide',
  },
}

const PLOT_POSITIONS = [
  [-7.2, -5.5], [-3.35, -6.25], [0.65, -6.05], [5.0, -5.3],
  [-8.25, -2.2], [-4.35, -2.5], [-0.15, -2.9], [4.25, -1.85],
  [-6.95, 1.35], [-2.85, 1.0], [1.45, 1.35], [5.95, 2.05],
  [-5.8, 4.85], [-1.45, 4.5], [2.9, 4.75], [6.85, 5.35],
]

const MUDFLAT_POINTS = [
  [-13.8, -9.7], [-9.5, -11.2], [-4.2, -10.8], [1.2, -10.35],
  [7.2, -9.4], [11.1, -7.1], [12.6, -2.5], [11.8, 2.8],
  [9.6, 6.4], [5.0, 7.7], [0.1, 7.35], [-5.2, 8.1],
  [-10.3, 6.7], [-12.9, 2.5], [-14.2, -3.2],
]

const MAINLAND_POINTS = [
  [-20, 6.6], [-15.4, 6.0], [-11.0, 7.35], [-7.3, 8.65],
  [-2.7, 7.55], [2.0, 8.4], [7.0, 7.35], [11.6, 8.4],
  [16.0, 7.2], [20, 6.7], [20, 18], [-20, 18],
]

const SHORE_POINTS = [
  [-19.2, 5.95], [-15.0, 5.45], [-10.8, 6.55], [-7.2, 7.75],
  [-2.7, 6.75], [2.0, 7.55], [7.0, 6.55], [11.6, 7.55],
  [15.8, 6.5], [19.2, 5.95], [19.2, 7.5], [15.8, 7.95],
  [11.6, 8.95], [7.0, 8.05], [2.0, 9.05], [-2.7, 8.2],
  [-7.3, 9.45], [-11.0, 8.2], [-15.3, 7.1], [-19.2, 7.55],
]

function pseudo(seed) {
  const value = Math.sin(seed * 999.91 + 17.21) * 43758.5453
  return value - Math.floor(value)
}

function plotPosition(id) {
  const [x, z] = PLOT_POSITIONS[id - 1]
  return [x, 0.43, z]
}

function makeShape(points) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}

function makeIrregularShape(radiusX, radiusZ, seed, segments = 15) {
  const points = []
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    const noise = 0.9 + pseudo(seed + index * 3.71) * 0.2
    points.push([
      Math.cos(angle) * radiusX * noise,
      Math.sin(angle) * radiusZ * noise,
    ])
  }
  return makeShape(points)
}

function ExtrudedGround({ points, color, topY = 0, depth = 0.5, roughness = 0.94 }) {
  const geometry = useMemo(() => {
    const shape = makeShape(points)
    const result = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.16,
      bevelThickness: 0.09,
      steps: 1,
    })
    result.rotateX(Math.PI / 2)
    return result
  }, [depth, points])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} position={[0, topY, 0]} receiveShadow castShadow>
      <meshStandardMaterial color={color} roughness={roughness} flatShading />
    </mesh>
  )
}

function CylinderBetween({ start, end, radius = 0.06, color = '#815130' }) {
  const resources = useWorldResources()
  const [sx, sy, sz] = start, [ex, ey, ez] = end
  const transform = useMemo(() => {
    const a = new THREE.Vector3(sx, sy, sz), b = new THREE.Vector3(ex, ey, ez)
    const direction = b.clone().sub(a)
    const length = direction.length()
    const midpoint = a.clone().add(b).multiplyScalar(.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return { length, midpoint, quaternion }
  }, [sx, sy, sz, ex, ey, ez])
  return <mesh geometry={resources.geometry('cylinder', [1, 1.12, 1, 7])}
    material={resources.material({ color, roughness: .92, flatShading: true })}
    position={transform.midpoint} quaternion={transform.quaternion}
    scale={[radius, transform.length, radius]} castShadow={radius >= .06} dispose={null} />
}

function TreeCanopy({ clusters, unhealthy }) {
  const items = useMemo(() => clusters.map(([position, scale, color]) => ({
    position, scale, color: unhealthy ? '#99854b' : color,
  })), [clusters, unhealthy])
  return <SceneryBatch name="tree-canopy" shape="leaf" args={[.48, 1]} items={items}
    roughness={.76} flatShading castShadow receiveShadow={false} />
}

function branchInstance(start, end, radius, color) {
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

function BlueCarbonOrb({ seed = 0 }) {
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    const time = state.clock.elapsedTime
    group.current.position.y = 2.68 + Math.sin(time * 1.6 + seed) * 0.1
    group.current.rotation.y = time * 0.75 + seed
    const pulse = 0.9 + Math.sin(time * 2.4 + seed) * 0.08
    group.current.scale.setScalar(pulse)
  })

  return (
    <group ref={group} position={[0, 2.68, 0]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial
          color="#62dff0"
          emissive="#147993"
          emissiveIntensity={0.9}
          roughness={0.24}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.016, 6, 20]} />
        <meshBasicMaterial color="#c5fbff" transparent opacity={0.68} depthWrite={false} />
      </mesh>
    </group>
  )
}

function DeadTree() {
  return (
    <group position={[0, 0.12, 0]}>
      <mesh castShadow position={[0, 0.67, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.09, 0.16, 1.35, 6]} />
        <meshStandardMaterial color="#77513b" roughness={1} flatShading />
      </mesh>
      <CylinderBetween start={[0, 0.95, 0]} end={[0.42, 1.35, 0.08]} radius={0.045} color="#77513b" />
      <CylinderBetween start={[0, 0.88, 0]} end={[-0.36, 1.24, -0.06]} radius={0.042} color="#77513b" />
      <CylinderBetween start={[0.02, 0.69, 0]} end={[0.2, 1.02, -0.3]} radius={0.036} color="#77513b" />
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 5
        return (
          <CylinderBetween
            key={index}
            start={[Math.cos(angle) * 0.48, 0.02, Math.sin(angle) * 0.48]}
            end={[Math.cos(angle) * 0.08, 0.52, Math.sin(angle) * 0.08]}
            radius={0.035}
            color="#77513b"
          />
        )
      })}
    </group>
  )
}

function MangroveTree({ plot, plotId, storm }) {
  const group = useRef()
  const look = SPECIES_LOOK[plot.species] || SPECIES_LOOK.rhizophora
  const stageScale = plot.age < 1 ? 0.35 : plot.age < 3 ? 0.58 : plot.age < 6 ? 0.82 : 1
  const growthScale = useRef(plot.age === 0 ? 0.12 : stageScale)
  const healthScale = 0.8 + (Math.max(plot.health, 10) / 100) * 0.2
  const seed = plotId * 17
  const targetScale = stageScale * (0.91 + pseudo(plotId * 4.7) * .2)

  useFrame((state, delta) => {
    if (!group.current || plot.dead) return
    growthScale.current = THREE.MathUtils.damp(growthScale.current, targetScale, 5.8, delta)
    group.current.scale.setScalar(growthScale.current)
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.85 + seed) * (storm ? 0.055 : 0.018)
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.66 + seed) * 0.011
  })

  if (plot.dead) return <DeadTree />

  const clusters = look.canopy === 'tall'
    ? [
        [[0, 1.62, 0], [0.86, 1.25, 0.84], look.leaf],
        [[-0.34, 1.44, 0.06], [0.67, 0.94, 0.68], look.leafLight],
        [[0.36, 1.42, 0.03], [0.65, 0.9, 0.67], look.leafDark],
        [[0.02, 1.96, -0.05], [0.58, 0.75, 0.58], look.leafLight],
      ]
    : look.canopy === 'wide'
      ? [
          [[0, 1.45, 0], [1.28, 0.78, 1.08], look.leaf],
          [[-0.52, 1.36, 0.02], [0.82, 0.69, 0.78], look.leafLight],
          [[0.54, 1.36, 0], [0.84, 0.68, 0.8], look.leafDark],
          [[0.02, 1.66, -0.13], [0.78, 0.66, 0.74], look.leafLight],
        ]
      : [
          [[0, 1.52, 0], [1.03, 0.9, 1.03], look.leaf],
          [[-0.42, 1.39, 0.09], [0.78, 0.74, 0.8], look.leafLight],
          [[0.44, 1.4, -0.02], [0.78, 0.74, 0.8], look.leafDark],
          [[0.02, 1.82, 0.02], [0.74, 0.72, 0.74], look.leafLight],
        ]

  return (
    <group
      ref={group}
      position={[0, 0.07, 0]}
      rotation={[0, pseudo(seed) * Math.PI * 2, 0]}
      scale={growthScale.current}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color="#253b23" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      <mesh castShadow position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.13, 0.22, 1.5, 8]} />
        <meshStandardMaterial color={look.trunk} roughness={0.9} flatShading />
      </mesh>

      {(plot.species === 'rhizophora' || plot.species === 'avicennia') &&
        <TreeRoots species={plot.species} seed={seed} color={look.trunk} />}

      <group scale={healthScale}>
        <TreeCanopy clusters={clusters} unhealthy={plot.health < 45} />
      </group>

      {plot.age >= 5 && plot.species === 'sonneratia' && (
        <group>
          {[
            [0.36, 1.26, 0.27], [-0.32, 1.3, -0.22], [0.08, 1.55, 0.34],
          ].map((position, index) => (
            <mesh key={index} position={position}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial color="#f6e7b3" />
            </mesh>
          ))}
        </group>
      )}

      {plot.age >= 6 && plot.health >= 70 && <BlueCarbonOrb seed={seed} />}
    </group>
  )
}

function EmptyPlotMarker({ activeSpecies, hovered }) {
  const ring = useRef()

  useFrame((state) => {
    if (ring.current) ring.current.rotation.z = state.clock.elapsedTime * 0.6
  })

  const look = SPECIES_LOOK[activeSpecies] || SPECIES_LOOK.rhizophora

  return (
    <group position={[0, 0.08, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.035, 8, 24]} />
        <meshStandardMaterial
          color={hovered ? '#fff8b5' : '#f7d45c'}
          emissive="#efb72d"
          emissiveIntensity={hovered ? 0.55 : 0.16}
          roughness={0.45}
          transparent
          opacity={hovered ? 1 : 0.74}
        />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.48, 6]} />
        <meshStandardMaterial color={look.trunk} roughness={1} />
      </mesh>
      <mesh position={[-0.11, 0.48, 0]} rotation={[0, 0, 0.55]} scale={[1.25, 0.45, 0.72]}>
        <sphereGeometry args={[0.12, 8, 5]} />
        <meshStandardMaterial color={look.leafLight} />
      </mesh>
      <mesh position={[0.11, 0.4, 0]} rotation={[0, 0, -0.55]} scale={[1.25, 0.45, 0.72]}>
        <sphereGeometry args={[0.12, 8, 5]} />
        <meshStandardMaterial color={look.leaf} />
      </mesh>
    </group>
  )
}


function PlantingBurst({ seed = 0 }) {
  const group = useRef()
  const elapsed = useRef(0)
  const particles = useMemo(() => (
    Array.from({ length: 9 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 9 + pseudo(seed * 5.1) * 0.4
      return {
        x: Math.cos(angle) * (0.55 + pseudo(seed + index * 4.7) * 0.35),
        z: Math.sin(angle) * (0.55 + pseudo(seed + index * 7.1) * 0.35),
        lift: 0.38 + pseudo(seed + index * 2.9) * 0.42,
        color: index % 3 === 0 ? '#fff0a2' : index % 3 === 1 ? '#8be16a' : '#65d7e8',
      }
    })
  ), [seed])

  useFrame((_, delta) => {
    if (!group.current || elapsed.current >= 1.45) return
    elapsed.current += delta
    const progress = Math.min(1, elapsed.current / 1.45)
    group.current.visible = progress < 1
    group.current.children.forEach((child, index) => {
      const particle = particles[index]
      child.position.set(
        particle.x * progress,
        0.16 + Math.sin(progress * Math.PI) * particle.lift,
        particle.z * progress,
      )
      child.scale.setScalar(0.72 + Math.sin(progress * Math.PI) * 0.7)
      child.material.opacity = Math.max(0, 1 - progress)
    })
  })

  return (
    <group ref={group} position={[0, 0.12, 0]}>
      {particles.map((particle, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.075, 7, 5]} />
          <meshBasicMaterial color={particle.color} transparent opacity={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SelectionMarker() {
  return (
    <Float speed={2.3} rotationIntensity={0.12} floatIntensity={0.28}>
      <group position={[0, 3.25, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color="#ffdf4f" emissive="#8a5b00" emissiveIntensity={0.55} />
        </mesh>
        <mesh position={[0, -0.32, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.13, 0.34, 8]} />
          <meshStandardMaterial color="#ffdf4f" emissive="#8a5b00" emissiveIntensity={0.45} />
        </mesh>
      </group>
    </Float>
  )
}

function Plot3D({ plot, selected, activeSpecies, onClick, storm }) {
  const [hovered, setHovered] = useState(false)
  const position = plotPosition(plot.id)
  const rotation = (pseudo(plot.id * 8.4) - 0.5) * 0.28
  const radiusX = 0.92 + pseudo(plot.id * 4.1) * 0.12
  const radiusZ = 0.7 + pseudo(plot.id * 6.7) * 0.1
  const innerShape = useMemo(() => makeIrregularShape(radiusX, radiusZ, plot.id * 3.17), [plot.id, radiusX, radiusZ])
  const outerShape = useMemo(() => makeIrregularShape(radiusX + 0.09, radiusZ + 0.09, plot.id * 3.17), [plot.id, radiusX, radiusZ])
  const innerGeometry = useMemo(() => new THREE.ShapeGeometry(innerShape, 16), [innerShape])
  const outerGeometry = useMemo(() => new THREE.ShapeGeometry(outerShape, 16), [outerShape])

  useEffect(() => () => {
    innerGeometry.dispose()
    outerGeometry.dispose()
  }, [innerGeometry, outerGeometry])

  const occupied = Boolean(plot.species)
  const fit = suitability(plot, plot.species || activeSpecies)
  const borderColor = selected ? '#fff27b' : fit === 2 ? '#79bf4d' : fit === 1 ? '#e4b75f' : '#9a6a51'
  const grass = useMemo(() => Array.from({ length: plot.tide === 'สูง' ? 5 : plot.tide === 'กลาง' ? 3 : 2 }, (_, index) => {
    const angle = Math.PI * 2 * index / 5 + plot.id
    return { position: [Math.cos(angle) * radiusX * .82, .03, Math.sin(angle) * radiusZ * .82],
      scale: .62 + pseudo(plot.id * 11 + index) * .18,
      color: plot.tide === 'สูง' ? '#69b64a' : '#7ab759' }
  }), [plot.id, plot.tide, radiusX, radiusZ])
  const soilColor = {
    เลน: '#74543b',
    ตะกอน: '#8e6845',
    ดินเลน: '#765440',
    ทราย: '#b9955f',
  }[plot.soil] || '#806044'

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      scale={selected ? 1.035 : hovered ? 1.065 : 1}
      onClick={(event) => {
        event.stopPropagation()
        onClick(plot.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      {(!occupied || selected || hovered) && (
        <mesh geometry={outerGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={selected ? 0.78 : hovered ? 0.5 : 0.25}
            depthWrite={false}
          />
        </mesh>
      )}
      {(!occupied || selected || hovered || plot.dead) && (
        <mesh geometry={innerGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.038, 0]} receiveShadow>
          <meshStandardMaterial
            color={plot.dead ? '#705747' : soilColor}
            roughness={1}
            transparent
            opacity={plot.dead ? 0.55 : selected ? 0.36 : hovered ? 0.25 : 0.12}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}

      <GrassPatch items={grass} name={`plot-grass-${plot.id}`} />

      <group position={[-radiusX * 0.72, 0.06, radiusZ * 0.65]}>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.56, 6]} />
          <meshStandardMaterial color="#74482a" roughness={1} />
        </mesh>
        {(hovered || selected) && (
          <Html center position={[0, 0.75, 0]} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`plot-world-label ${selected ? 'selected' : ''}`}>
              #{String(plot.id).padStart(2, '0')}
            </div>
          </Html>
        )}
      </group>

      {occupied ? (
        <>
          <MangroveTree plot={plot} plotId={plot.id} storm={storm} />
          {plot.age === 0 && !plot.dead && <PlantingBurst seed={plot.id} />}
        </>
      ) : (
        <EmptyPlotMarker activeSpecies={activeSpecies} hovered={hovered} />
      )}
      {selected && <SelectionMarker />}

      <mesh position={[0, 0.7, 0]} visible={false}>
        <cylinderGeometry args={[Math.max(radiusX, radiusZ) + 0.55, Math.max(radiusX, radiusZ) + 0.55, 1.8, 14]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function WaterChannel({ points, radius = 0.44 }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0.04, z)),
      false,
      'centripetal',
    )
    return new THREE.TubeGeometry(curve, 64, radius, 9, false)
  }, [points, radius])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry} scale={[1.08, 0.22, 1.08]} position={[0, 0.38, 0]} receiveShadow>
        <meshStandardMaterial color="#66503e" roughness={1} />
      </mesh>
      <mesh geometry={geometry} scale={[1, 0.09, 1]} position={[0, 0.49, 0]} receiveShadow>
        <meshStandardMaterial color="#469f96" roughness={0.2} transparent opacity={0.94} />
      </mesh>
      <mesh geometry={geometry} scale={[0.93, 0.025, 0.93]} position={[0, 0.538, 0]}>
        <meshBasicMaterial color="#b9f4fb" transparent opacity={0.24} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Boardwalk({ points, width = 0.72 }) {
  const segments = useMemo(() => {
    const result = []
    points.slice(0, -1).forEach(([x1, z1], segmentIndex) => {
      const [x2, z2] = points[segmentIndex + 1]
      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.hypot(dx, dz)
      const steps = Math.max(1, Math.ceil(length / 0.58))
      for (let index = 0; index < steps; index += 1) {
        const t = (index + 0.5) / steps
        result.push({
          x: x1 + dx * t,
          z: z1 + dz * t,
          length: length / steps * 0.88,
          rotation: Math.atan2(dx, dz),
          tilt: (index % 2 ? 1 : -1) * 0.01,
        })
      }
    })
    return result
  }, [points])

  const items = useMemo(() => segments.map((segment) => ({
    position: [segment.x, .55, segment.z], rotation: [0, segment.rotation, segment.tilt],
    scale: [width, .12, segment.length], color: '#ae7240',
  })), [segments, width])
  return <SceneryBatch name="boardwalk-planks" items={items} castShadow />
}

const CoastalTerrain = memo(function CoastalTerrain() {
  const mudflat = useMemo(() => MUDFLAT_POINTS, [])
  const mainland = useMemo(() => MAINLAND_POINTS, [])
  const shore = useMemo(() => SHORE_POINTS, [])
  const shoreGeometry = useMemo(() => new THREE.ShapeGeometry(makeShape(shore), 32), [shore])
  const channelA = useMemo(() => [[-11.8, -7.6], [-8.4, -4.3], [-7.2, -0.4], [-8.3, 3.4], [-10.4, 6.2]], [])
  const channelB = useMemo(() => [[-2.5, -9.8], [-2.0, -6.4], [-3.2, -2.6], [-2.5, 1.8], [-1.4, 6.6]], [])
  const channelC = useMemo(() => [[9.0, -7.8], [7.1, -4.8], [7.9, -0.8], [7.2, 3.0], [9.2, 6.2]], [])
  const mainWalk = useMemo(() => [[-10.2, 7.5], [-8.1, 5.5], [-5.8, 4.4], [-3.5, 3.2], [-0.7, 2.4]], [])
  const crossWalk = useMemo(() => [[-3.5, 3.2], [-1.7, 0.5], [1.2, -1.7], [4.5, -3.2]], [])

  useEffect(() => () => shoreGeometry.dispose(), [shoreGeometry])

  return (
    <group>
      <ExtrudedGround points={mudflat} color="#806247" topY={0.36} depth={0.46} />
      <ExtrudedGround points={mainland} color="#67b84e" topY={1.16} depth={0.9} />
      <mesh geometry={shoreGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.19, 0]} receiveShadow>
        <meshStandardMaterial color="#c9a166" roughness={0.98} />
      </mesh>
      <WaterChannel points={channelA} radius={0.48} />
      <WaterChannel points={channelB} radius={0.42} />
      <WaterChannel points={channelC} radius={0.46} />
      <Boardwalk points={mainWalk} width={0.82} />
      <Boardwalk points={crossWalk} width={0.7} />
      <ReedBeds />
    </group>
  )
})


const MudflatDetails = memo(function MudflatDetails() {
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


const ReedBeds = memo(function ReedBeds() {
  const reeds = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    position: [index % 2 === 0 ? -10.5 - pseudo(index * 3.1) * 6.5 : 10.5 + pseudo(index * 3.1) * 6.5,
      1.21, 6.9 + pseudo(index * 5.7) * 4.7],
    scale: .62 + pseudo(index * 8.3) * .48,
    color: index % 3 === 0 ? '#5ca843' : '#79bf54',
  })), [])
  return <GrassPatch items={reeds} name="shore-reeds" />
})


function Hut({ position, wall = '#ffd77c', roof = '#e5653c', scale = 1 }) {
  const supports = useMemo(() => [-.82, .82].flatMap((x) => [-.62, .62].map((z) => ({ position: [x, .38, z], color: '#76482a' }))), [])
  return (
    <group position={position} scale={scale}>
      <SceneryBatch name="hut-supports" items={supports} shape="cylinder" args={[.055, .075, .76, 7]} castShadow />
      <RoundedBox args={[2.25, 1.4, 1.75]} radius={0.18} smoothness={3} position={[0, 1.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wall} roughness={0.78} />
      </RoundedBox>
      <mesh castShadow position={[0, 2.33, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.65, 0.92, 4]} />
        <meshStandardMaterial color={roof} roughness={0.84} flatShading />
      </mesh>
      <mesh position={[0, 1.22, 0.89]} castShadow>
        <boxGeometry args={[0.58, 0.96, 0.1]} />
        <meshStandardMaterial color="#86522e" roughness={1} />
      </mesh>
      <mesh position={[-0.7, 1.54, 0.9]}>
        <boxGeometry args={[0.42, 0.42, 0.08]} />
        <meshStandardMaterial color="#8ee0ef" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.66, 1.02]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.12, 0.7]} />
        <meshStandardMaterial color="#c78b4b" roughness={1} />
      </mesh>
    </group>
  )
}

const Nursery = memo(function Nursery({ level }) {
  const trays = useMemo(() => Array.from({ length: 4 + level * 2 }, (_, index) => ({
    position: [-.9 + (index % 4) * .6, .17, -.48 + Math.floor(index / 4) * .55], color: '#9c6536',
  })), [level])
  const seedlings = useMemo(() => trays.map((tray, index) => ({
    position: [tray.position[0], .34, tray.position[2]], color: index % 3 === 0 ? '#45a74b' : '#75bf50',
  })), [trays])

  return (
    <group position={[-10.4, 1.19, 9.1]} rotation={[0, 0.08, 0]}>
      <Hut position={[-1.6, 0, 0]} wall="#f6df8d" roof="#ef8f3c" scale={0.78} />
      <group position={[1.15, 0, 0]}>
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.7, 1.15, 1.8]} />
          <meshStandardMaterial color="#9eddbb" transparent opacity={0.48} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[2.8, 0.14, 1.9]} />
          <meshStandardMaterial color="#75b650" roughness={1} />
        </mesh>
        <SceneryBatch name="nursery-trays" items={trays} args={[.42, .12, .34]} castShadow />
        <SceneryBatch name="nursery-seedlings" items={seedlings} shape="cone" args={[.08, .28, 7]} roughness={1} flatShading />
      </group>
    </group>
  )
})


function Drone({ level }) {
  const drone = useRef()
  const rotors = [useRef(), useRef(), useRef(), useRef()]

  useFrame((state) => {
    const t = state.clock.elapsedTime * (0.3 + level * 0.04)
    if (drone.current) {
      drone.current.position.x = 4.8 + Math.cos(t) * 3.3
      drone.current.position.z = -1.8 + Math.sin(t) * 2.7
      drone.current.position.y = 5.2 + Math.sin(t * 2) * 0.24
      drone.current.rotation.y = -t + Math.PI / 2
    }
    rotors.forEach((rotor) => {
      if (rotor.current) rotor.current.rotation.y = state.clock.elapsedTime * 30
    })
  })

  return (
    <group name="coast-drone" ref={drone} position={[5, 5.2, -2]} scale={0.65 + level * 0.06}>
      <RoundedBox args={[0.72, 0.22, 0.5]} radius={0.1} smoothness={3} castShadow>
        <meshStandardMaterial color={level >= 2 ? '#ffd754' : '#f8f8f3'} roughness={0.46} metalness={0.12} />
      </RoundedBox>
      <mesh position={[0, -0.18, 0.03]} castShadow>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshStandardMaterial color="#2e4452" roughness={0.25} metalness={0.3} />
      </mesh>
      {[
        [-0.52, 0, -0.42], [0.52, 0, -0.42], [-0.52, 0, 0.42], [0.52, 0, 0.42],
      ].map(([x, y, z], index) => (
        <group key={index} position={[x, y, z]}>
          <CylinderBetween start={[0, 0, 0]} end={[-x * 0.72, 0, -z * 0.72]} radius={0.035} color="#425b65" />
          <mesh ref={rotors[index]} position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.025, 18]} />
            <meshStandardMaterial color="#344c57" transparent opacity={0.68} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const DroneStation = memo(function DroneStation({ level }) {
  return (
    <group>
      <Hut position={[9.2, 1.19, 9.15]} wall="#eaf4ff" roof="#4a9fd4" scale={0.82} />
      <mesh position={[10.2, 3.0, 9.35]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.1, 8]} />
        <meshStandardMaterial color="#657984" roughness={0.65} metalness={0.32} />
      </mesh>
      <mesh position={[10.2, 4.05, 9.35]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.65, 0.08, 0.08]} />
        <meshStandardMaterial color="#dfeef4" metalness={0.32} />
      </mesh>
      <Drone level={level} />
    </group>
  )
})


const CommunityVillage = memo(function CommunityVillage({ level }) {


  return (
    <group>
      <Hut position={[5.9, 1.19, 10.1]} wall="#ffd38d" roof="#e85e4b" scale={0.92} />
      {level >= 1 && <Hut position={[8.0, 1.19, 11.0]} wall="#feeab0" roof="#5cb574" scale={0.72} />}
      {level >= 2 && <Hut position={[3.9, 1.19, 10.8]} wall="#f7d6b8" roof="#4f92d1" scale={0.7} />}
      {level >= 2 && <MarketStall />}
    </group>
  )
})


function MarketStall() {
  return (
    <group position={[2.25, 1.19, 9.45]} rotation={[0, -0.2, 0]} scale={0.82}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.0, 0.75, 0.9]} />
        <meshStandardMaterial color="#d58a43" roughness={0.88} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[2.4, 0.18, 1.3]} />
        <meshStandardMaterial color="#f5d35b" roughness={0.75} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 1.65, 6]} />
          <meshStandardMaterial color="#744629" roughness={1} />
        </mesh>
      ))}
      {[-0.6, 0, 0.6].map((x, index) => (
        <mesh key={x} position={[x, 1.08, 0.05]} castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.26, 10]} />
          <meshStandardMaterial color={['#f27855', '#74bb4b', '#e4a345'][index]} roughness={0.82} />
        </mesh>
      ))}
    </group>
  )
}

const Dock = memo(function Dock() {
  const planks = useMemo(() => Array.from({ length: 8 }, (_, index) => ({
    position: [index * .56, 0, 0], color: '#9b6639',
  })), [])
  const posts = useMemo(() => [0, 3.95].map((x) => ({ position: [x, -.42, -.42], color: '#6e4a30' })), [])
  return <group position={[7.7, .14, 7.1]} rotation={[0, -.62, 0]}>
    <SceneryBatch name="dock-planks" items={planks} args={[.5, .14, 1.1]} castShadow />
    <SceneryBatch name="dock-posts" items={posts} shape="cylinder" args={[.075, .095, 1.12, 7]} castShadow />
  </group>
})


function Boat() {
  const boat = useRef()

  useFrame((state) => {
    if (!boat.current) return
    boat.current.position.x = 13.8 + Math.sin(state.clock.elapsedTime * .11) * 1.4
    boat.current.position.z = -7 + Math.cos(state.clock.elapsedTime * .11) * 5
    boat.current.rotation.y = Math.atan2(Math.cos(state.clock.elapsedTime * .11) * 1.4, -Math.sin(state.clock.elapsedTime * .11) * 5) - Math.PI / 2
    boat.current.position.y = -0.37 + Math.sin(state.clock.elapsedTime * 1.15) * 0.052
    boat.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.033
  })

  return (
    <group name="coast-boat" ref={boat} position={[10.0, -0.37, 6.4]} rotation={[0, -0.58, 0]}>
      <mesh castShadow scale={[1.5, 0.45, 0.72]}>
        <sphereGeometry args={[0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#e9583f" roughness={0.72} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[1.45, 0.16, 0.72]} />
        <meshStandardMaterial color="#f3d27a" roughness={0.84} />
      </mesh>
      <mesh position={[-0.22, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.75, 7]} />
        <meshStandardMaterial color="#6f5038" />
      </mesh>
      <mesh position={[0.15, 0.82, 0]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.68, 0.54, 0.04]} />
        <meshStandardMaterial color="#fff4cf" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const DecorativeMangroves = memo(function DecorativeMangroves() {
  const trees = useMemo(() => ([
    [-14.7, 0.36, 0.6, 'avicennia', 8], [-12.0, 0.36, 5.2, 'rhizophora', 7],
    [-6.2, 1.18, 10.7, 'sonneratia', 9], [-0.2, 1.18, 10.4, 'avicennia', 7],
    [13.2, 1.18, 9.2, 'rhizophora', 8], [15.5, 0.22, 1.0, 'sonneratia', 7],
  ]), [])

  return (
    <group>
      {trees.map(([x, y, z, species, age], index) => (
        <group key={index} position={[x, y, z]} scale={0.68 + pseudo(index + 201) * 0.24}>
          <MangroveTree plot={{ species, age, health: 96, dead: false }} plotId={100 + index} />
        </group>
      ))}
    </group>
  )
})


function Crab({ position, seed = 0 }) {
  const group = useRef()
  const claws = useRef()

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(state.clock.elapsedTime + seed) * 0.2
    if (claws.current) claws.current.rotation.z = Math.sin(state.clock.elapsedTime * 3 + seed) * .22
    const t = state.clock.elapsedTime * .4 + seed
    group.current.position.x = position[0] + Math.sin(t) * .6
    group.current.position.z = position[2] + Math.cos(t * .7) * .2
  })

  return (
    <group name={`coast-crab-${seed}`} ref={group} position={position} scale={0.56}>
      <mesh scale={[1.3, 0.54, 1]} castShadow>
        <sphereGeometry args={[0.21, 8, 6]} />
        <meshStandardMaterial color="#ef5d46" roughness={0.78} flatShading />
      </mesh>
      <group ref={claws} position={[0,.08,.16]}>
        {[-1,1].map((side) => <group key={side} position={[side*.32,.04,.13]} rotation={[0,side*.4,side*.4]}>
          <mesh scale={[side===1?1.4:1,.7,1]}><sphereGeometry args={[.1,6,5]} /><meshStandardMaterial color="#f18455" /></mesh>
          {[-1,1].map((pincer) => <mesh key={pincer} position={[pincer*.065,0,.1]} rotation={[.5,pincer*.4,0]}><coneGeometry args={[.035,.16,5]} /><meshStandardMaterial color="#f29c63" /></mesh>)}
        </group>)}
      </group>
      {[-.07,.07].map((x) => <group key={x} position={[x,.14,.15]}><mesh><cylinderGeometry args={[.015,.015,.17,5]} /><meshStandardMaterial color="#e8855e" /></mesh><mesh position={[0,.1,0]}><sphereGeometry args={[.027,6,4]} /><meshBasicMaterial color="#192f34" /></mesh></group>)}
      {[-1, 1].map((side) => Array.from({ length: 3 }, (_, index) => (
        <CylinderBetween
          key={`${side}-${index}`}
          start={[side * 0.12, 0, (index - 1) * 0.12]}
          end={[side * (0.4 + index * 0.03), -0.06, (index - 1) * 0.2]}
          radius={0.017}
          color="#ef5d46"
        />
      )))}
    </group>
  )
}

function Fish({ position, color = '#ffd166', seed = 0 }) {
  const group = useRef()
  const tail = useRef()

  useFrame((state) => {
    if (!group.current) return
    if (tail.current) tail.current.rotation.y = Math.sin(state.clock.elapsedTime * 7 + seed) * .35
    const t = state.clock.elapsedTime * .55 + seed
    group.current.position.x = position[0] + Math.sin(t) * 1.2
    group.current.position.z = position[2] + Math.cos(t) * .55
    group.current.rotation.y = Math.atan2(Math.sin(t) * .55, Math.cos(t) * 1.2)
    group.current.position.y = position[1] + Math.sin(t * 2) * .025
  })

  return (
    <group name={`coast-fish-${seed}`} ref={group} position={position} scale={0.65}>
      <mesh scale={[1.5, 0.64, 0.64]}>
        <sphereGeometry args={[0.23, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.62} transparent opacity={0.86} />
      </mesh>
      <mesh ref={tail} position={[-0.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.19, 0.4, 3]} />
        <meshStandardMaterial color={color} transparent opacity={0.86} />
      </mesh>
    </group>
  )
}

function Bird({ seed = 0 }) {
  const group = useRef()
  const leftWing = useRef()
  const rightWing = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.3 + seed
    if (group.current) {
      const radius = 5.5 + seed * 0.7
      group.current.position.x = Math.cos(t) * radius
      group.current.position.z = Math.sin(t) * radius + 0.8
      group.current.position.y = 7.2 + Math.sin(t * 2) * 0.35
      group.current.rotation.y = -t + Math.PI / 2
    }
    if (leftWing.current) leftWing.current.rotation.z = 1.05 + Math.sin(state.clock.elapsedTime * 5.2) * 0.34
    if (rightWing.current) rightWing.current.rotation.z = -1.05 - Math.sin(state.clock.elapsedTime * 5.2) * 0.34
  })

  return (
    <group name={`coast-bird-${seed}`} ref={group} scale={0.7}>
      <mesh scale={[1.4, 0.5, 0.58]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#f8f4dd" roughness={0.7} />
      </mesh>
      <mesh ref={leftWing} position={[-0.25, 0, 0]} rotation={[0, 0, 1.05]}>
        <coneGeometry args={[0.17, 0.5, 3]} />
        <meshStandardMaterial color="#f8f4dd" roughness={0.7} />
      </mesh>
      <mesh ref={rightWing} position={[0.25, 0, 0]} rotation={[0, 0, -1.05]}>
        <coneGeometry args={[0.17, 0.5, 3]} />
        <meshStandardMaterial color="#f8f4dd" roughness={0.7} />
      </mesh>
    </group>
  )
}

function Wildlife({ plots, communityLevel }) {
  const living = plots.filter((plot) => plot.species && !plot.dead).length
  const mature = plots.filter((plot) => plot.species && !plot.dead && plot.age >= 6).length
  const crabCount = Math.min(6, Math.max(0, Math.floor(living / 3)))
  const fishCount = Math.min(7, Math.max(0, Math.floor(living / 2) - 1))
  const birdCount = Math.min(3, Math.max(0, Math.floor(mature / 3) + (communityLevel >= 2 ? 1 : 0)))

  return (
    <group>
      {Array.from({ length: crabCount }, (_, index) => (
        <Crab key={`crab-${index}`} position={[-9.8 + index * 3.2, 0.47, -8.2 + (index % 2) * 0.8]} seed={index} />
      ))}
      {Array.from({ length: fishCount }, (_, index) => (
        <Fish
          key={`fish-${index}`}
          position={[-9 + (index * 3.7) % 19, -.29, -12.8 - (index % 2) * .5]}
          color={['#ffd166', '#ff8d70', '#88e0dd'][index % 3]}
          seed={index * 0.8}
        />
      ))}
      {Array.from({ length: birdCount }, (_, index) => <Bird key={`bird-${index}`} seed={index * 1.8} />)}
    </group>
  )
}

function CoastalBarriers({ plots, communityLevel }) {
  const mature = plots.filter((plot) => plot.species && !plot.dead && plot.age >= 6).length
  const count = Math.min(15, Math.max(0, mature + communityLevel * 2))
  const { posts, rails } = useMemo(() => {
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
}

const Clouds = memo(function Clouds() {
  const resources = useWorldResources()
  const geometry = resources.geometry('sphere', [.8, 14, 10])
  const material = resources.material({ color: '#ffffff', roughness: .96, transparent: true, opacity: .92 })
  const clouds = [
    [-11, 8.5, -10, 1.25], [7, 9.5, -12, 1], [14, 7.6, 3, 0.78], [-3, 10, 14, 0.9],
  ]

  return (
    <group>
      {clouds.map(([x, y, z, scale], index) => (
        <Float key={index} speed={0.42 + index * 0.1} rotationIntensity={0.07} floatIntensity={0.34}>
          <group position={[x, y, z]} scale={scale}>
            {[
              [-0.7, 0, 0, 0.66], [0, 0.18, 0, 0.9], [0.72, 0, 0.02, 0.62], [0.16, -0.12, 0.08, 0.72],
            ].map(([cx, cy, cz, sphereScale], cloudIndex) => (
              <mesh key={cloudIndex} position={[cx, cy, cz]} scale={sphereScale} geometry={geometry} material={material} dispose={null} />
            ))}
          </group>
        </Float>
      ))}
    </group>
  )
})


function CameraRig({ selectedPlot, cameraReset }) {
  const controls = useRef()
  const { camera, size } = useThree()
  const focusFrames = useRef(0)
  const focusTarget = useRef(new THREE.Vector3(0, 0.5, 0.6))
  const cameraDelta = useRef(new THREE.Vector3())

  useEffect(() => {
    const responsiveZoom = size.width < 600
      ? Math.min(22, size.width / 19)
      : size.width < 900
        ? 28
        : Math.max(30, Math.min(46, Math.min(size.width / 29, size.height / 22)))
    focusFrames.current = 0
    controls.current?.target.set(0, 0.5, 0.6)
    camera.position.set(20, 18, 22)
    camera.zoom = responsiveZoom
    camera.lookAt(0, 0.5, 0.6)
    camera.updateProjectionMatrix()
    controls.current?.update()
  }, [camera, size.height, size.width, cameraReset])

  useEffect(() => {
    if (!selectedPlot) return
    const [x, , z] = plotPosition(selectedPlot)
    focusTarget.current.set(x, 0.55, z)
    focusFrames.current = 34
  }, [selectedPlot])

  useFrame((_, elapsed) => {
    if (!controls.current || focusFrames.current <= 0) return
    const delta = cameraDelta.current.copy(focusTarget.current).sub(controls.current.target).multiplyScalar(1 - Math.exp(-5 * elapsed))
    controls.current.target.add(delta)
    camera.position.add(delta)
    focusFrames.current -= elapsed * 60
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0.5, 0.6]}
      onStart={() => { focusFrames.current = 0 }}
      enablePan
      screenSpacePanning
      enableDamping
      dampingFactor={0.075}
      minZoom={10}
      maxZoom={66}
      minPolarAngle={Math.PI / 4.35}
      maxPolarAngle={Math.PI / 2.95}
      minAzimuthAngle={-Math.PI * 0.86}
      maxAzimuthAngle={Math.PI * 0.48}
    />
  )
}

function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades, day, weather, fireflies, cameraReset, habitat, clean, protection, action, quality, onReady }) {
  const storm = weather === 'storm' || weather === 'kingtide'
  const crewTarget = useMemo(() => action?.plotId
    ? plotPosition(action.plotId).map((v, i) => i === 0 ? v + .8 : v)
    : action?.type === 'clean' ? [0, .48, -8.3]
    : action?.type === 'patrol' ? [1, .48, -9.4] : null, [action])
  const forecast = useMemo(() => forecastFor(day), [day])
  const golden = forecast.golden
  const skyColor = storm ? '#84a9b5' : golden ? '#b6c8ba' : '#94d2d4'

  return (
    <>
      <WorldPerformance plotPositions={PLOT_POSITIONS} quality={quality} onReady={onReady} />
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 38, 72]} />
      <ambientLight intensity={0.62} />
      <hemisphereLight args={[golden ? '#ffe7bb' : '#e3fbfa', '#5f684c', 1.25]} />
      <directionalLight
        castShadow
        position={[14, 22, 9]}
        color={golden ? '#ffde9e' : '#fff6df'}
        intensity={storm ? 1.15 : golden ? 2.4 : 2.2}
        shadow-mapSize-width={quality.shadowSize}
        shadow-mapSize-height={quality.shadowSize}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
      />

      <LivingWater tide={forecast.tideOffset} storm={storm} score={habitat?.score || 0} golden={golden} />
      <RestorationScenery clean={clean} stage={habitat?.stage || 0} protection={protection} />
      {storm && <Rain />}
      <CoastalTerrain />
      <MudflatDetails />
      <DecorativeMangroves />
      <Nursery level={upgrades.nursery} />
      <DroneStation level={upgrades.mrv} />
      <CommunityVillage level={upgrades.community} />
      <CoastCharacters action={action} target={crewTarget} storm={storm} />
      <Dock />
      <Boat />

      {plots.map((plot) => (
        <Plot3D
          key={plot.id}
          plot={plot}
          storm={storm}
          selected={selectedPlot === plot.id}
          activeSpecies={activeSpecies}
          onClick={onPlotClick}
        />
      ))}

      <Wildlife plots={plots} communityLevel={upgrades.community} />
      {fireflies && plots.filter((p) => p.species === 'sonneratia' && !p.dead && p.age >= 6).map((p) => <Sparkles key={p.id} position={plotPosition(p.id).map((v, i) => i === 1 ? v + 1.8 : v)} count={18} scale={[2.8, 2.2, 2.8]} size={3.5} speed={0.6} color="#f6ec87" opacity={0.85} />)}
      <CoastalBarriers plots={plots} communityLevel={upgrades.community} />
      <Sparkles
        count={28}
        scale={[26, 9, 21]}
        size={1.15}
        speed={0.12}
        color="#fff1b9"
        opacity={0.25}
        position={[0, 4.2, 0]}
      />
      <Clouds />
<CameraRig selectedPlot={selectedPlot} cameraReset={cameraReset} />
    </>
  )
}

function RestorationScenery({ clean, stage, protection }) {
  const litter = useRef()
  const target = clean ? .001 : 1
  const debris = useMemo(() => {
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
  useFrame((_, dt) => {
    if (!litter.current || Math.abs(litter.current.scale.x - target) < .0001) return
    const size = THREE.MathUtils.damp(litter.current.scale.x, target, 5, Math.min(dt, .1))
    litter.current.scale.setScalar(size)
    litter.current.visible = size > .01
  })
  return <group>
    <group ref={litter}>
      <SceneryBatch name="restoration-debris" items={debris.bottles} shape="cylinder" args={[.06, .06, .3, 6]} roughness={1} />
      <SceneryBatch name="debris-caps" items={debris.caps} args={[.07, .08, .07]} roughness={1} />
    </group>
    {grass.length > 0 && <GrassPatch items={grass} name="restoration-grass" />}
    {protection && [-7,-3,1,5].map((x) => <group key={x} position={[x,.45,-9.5]}><mesh position={[0,.3,0]}><cylinderGeometry args={[.035,.05,1.1,6]} /><meshStandardMaterial color="#887252" /></mesh><mesh position={[.15,.68,0]}><planeGeometry args={[.3,.23]} /><meshStandardMaterial color="#eec866" side={THREE.DoubleSide} /></mesh></group>)}
    {stage >= 2 && <group position={[8.3,.5,3.5]}><mesh position={[0,.55,0]}><cylinderGeometry args={[.045,.06,1.1,6]} /><meshStandardMaterial color="#9e8357" /></mesh><mesh position={[0,1.1,0]}><boxGeometry args={[.8,.45,.09]} /><meshStandardMaterial color="#276c58" /></mesh><mesh position={[0,1.12,.06]}><circleGeometry args={[.11,8]} /><meshBasicMaterial color="#edd599" /></mesh></group>}
  </group>
}

function Rain() {
  const points = useRef()
  const positions = useMemo(() => {
    const values = new Float32Array(180 * 3)
    for (let i = 0; i < 180; i += 1) {
      values[i * 3] = (pseudo(i + 321) - 0.5) * 28
      values[i * 3 + 1] = pseudo(i + 552) * 12
      values[i * 3 + 2] = (pseudo(i + 776) - 0.5) * 24
    }
    return values
  }, [])
  useFrame((_, delta) => {
    const attribute = points.current?.geometry.attributes.position
    if (!attribute) return
    for (let i = 0; i < 180; i += 1) {
      attribute.array[i * 3 + 1] -= Math.min(delta, 0.1) * 8
      if (attribute.array[i * 3 + 1] < 0.4) attribute.array[i * 3 + 1] = 12
    }
    attribute.needsUpdate = true
  })
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d9f5ed" size={0.075} transparent opacity={0.65} depthWrite={false} /></points>
}

function WebGLFallback({ onReady }) {
  useEffect(() => { onReady?.(true) }, [onReady])
  return (
    <div className="webgl-fallback">
      <strong>เปิดฉาก 3D ไม่สำเร็จ</strong>
      <span>โปรดเปิด Hardware Acceleration ในเบราว์เซอร์แล้วรีเฟรชหน้า</span>
    </div>
  )
}

const MangroveWorld3DNatural = memo(function MangroveWorld3DNatural(props) {
  const quality = useDeviceQuality()
  return (
    <div className="world-canvas natural-world" aria-label="ฉากป่าชายเลนสามมิติแบบโต้ตอบ">
      <Canvas
        orthographic
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, quality.maxDpr]}
        camera={{ position: [20, 18, 22], zoom: 36, near: 0.1, far: 140 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        fallback={<WebGLFallback onReady={props.onReady} />}
        onPointerMissed={() => props.onClearSelection?.()}
      >
        <WorldResources><WorldScene {...props} quality={quality} /></WorldResources>
      </Canvas>
    </div>
  )
})
export default MangroveWorld3DNatural
