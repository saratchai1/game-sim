import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  Html,
  OrbitControls,
  RoundedBox,
  Sparkles,
} from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

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
  }, [end, start])

  return (
    <mesh castShadow position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[radius, radius * 1.12, transform.length, 7]} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  )
}

function LeafCluster({ position, scale, color }) {
  return (
    <mesh castShadow position={position} scale={scale}>
      <dodecahedronGeometry args={[0.48, 1]} />
      <meshStandardMaterial color={color} roughness={0.76} flatShading />
    </mesh>
  )
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

function MangroveTree({ plot, plotId }) {
  const group = useRef()
  const look = SPECIES_LOOK[plot.species] || SPECIES_LOOK.rhizophora
  const stageScale = plot.age < 1 ? 0.35 : plot.age < 3 ? 0.58 : plot.age < 6 ? 0.82 : 1
  const growthScale = useRef(plot.age === 0 ? 0.12 : stageScale)
  const healthScale = 0.8 + (Math.max(plot.health, 10) / 100) * 0.2
  const seed = plotId * 17

  useFrame((state, delta) => {
    if (!group.current || plot.dead) return
    growthScale.current = THREE.MathUtils.damp(growthScale.current, stageScale, 5.8, delta)
    group.current.scale.setScalar(growthScale.current)
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.85 + seed) * 0.018
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

      {plot.species === 'rhizophora' && (
        <group>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 8 + pseudo(seed + index) * 0.18
            return (
              <CylinderBetween
                key={index}
                start={[Math.cos(angle) * 0.72, 0.02, Math.sin(angle) * 0.72]}
                end={[Math.cos(angle) * 0.08, 0.62 + (index % 2) * 0.12, Math.sin(angle) * 0.08]}
                radius={0.045}
                color={look.trunk}
              />
            )
          })}
        </group>
      )}

      {plot.species === 'avicennia' && (
        <group>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 8
            return (
              <mesh key={index} position={[Math.cos(angle) * 0.58, 0.07, Math.sin(angle) * 0.48]}>
                <coneGeometry args={[0.032, 0.15 + (index % 3) * 0.025, 5]} />
                <meshStandardMaterial color="#9b795b" roughness={1} flatShading />
              </mesh>
            )
          })}
        </group>
      )}

      <group scale={healthScale}>
        {clusters.map(([position, scale, color], index) => (
          <LeafCluster key={index} position={position} scale={scale} color={color} />
        ))}
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
      <mesh position={[0, 0.28, 0]} castShadow>
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
    if (!group.current) return
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

