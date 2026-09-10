import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Float,
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

const PLOT_X = [-4.65, -1.55, 1.55, 4.65]
const PLOT_Z = [-3.75, -1.25, 1.25, 3.75]

function pseudo(seed) {
  const value = Math.sin(seed * 999.91) * 43758.5453
  return value - Math.floor(value)
}

function plotPosition(id) {
  const index = id - 1
  return [PLOT_X[index % 4], 0.92, PLOT_Z[Math.floor(index / 4)]]
}

function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const responsiveZoom = Math.max(
      13,
      Math.min(48, Math.min(size.width / 27, size.height / 21)),
    )
    camera.position.set(18, 17, 18)
    camera.zoom = responsiveZoom
    camera.lookAt(0, 0.35, 0)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  return (
    <OrbitControls
      makeDefault
      target={[0, 0.35, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.075}
      minZoom={10}
      maxZoom={68}
      minPolarAngle={Math.PI / 4.25}
      maxPolarAngle={Math.PI / 3.05}
      minAzimuthAngle={-Math.PI * 0.75}
      maxAzimuthAngle={Math.PI * 0.75}
    />
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

function DeadTree() {
  return (
    <group position={[0, 0.25, 0]}>
      <mesh castShadow position={[0, 0.55, 0]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.08, 0.15, 1.1, 6]} />
        <meshStandardMaterial color="#77513b" roughness={1} flatShading />
      </mesh>
      <CylinderBetween start={[0, 0.82, 0]} end={[0.36, 1.18, 0.06]} radius={0.045} color="#77513b" />
      <CylinderBetween start={[0, 0.76, 0]} end={[-0.3, 1.08, -0.05]} radius={0.04} color="#77513b" />
      <CylinderBetween start={[0.02, 0.6, 0]} end={[0.18, 0.91, -0.25]} radius={0.035} color="#77513b" />
    </group>
  )
}

function MangroveTree({ plot, plotId }) {
  const group = useRef()
  const look = SPECIES_LOOK[plot.species] || SPECIES_LOOK.rhizophora
  const stageScale = plot.age < 1 ? 0.4 : plot.age < 3 ? 0.62 : plot.age < 6 ? 0.82 : 1
  const healthScale = 0.82 + (Math.max(plot.health, 10) / 100) * 0.18
  const seed = plotId * 17

  useFrame((state) => {
    if (!group.current || plot.dead) return
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.9 + seed) * 0.018
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.72 + seed) * 0.012
  })

  if (plot.dead) return <DeadTree />

  const clusters = look.canopy === 'tall'
    ? [
        [[0, 1.48, 0], [0.88, 1.18, 0.88], look.leaf],
        [[-0.32, 1.33, 0.05], [0.68, 0.92, 0.7], look.leafLight],
        [[0.34, 1.31, 0.06], [0.66, 0.88, 0.68], look.leafDark],
        [[0.04, 1.78, -0.03], [0.6, 0.72, 0.6], look.leafLight],
      ]
    : look.canopy === 'wide'
      ? [
          [[0, 1.35, 0], [1.22, 0.78, 1.05], look.leaf],
          [[-0.48, 1.28, 0.02], [0.78, 0.68, 0.76], look.leafLight],
          [[0.5, 1.28, 0], [0.8, 0.67, 0.78], look.leafDark],
          [[0.02, 1.55, -0.12], [0.76, 0.64, 0.72], look.leafLight],
        ]
      : [
          [[0, 1.42, 0], [1, 0.86, 1], look.leaf],
          [[-0.4, 1.3, 0.08], [0.76, 0.72, 0.78], look.leafLight],
          [[0.42, 1.31, -0.02], [0.76, 0.72, 0.78], look.leafDark],
          [[0.03, 1.68, 0.02], [0.72, 0.7, 0.72], look.leafLight],
        ]

  return (
    <group
      ref={group}
      position={[0, 0.25, 0]}
      rotation={[0, pseudo(seed) * Math.PI * 2, 0]}
      scale={stageScale}
    >
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.13, 0.21, 1.36, 8]} />
        <meshStandardMaterial color={look.trunk} roughness={0.9} flatShading />
      </mesh>

      {plot.species === 'rhizophora' && (
        <group>
          <CylinderBetween start={[0, 0.52, 0]} end={[0.57, 0.03, 0.1]} radius={0.055} color={look.trunk} />
          <CylinderBetween start={[0, 0.49, 0]} end={[-0.53, 0.03, 0.16]} radius={0.052} color={look.trunk} />
          <CylinderBetween start={[0.02, 0.46, 0]} end={[0.12, 0.03, -0.55]} radius={0.05} color={look.trunk} />
          <CylinderBetween start={[-0.02, 0.43, 0]} end={[-0.19, 0.03, 0.5]} radius={0.048} color={look.trunk} />
        </group>
      )}

      {plot.species === 'avicennia' && (
        <group>
          {[-0.42, -0.2, 0.08, 0.33].map((x, index) => (
            <mesh key={x} position={[x, 0.06, index % 2 ? 0.24 : -0.2]}>
              <coneGeometry args={[0.035, 0.16 + index * 0.015, 5]} />
              <meshStandardMaterial color="#9b795b" roughness={1} flatShading />
            </mesh>
          ))}
        </group>
      )}

      <group scale={healthScale}>
        {clusters.map(([position, scale, color], index) => (
          <LeafCluster key={index} position={position} scale={scale} color={color} />
        ))}
      </group>

      {plot.age >= 5 && plot.species === 'sonneratia' && (
        <group>
          <mesh position={[0.34, 1.18, 0.25]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color="#f6e7b3" />
          </mesh>
          <mesh position={[-0.3, 1.22, -0.21]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshStandardMaterial color="#f6e7b3" />
          </mesh>
        </group>
      )}
    </group>
  )
}