function GrassTuft({ position, scale = 1, color = '#70b74d', seed = 0 }) {
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8 + seed) * 0.022
  })

  return (
    <group ref={group} position={position} scale={scale}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[(index - 2) * 0.055, 0.17, (pseudo(seed + index) - 0.5) * 0.12]} rotation={[0, 0, (index - 2) * 0.08]}>
          <coneGeometry args={[0.045, 0.34, 4]} />
          <meshStandardMaterial color={color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Plot3D({ plot, selected, activeSpecies, onClick }) {
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
  const fit = suitabilityLocal(plot, plot.species || activeSpecies)
  const borderColor = selected ? '#fff27b' : fit === 2 ? '#79bf4d' : fit === 1 ? '#e4b75f' : '#9a6a51'
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
      {(selected || hovered) && (
        <mesh geometry={outerGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={selected ? 0.78 : 0.38}
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

      {Array.from({ length: plot.tide === 'สูง' ? 5 : plot.tide === 'กลาง' ? 3 : 2 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 5 + plot.id
        return (
          <GrassTuft
            key={index}
            position={[Math.cos(angle) * radiusX * 0.82, 0.03, Math.sin(angle) * radiusZ * 0.82]}
            scale={0.62 + pseudo(plot.id * 11 + index) * 0.18}
            color={plot.tide === 'สูง' ? '#69b64a' : '#7ab759'}
            seed={plot.id * 10 + index}
          />
        )
      })}

      <group position={[-radiusX * 0.72, 0.06, radiusZ * 0.65]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.56, 6]} />
          <meshStandardMaterial color="#74482a" roughness={1} />
        </mesh>
        {(hovered || selected) && (
          <Html center position={[0, 0.75, 0]} distanceFactor={11} style={{ pointerEvents: 'none' }}>
            <div className={`plot-world-label ${selected ? 'selected' : ''}`}>
              #{String(plot.id).padStart(2, '0')}
            </div>
          </Html>
        )}
      </group>

      {occupied ? (
        <>
          <MangroveTree plot={plot} plotId={plot.id} />
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

function suitabilityLocal(plot, speciesKey) {
  const speciesRules = {
    rhizophora: { tides: ['กลาง'], soils: ['เลน', 'ตะกอน'] },
    avicennia: { tides: ['กลาง', 'สูง'], soils: ['ตะกอน', 'ดินเลน'] },
    sonneratia: { tides: ['ต่ำ', 'กลาง'], soils: ['เลน', 'ตะกอน'] },
  }
  const rules = speciesRules[speciesKey]
  if (!rules) return 0
  return Number(rules.tides.includes(plot.tide)) + Number(rules.soils.includes(plot.soil))
}

function Water({ day, eventType }) {
  const group = useRef()
  const ripples = useMemo(() => (
    Array.from({ length: 22 }, (_, index) => ({
      x: -18 + pseudo(index + 1) * 36,
      z: -15 + pseudo(index + 28) * 30,
      scale: 0.35 + pseudo(index + 71) * 0.85,
      speed: 0.45 + pseudo(index + 94) * 0.55,
    }))
  ), [])

  const tideOffset = [-0.08, -0.01, 0.11, 0.01][(Math.max(1, day) - 1) % 4]
  const eventOffset = eventType === 'kingtide' ? 0.16 : 0
  const stormChop = eventType === 'storm' ? 0.045 : 0.022

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = -0.58 + tideOffset + eventOffset
        + Math.sin(state.clock.elapsedTime * (eventType === 'storm' ? 1.2 : 0.55)) * stormChop
    }
  })

  return (
    <group ref={group}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[54, 46]} />
        <meshStandardMaterial color="#49bddc" roughness={0.26} metalness={0.035} />
      </mesh>
      {ripples.map((ripple, index) => (
        <Float key={index} speed={ripple.speed} rotationIntensity={0} floatIntensity={0.13}>
          <mesh position={[ripple.x, 0.035, ripple.z]} rotation={[-Math.PI / 2, 0, 0]} scale={ripple.scale}>
            <torusGeometry args={[0.48, 0.022, 6, 22]} />
            <meshBasicMaterial color="#d9f7ff" transparent opacity={0.4} />
          </mesh>
        </Float>
      ))}
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
      <mesh
        geometry={geometry}
        scale={[1.12, 0.022, 1.12]}
        position={[0, 0.448, 0]}
        renderOrder={2}
      >
        <meshStandardMaterial
          color="#6b5542"
          roughness={1}
          transparent
          opacity={0.46}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[1, 0.018, 1]}
        position={[0, 0.472, 0]}
        renderOrder={3}
      >
        <meshStandardMaterial
          color="#52bfd1"
          emissive="#0e6475"
          emissiveIntensity={0.08}
          roughness={0.22}
          transparent
          opacity={0.88}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-3}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[0.7, 0.006, 0.7]}
        position={[0, 0.486, 0]}
        renderOrder={4}
      >
        <meshBasicMaterial
          color="#e1fbff"
          transparent
          opacity={0.18}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-5}
        />
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

  return (
    <group>
      {segments.map((segment, index) => (
        <mesh
          key={index}
          position={[segment.x, 0.55, segment.z]}
          rotation={[0, segment.rotation, segment.tilt]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, 0.12, segment.length]} />
          <meshStandardMaterial color="#ae7240" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function CoastalTerrain() {
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
      <WaterChannel points={channelA} radius={0.34} />
      <WaterChannel points={channelB} radius={0.3} />
      <WaterChannel points={channelC} radius={0.33} />
      <Boardwalk points={mainWalk} width={0.82} />
      <Boardwalk points={crossWalk} width={0.7} />
      <ReedBeds />
    </group>
  )
}


function MudflatDetails() {
  const details = useMemo(() => (
    Array.from({ length: 46 }, (_, index) => ({
      x: -11.4 + pseudo(index * 5.33 + 2) * 22.8,
      z: -8.6 + pseudo(index * 8.19 + 9) * 14.1,
      scale: 0.45 + pseudo(index * 2.17 + 4) * 0.8,
      type: index % 4,
      rotation: pseudo(index * 7.7 + 11) * Math.PI * 2,
    }))
  ), [])

  return (
    <group>
      {details.map((detail, index) => {
        if (detail.type === 0) {
          return (
            <mesh
              key={index}
              position={[detail.x, 0.425, detail.z]}
              rotation={[-Math.PI / 2, 0, detail.rotation]}
              scale={[detail.scale * 1.45, detail.scale, 1]}
            >
              <circleGeometry args={[0.24, 12]} />
              <meshBasicMaterial color="#523d30" transparent opacity={0.1} depthWrite={false} />
            </mesh>
          )
        }
        if (detail.type === 1) {
          return (
            <mesh
              key={index}
              position={[detail.x, 0.455, detail.z]}
              rotation={[0, detail.rotation, 0]}
              scale={[detail.scale, detail.scale * 0.32, detail.scale * 0.62]}
              castShadow
            >
              <sphereGeometry args={[0.11, 7, 5]} />
              <meshStandardMaterial color={index % 3 ? '#d9c392' : '#efe0b4'} roughness={0.95} />
            </mesh>
          )
        }
        if (detail.type === 2) {
          return (
            <group key={index} position={[detail.x, 0.445, detail.z]} rotation={[0, detail.rotation, 0]} scale={detail.scale}>
              <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.022, 0.03, 0.48, 5]} />
                <meshStandardMaterial color="#765139" roughness={1} />
              </mesh>
              <mesh position={[0.13, 0.05, 0.03]} rotation={[0.3, 0, 0]}>
                <coneGeometry args={[0.045, 0.16, 5]} />
                <meshStandardMaterial color="#8abc55" roughness={1} />
              </mesh>
            </group>
          )
        }
        return (
          <GrassTuft
            key={index}
            position={[detail.x, 0.43, detail.z]}
            scale={detail.scale * 0.42}
            color={index % 2 ? '#6cae4d' : '#80bd58'}
            seed={index + 600}
          />
        )
      })}
    </group>
  )
}