function EmptyPlotMarker({ activeSpecies, hovered }) {
  const ring = useRef()

  useFrame((state) => {
    if (ring.current) ring.current.rotation.z = state.clock.elapsedTime * 0.65
  })

  return (
    <group position={[0, 0.34, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.055, 8, 24]} />
        <meshStandardMaterial
          color={hovered ? '#fff8b5' : '#f7d45c'}
          emissive="#efb72d"
          emissiveIntensity={hovered ? 0.55 : 0.16}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color={SPECIES_LOOK[activeSpecies]?.leafLight || '#73c85a'} />
      </mesh>
    </group>
  )
}

function Plot3D({ plot, selected, activeSpecies, onClick }) {
  const [hovered, setHovered] = useState(false)
  const occupied = Boolean(plot.species)
  const tileColor = plot.dead ? '#9c785a' : occupied ? '#b67b43' : '#c98c4d'

  return (
    <group
      position={plotPosition(plot.id)}
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
      <RoundedBox args={[2.55, 0.3, 1.95]} radius={0.18} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial
          color={tileColor}
          emissive={selected ? '#f8c33b' : hovered ? '#ffd875' : '#000000'}
          emissiveIntensity={selected ? 0.23 : hovered ? 0.08 : 0}
          roughness={0.92}
        />
      </RoundedBox>

      {[-0.72, -0.24, 0.24, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.19, 0]} receiveShadow>
          <boxGeometry args={[0.23, 0.035, 1.15]} />
          <meshStandardMaterial color={occupied ? '#9c6438' : '#a86d3d'} roughness={1} />
        </mesh>
      ))}

      {(selected || hovered) && (
        <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.24, 1.34, 40]} />
          <meshBasicMaterial
            color={selected ? '#fff5a3' : '#ffffff'}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {occupied
        ? <MangroveTree plot={plot} plotId={plot.id} />
        : <EmptyPlotMarker activeSpecies={activeSpecies} hovered={hovered} />}
    </group>
  )
}