function ReedBeds() {
  const reeds = useMemo(() => (
    Array.from({ length: 42 }, (_, index) => ({
      x: index % 2 === 0 ? -10.5 - pseudo(index * 3.1) * 6.5 : 10.5 + pseudo(index * 3.1) * 6.5,
      z: 6.9 + pseudo(index * 5.7) * 4.7,
      scale: 0.62 + pseudo(index * 8.3) * 0.48,
      color: index % 3 === 0 ? '#5ca843' : '#79bf54',
    }))
  ), [])

  return (
    <group>
      {reeds.map((reed, index) => (
        <GrassTuft key={index} position={[reed.x, 1.21, reed.z]} scale={reed.scale} color={reed.color} seed={index} />
      ))}
    </group>
  )
}

function Hut({ position, wall = '#ffd77c', roof = '#e5653c', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {[-0.82, 0.82].map((x) => [-0.62, 0.62].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.38, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 0.76, 7]} />
          <meshStandardMaterial color="#76482a" roughness={1} />
        </mesh>
      )))}
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

function Nursery({ level }) {
  const trays = Array.from({ length: 4 + level * 2 }, (_, index) => index)

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
        {trays.map((index) => (
          <group key={index} position={[-0.9 + (index % 4) * 0.6, 0.17, -0.48 + Math.floor(index / 4) * 0.55]}>
            <mesh castShadow>
              <boxGeometry args={[0.42, 0.12, 0.34]} />
              <meshStandardMaterial color="#9c6536" roughness={1} />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
              <coneGeometry args={[0.08, 0.28, 7]} />
              <meshStandardMaterial color={index % 3 === 0 ? '#45a74b' : '#75bf50'} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

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
      if (rotor.current) rotor.current.rotation.y += 0.5
    })
  })

  return (
    <group ref={drone} position={[5, 5.2, -2]} scale={0.65 + level * 0.06}>
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

function DroneStation({ level }) {
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
}

function Worker({ position, shirt = '#f4d35e', seed = 0 }) {
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    const walk = Math.sin(state.clock.elapsedTime * 0.38 + seed)
    group.current.position.x = position[0] + walk * 0.18
    group.current.position.z = position[2] + Math.cos(state.clock.elapsedTime * 0.3 + seed) * 0.08
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.7 + seed) * 0.025
    group.current.rotation.y = seed * 0.6 + walk * 0.16
  })

  return (
    <group ref={group} position={position} rotation={[0, seed * 0.6, 0]} scale={0.72}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.45, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <sphereGeometry args={[0.18, 9, 7]} />
        <meshStandardMaterial color="#d99a66" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.16, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.23, 0.1, 10]} />
        <meshStandardMaterial color="#ee9d36" roughness={0.8} />
      </mesh>
    </group>
  )
}

function CommunityVillage({ level }) {
  const workers = [
    [-8.8, 1.2, 7.4], [-6.9, 1.2, 6.2], [-5.0, 0.62, 4.6], [-3.2, 0.62, 3.3],
  ]

  return (
    <group>
      <Hut position={[5.9, 1.19, 10.1]} wall="#ffd38d" roof="#e85e4b" scale={0.92} />
      {level >= 1 && <Hut position={[8.0, 1.19, 11.0]} wall="#feeab0" roof="#5cb574" scale={0.72} />}
      {level >= 2 && <Hut position={[3.9, 1.19, 10.8]} wall="#f7d6b8" roof="#4f92d1" scale={0.7} />}
      {workers.slice(0, Math.min(workers.length, 1 + level)).map((position, index) => (
        <Worker key={index} position={position} shirt={['#f4d35e', '#62c4ed', '#ef7c68', '#9bd45b'][index]} seed={index} />
      ))}
      {level >= 2 && <MarketStall />}
    </group>
  )
}

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

function Dock() {
  return (
    <group position={[7.7, 0.14, 7.1]} rotation={[0, -0.62, 0]}>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} position={[index * 0.56, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.14, 1.1]} />
          <meshStandardMaterial color="#9b6639" roughness={1} />
        </mesh>
      ))}
      {[0, 3.95].map((x) => (
        <mesh key={x} position={[x, -0.42, -0.42]} castShadow>
          <cylinderGeometry args={[0.075, 0.095, 1.12, 7]} />
          <meshStandardMaterial color="#6e4a30" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function Boat() {
  const boat = useRef()

  useFrame((state) => {
    if (!boat.current) return
    boat.current.position.y = -0.37 + Math.sin(state.clock.elapsedTime * 1.15) * 0.052
    boat.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.033
  })

  return (
    <group ref={boat} position={[10.0, -0.37, 6.4]} rotation={[0, -0.58, 0]}>
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

function DecorativeMangroves() {
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
}

function Crab({ position, seed = 0 }) {
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(state.clock.elapsedTime + seed) * 0.2
    group.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.8 + seed) * 0.08
  })

  return (
    <group ref={group} position={position} scale={0.56}>
      <mesh scale={[1.3, 0.54, 1]} castShadow>
        <sphereGeometry args={[0.21, 8, 6]} />
        <meshStandardMaterial color="#ef5d46" roughness={0.78} flatShading />
      </mesh>
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

  useFrame((state) => {
    if (!group.current) return
    group.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.55 + seed) * 0.42
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.3 + seed) * 0.06
  })

  return (
    <group ref={group} position={position} scale={0.48}>
      <mesh scale={[1.5, 0.64, 0.64]}>
        <sphereGeometry args={[0.23, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.62} transparent opacity={0.86} />
      </mesh>
      <mesh position={[-0.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
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
    <group ref={group} scale={0.7}>
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
          position={[-11 + (index * 3.7) % 22, -0.48, -12 + (index % 3) * 3.1]}
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

  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const x = -11.5 + index * 1.6
        const z = -9.45 + Math.sin(index * 0.8) * 0.48
        return (
          <group key={index}>
            <mesh position={[x, 0.1, z]} rotation={[0, 0, (index % 2 ? 1 : -1) * 0.07]} castShadow>
              <cylinderGeometry args={[0.075, 0.11, 1.25, 7]} />
              <meshStandardMaterial color="#93603a" roughness={1} />
            </mesh>
            {index > 0 && (
              <CylinderBetween
                start={[-11.5 + (index - 1) * 1.6, 0.45, -9.45 + Math.sin((index - 1) * 0.8) * 0.48]}
                end={[x, 0.45, z]}
                radius={0.026}
                color="#93603a"
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

function Clouds({ storm = false }) {
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
              <mesh key={cloudIndex} position={[cx, cy, cz]} scale={sphereScale}>
                <sphereGeometry args={[0.8, 14, 10]} />
                <meshStandardMaterial
                  color={storm ? '#a8bcc4' : '#ffffff'}
                  roughness={0.96}
                  transparent
                  opacity={storm ? 0.98 : 0.92}
                />
              </mesh>
            ))}
          </group>
        </Float>
      ))}
    </group>
  )
}


function RainField() {
  const group = useRef()
  const drops = useMemo(() => (
    Array.from({ length: 72 }, (_, index) => ({
      x: -18 + pseudo(index * 4.7 + 3) * 36,
      y: 1.5 + pseudo(index * 7.3 + 8) * 12,
      z: -13 + pseudo(index * 9.1 + 11) * 28,
      length: 0.24 + pseudo(index * 2.3 + 17) * 0.34,
      speed: 5.5 + pseudo(index * 3.8 + 23) * 3.8,
    }))
  ), [])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.children.forEach((drop, index) => {
      drop.position.y -= delta * drop.userData.speed
      drop.position.x += delta * 0.65
      if (drop.position.y < -0.4) {
        const source = drops[index]
        drop.position.set(source.x - 2.5, 11.5 + pseudo(index * 6.2) * 3.5, source.z)
      }
    })
  })

  return (
    <group ref={group}>
      {drops.map((drop, index) => (
        <mesh
          key={index}
          position={[drop.x, drop.y, drop.z]}
          rotation={[0, 0, -0.18]}
          userData={{ speed: drop.speed }}
        >
          <boxGeometry args={[0.018, drop.length, 0.018]} />
          <meshBasicMaterial color="#d9f5ff" transparent opacity={0.58} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function FloatingTrash() {
  const pieces = useMemo(() => (
    Array.from({ length: 14 }, (_, index) => ({
      x: -12 + pseudo(index * 5.2 + 1) * 24,
      z: -11 + pseudo(index * 8.4 + 5) * 8,
      rotation: pseudo(index * 7.8 + 3) * Math.PI,
      color: ['#e9f2e9', '#ef8a6c', '#f4d35e', '#72bfd4'][index % 4],
      scale: 0.65 + pseudo(index * 3.3) * 0.6,
    }))
  ), [])

  return (
    <group>
      {pieces.map((piece, index) => (
        <Float key={index} speed={0.8 + (index % 3) * 0.2} rotationIntensity={0.28} floatIntensity={0.12}>
          <mesh
            position={[piece.x, -0.43, piece.z]}
            rotation={[0.3, piece.rotation, 0.2]}
            scale={piece.scale}
          >
            {index % 3 === 0
              ? <cylinderGeometry args={[0.055, 0.075, 0.32, 7]} />
              : <boxGeometry args={[0.18, 0.045, 0.12]} />}
            <meshStandardMaterial color={piece.color} roughness={0.72} transparent opacity={0.9} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function KingTideFoam() {
  const rings = useMemo(() => (
    Array.from({ length: 18 }, (_, index) => ({
      x: -13 + pseudo(index * 4.1 + 2) * 26,
      z: -10.5 + pseudo(index * 7.4 + 9) * 5,
      scale: 0.45 + pseudo(index * 2.7 + 6) * 0.8,
      rotation: pseudo(index * 3.5 + 12) * Math.PI,
    }))
  ), [])

  return (
    <group>
      {rings.map((ring, index) => (
        <Float key={index} speed={0.8 + (index % 4) * 0.1} rotationIntensity={0} floatIntensity={0.12}>
          <mesh
            position={[ring.x, -0.22, ring.z]}
            rotation={[-Math.PI / 2, 0, ring.rotation]}
            scale={[ring.scale * 1.7, ring.scale, 1]}
          >
            <torusGeometry args={[0.34, 0.025, 6, 24, Math.PI * 1.45]} />
            <meshBasicMaterial color="#e8fdff" transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function EventAtmosphere({ eventType }) {
  if (!eventType) return null

  return (
    <group>
      {eventType === 'storm' && <RainField />}
      {eventType === 'trash' && <FloatingTrash />}
      {eventType === 'kingtide' && <KingTideFoam />}
      {eventType === 'wildlife' && (
        <group>
          <Bird seed={5.4} />
          <Bird seed={7.1} />
          <Crab position={[-5.4, 0.47, -7.5]} seed={8} />
          <Crab position={[4.2, 0.47, -6.8]} seed={9} />
        </group>
      )}
      {eventType === 'fishers' && (
        <group>
          <Fish position={[-6.2, -0.42, -10.2]} color="#ffd166" seed={9.1} />
          <Fish position={[1.1, -0.44, -9.8]} color="#8ee0dd" seed={10.4} />
          <Fish position={[7.4, -0.43, -8.7]} color="#ff8f70" seed={11.7} />
        </group>
      )}
      {eventType === 'grant' && (
        <Sparkles
          count={46}
          scale={[7, 5, 5]}
          size={2.1}
          speed={0.7}
          color="#fff078"
          opacity={0.72}
          position={[6.5, 3.2, 9.8]}
        />
      )}
    </group>
  )
}

function CameraRig({ selectedPlot }) {
  const controls = useRef()
  const { camera, size } = useThree()
  const focusFrames = useRef(0)
  const focusTarget = useRef(new THREE.Vector3(0, 0.5, 0.6))

  useEffect(() => {
    const responsiveZoom = size.width < 600
      ? 26
      : size.width < 900
        ? 32
        : Math.max(30, Math.min(46, Math.min(size.width / 29, size.height / 22)))
    camera.position.set(20, 18, 22)
    camera.zoom = responsiveZoom
    camera.lookAt(0, 0.5, 0.6)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useEffect(() => {
    if (!selectedPlot) return
    const [x, , z] = plotPosition(selectedPlot)
    focusTarget.current.set(x, 0.55, z)
    focusFrames.current = 34
  }, [selectedPlot])

  useFrame(() => {
    if (!controls.current || focusFrames.current <= 0) return
    const delta = focusTarget.current.clone().sub(controls.current.target).multiplyScalar(0.075)
    controls.current.target.add(delta)
    camera.position.add(delta)
    focusFrames.current -= 1
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0.5, 0.6]}
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

function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades, day, eventType }) {
  const storm = eventType === 'storm'
  const skyColor = storm
    ? '#6f99a6'
    : eventType === 'kingtide'
      ? '#70c6e8'
      : day % 7 === 0
        ? '#79ccef'
        : '#83d7f7'

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 34, 68]} />
      <ambientLight intensity={storm ? 0.62 : 1.05} />
      <hemisphereLight args={[storm ? '#bbd4dc' : '#f3fbff', '#695139', storm ? 1.45 : 2.15]} />
      <directionalLight
        castShadow
        position={[14, 22, 9]}
        intensity={storm ? 1.75 : 3.45}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
      />

      <Water day={day} eventType={eventType} />
      <CoastalTerrain />
      <MudflatDetails />
      <DecorativeMangroves />
      <Nursery level={upgrades.nursery} />
      <DroneStation level={upgrades.mrv} />
      <CommunityVillage level={upgrades.community} />
      <Dock />
      <Boat />

      {plots.map((plot) => (
        <Plot3D
          key={plot.id}
          plot={plot}
          selected={selectedPlot === plot.id}
          activeSpecies={activeSpecies}
          onClick={onPlotClick}
        />
      ))}

      <Wildlife plots={plots} communityLevel={upgrades.community} />
      <CoastalBarriers plots={plots} communityLevel={upgrades.community} />
      <Sparkles
        count={28}
        scale={[26, 9, 21]}
        size={1.15}
        speed={0.12}
        color="#fff7b0"
        opacity={0.25}
        position={[0, 4.2, 0]}
      />
      <EventAtmosphere eventType={eventType} />
      <Clouds storm={storm} />
<CameraRig selectedPlot={selectedPlot} />
    </>
  )
}

function WebGLFallback() {
  return (
    <div className="webgl-fallback">
      <strong>เปิดฉาก 3D ไม่สำเร็จ</strong>
      <span>โปรดเปิด Hardware Acceleration ในเบราว์เซอร์แล้วรีเฟรชหน้า</span>
    </div>
  )
}

export default function MangroveWorld3DNatural(props) {
  return (
    <div className="world-canvas natural-world" aria-label="ฉากป่าชายเลนสามมิติแบบโต้ตอบ">
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.55]}
        camera={{ position: [20, 18, 22], zoom: 36, near: 0.1, far: 140 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        fallback={<WebGLFallback />}
        onPointerMissed={() => props.onClearSelection?.()}
      >
        <WorldScene {...props} />
      </Canvas>
    </div>
  )
}