function Water() {
  const group = useRef()
  const ripples = useMemo(() => (
    Array.from({ length: 18 }, (_, index) => ({
      x: -17 + pseudo(index + 1) * 34,
      z: -14 + pseudo(index + 28) * 28,
      scale: 0.35 + pseudo(index + 71) * 0.85,
      speed: 0.45 + pseudo(index + 94) * 0.55,
    }))
  ), [])

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = -0.73 + Math.sin(state.clock.elapsedTime * 0.55) * 0.025
    }
  })

  return (
    <group ref={group}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 42]} />
        <meshStandardMaterial color="#49bddd" roughness={0.28} metalness={0.04} />
      </mesh>
      {ripples.map((ripple, index) => (
        <Float key={index} speed={ripple.speed} rotationIntensity={0} floatIntensity={0.14}>
          <mesh position={[ripple.x, 0.04, ripple.z]} rotation={[-Math.PI / 2, 0, 0]} scale={ripple.scale}>
            <torusGeometry args={[0.48, 0.025, 6, 22]} />
            <meshBasicMaterial color="#d9f7ff" transparent opacity={0.42} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function Terrain() {
  return (
    <group>
      <RoundedBox args={[21.8, 1.05, 17.5]} radius={1.05} smoothness={6} position={[0, -0.28, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#d8a957" roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[20.9, 0.78, 16.65]} radius={0.88} smoothness={6} position={[0, 0.08, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#79bf4d" roughness={0.92} />
      </RoundedBox>
      <RoundedBox args={[14.1, 0.16, 11.05]} radius={0.4} smoothness={4} position={[0, 0.43, 0]} receiveShadow>
        <meshStandardMaterial color="#a8d462" roughness={1} />
      </RoundedBox>
      <mesh position={[0, 0.53, -5.55]} receiveShadow>
        <boxGeometry args={[14.8, 0.08, 0.62]} />
        <meshStandardMaterial color="#e2c071" roughness={1} />
      </mesh>
      <mesh position={[0, 0.53, 5.55]} receiveShadow>
        <boxGeometry args={[14.8, 0.08, 0.62]} />
        <meshStandardMaterial color="#e2c071" roughness={1} />
      </mesh>
    </group>
  )
}

function Hut({ position, wall = '#ffd77c', roof = '#e5653c' }) {
  return (
    <group position={position}>
      <RoundedBox args={[2.25, 1.4, 1.75]} radius={0.18} smoothness={3} position={[0, 0.92, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wall} roughness={0.78} />
      </RoundedBox>
      <mesh castShadow position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.65, 0.92, 4]} />
        <meshStandardMaterial color={roof} roughness={0.84} flatShading />
      </mesh>
      <mesh position={[0, 0.84, 0.89]} castShadow>
        <boxGeometry args={[0.58, 0.96, 0.1]} />
        <meshStandardMaterial color="#86522e" roughness={1} />
      </mesh>
      <mesh position={[-0.7, 1.15, 0.9]}>
        <boxGeometry args={[0.42, 0.42, 0.08]} />
        <meshStandardMaterial color="#8ee0ef" roughness={0.35} />
      </mesh>
    </group>
  )
}

function Nursery({ level }) {
  const trays = Array.from({ length: 3 + level }, (_, index) => index)

  return (
    <group position={[-8.1, 0.47, -5.6]}>
      <Hut position={[0, 0, 0]} wall="#f6df8d" roof="#ef8f3c" />
      <group position={[1.7, 0.05, 0.1]}>
        {trays.map((index) => (
          <group key={index} position={[(index % 2) * 0.62, 0.15, Math.floor(index / 2) * 0.55 - 0.4]}>
            <mesh castShadow>
              <boxGeometry args={[0.5, 0.16, 0.42]} />
              <meshStandardMaterial color="#9c6536" roughness={1} />
            </mesh>
            <mesh position={[0, 0.21, 0]}>
              <coneGeometry args={[0.11, 0.35, 7]} />
              <meshStandardMaterial color="#45a74b" flatShading />
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
    const t = state.clock.elapsedTime * (0.32 + level * 0.035)
    if (drone.current) {
      drone.current.position.x = 6.3 + Math.cos(t) * 2.6
      drone.current.position.z = -4.6 + Math.sin(t) * 1.7
      drone.current.position.y = 4.3 + Math.sin(t * 2) * 0.22
      drone.current.rotation.y = -t + Math.PI / 2
    }
    rotors.forEach((rotor) => {
      if (rotor.current) rotor.current.rotation.y += 0.5
    })
  })

  return (
    <group ref={drone} position={[6.3, 4.3, -4.6]} scale={0.66 + level * 0.05}>
      <RoundedBox args={[0.72, 0.22, 0.5]} radius={0.1} smoothness={3} castShadow>
        <meshStandardMaterial color="#f8f8f3" roughness={0.46} metalness={0.12} />
      </RoundedBox>
      <mesh position={[0, -0.18, 0.03]} castShadow>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshStandardMaterial color="#2e4452" roughness={0.25} metalness={0.3} />
      </mesh>
      {[
        [-0.52, 0, -0.42],
        [0.52, 0, -0.42],
        [-0.52, 0, 0.42],
        [0.52, 0, 0.42],
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
      <Hut position={[8.0, 0.47, -5.55]} wall="#eaf4ff" roof="#4a9fd4" />
      <mesh position={[8.9, 2.15, -5.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 2.15, 8]} />
        <meshStandardMaterial color="#657984" roughness={0.65} metalness={0.32} />
      </mesh>
      <mesh position={[8.9, 3.26, -5.3]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.65, 0.08, 0.08]} />
        <meshStandardMaterial color="#dfeef4" metalness={0.32} />
      </mesh>
      <Drone level={level} />
    </group>
  )
}

function CommunityVillage({ level }) {
  return (
    <group position={[-8.15, 0.47, 5.45]}>
      <Hut position={[0, 0, 0]} wall="#ffd38d" roof="#e85e4b" />
      {level >= 1 && <Hut position={[2.15, 0, 0.35]} wall="#feeab0" roof="#5cb574" />}
      {level >= 2 && <Hut position={[1.0, 0, -1.75]} wall="#f7d6b8" roof="#4f92d1" />}
      <group position={[-1.52, 0.13, 0.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.72, 0.82, 0.24, 18]} />
          <meshStandardMaterial color="#caa061" roughness={1} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.52, 8]} />
          <meshStandardMaterial color="#755033" />
        </mesh>
        <mesh position={[0, 0.53, 0]}>
          <sphereGeometry args={[0.33, 12, 8]} />
          <meshStandardMaterial color="#77bd49" flatShading />
        </mesh>
      </group>
    </group>
  )
}

function Dock() {
  return (
    <group position={[8.4, -0.07, 4.95]} rotation={[0, -0.13, 0]}>
      {[0, 0.58, 1.16, 1.74].map((x) => (
        <mesh key={x} position={[x, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.14, 1.25]} />
          <meshStandardMaterial color="#9b6639" roughness={1} />
        </mesh>
      ))}
      {[0, 1.75].map((x) => (
        <mesh key={x} position={[x, -0.45, -0.45]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.15, 7]} />
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
    boat.current.position.y = -0.38 + Math.sin(state.clock.elapsedTime * 1.15) * 0.055
    boat.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.035
  })

  return (
    <group ref={boat} position={[9.6, -0.38, 5.4]} rotation={[0, -0.45, 0]}>
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
    [-8.7, 0.4, -2.4, 'avicennia', 8],
    [-9.0, 0.4, 2.2, 'rhizophora', 7],
    [-6.9, 0.4, 6.1, 'sonneratia', 9],
    [7.4, 0.4, 6.2, 'avicennia', 7],
    [9.2, 0.4, 1.85, 'rhizophora', 8],
    [9.15, 0.4, -2.25, 'sonneratia', 7],
  ]), [])

  return (
    <group>
      {trees.map(([x, y, z, species, age], index) => (
        <group key={index} position={[x, y, z]} scale={0.72 + pseudo(index + 201) * 0.25}>
          <MangroveTree plot={{ species, age, health: 96, dead: false }} plotId={100 + index} />
        </group>
      ))}
    </group>
  )
}

function Clouds() {
  const clouds = [
    [-10, 8.1, -8, 1.25],
    [8, 9.2, -11, 1],
    [12, 7.1, 3, 0.78],
  ]

  return (
    <group>
      {clouds.map(([x, y, z, scale], index) => (
        <Float key={index} speed={0.45 + index * 0.12} rotationIntensity={0.08} floatIntensity={0.38}>
          <group position={[x, y, z]} scale={scale}>
            {[
              [-0.7, 0, 0, 0.66],
              [0, 0.18, 0, 0.9],
              [0.72, 0, 0.02, 0.62],
              [0.16, -0.12, 0.08, 0.72],
            ].map(([cx, cy, cz, sphereScale], cloudIndex) => (
              <mesh key={cloudIndex} position={[cx, cy, cz]} scale={sphereScale}>
                <sphereGeometry args={[0.8, 14, 10]} />
                <meshStandardMaterial color="#ffffff" roughness={0.96} transparent opacity={0.92} />
              </mesh>
            ))}
          </group>
        </Float>
      ))}
    </group>
  )
}

function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades }) {
  return (
    <>
      <color attach="background" args={['#80d5fb']} />
      <fog attach="fog" args={['#80d5fb', 31, 58]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#f3fbff', '#73512f', 2.15]} />
      <directionalLight
        castShadow
        position={[13, 20, 10]}
        intensity={3.25}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0004}
      />

      <Water />
      <Terrain />
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

      <Sparkles
        count={38}
        scale={[22, 8, 18]}
        size={1.4}
        speed={0.16}
        color="#fff7b0"
        opacity={0.34}
        position={[0, 3.8, 0]}
      />
      <Clouds />
      <ContactShadows
        position={[0, -0.67, 0]}
        opacity={0.34}
        scale={28}
        blur={2.7}
        far={13}
        resolution={256}
      />
      <CameraRig />
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

export default function MangroveWorld3D(props) {
  return (
    <div className="world-canvas" aria-label="ฉากป่าชายเลนสามมิติแบบโต้ตอบ">
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.55]}
        camera={{ position: [18, 17, 18], zoom: 38, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        fallback={<WebGLFallback />}
        onPointerMissed={() => props.onClearSelection?.()}
      >
        <WorldScene {...props} />
      </Canvas>
    </div>
  )
}
