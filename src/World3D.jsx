import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(17, 15, 19)
const DEFAULT_TARGET = new THREE.Vector3(-0.5, 0.5, -0.2)

const PALETTE = {
  grass: 0x78bd3d,
  grassLight: 0x9bd653,
  grassDark: 0x4f922c,
  earth: 0x8a5a32,
  earthDark: 0x684326,
  mud: 0x9b6a43,
  mudWet: 0x7f5b43,
  sand: 0xd9ba73,
  water: 0x36bfe5,
  waterDeep: 0x167cae,
  wood: 0x8a572e,
  woodLight: 0xc98745,
  roof: 0xe65331,
  roofLight: 0xff7b3d,
  cream: 0xfff1be,
  white: 0xffffff,
  leafRhizophora: 0x2e8f45,
  leafAvicennia: 0x62ad50,
  leafSonneratia: 0x48a95b,
  leafLow: 0xb8a944,
  trunk: 0x75472c,
  root: 0x925933,
  selection: 0xffdc4a,
}

function seeded(seed = 1) {
  let value = Math.sin(seed * 999.91) * 43758.5453
  return () => {
    value = Math.sin(value * 12.9898 + 78.233) * 43758.5453
    return value - Math.floor(value)
  }
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.02,
    flatShading: true,
    ...options,
  })
}

function markShadow(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return object
}

function cylinderBetween(start, end, radius, mat, radialSegments = 7) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, length, radialSegments),
    mat,
  )
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addBlob(group, position, scale, mat, detail = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.copy(position)
  mesh.scale.copy(scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function createIsland() {
  const group = new THREE.Group()
  group.name = 'island'

  const cliffMat = material(PALETTE.earthDark)
  const earthMat = material(PALETTE.earth)
  const sandMat = material(PALETTE.sand)
  const grassMat = material(PALETTE.grass)
  const grassLightMat = material(PALETTE.grassLight)

  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(10.95, 11.65, 1.5, 64),
    cliffMat,
  )
  cliff.position.y = -0.23
  cliff.scale.z = 0.72
  cliff.receiveShadow = true
  group.add(cliff)

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(10.9, 11.15, 0.66, 64),
    earthMat,
  )
  soil.position.y = 0.53
  soil.scale.z = 0.72
  soil.receiveShadow = true
  group.add(soil)

  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(10.74, 10.95, 0.18, 64),
    sandMat,
  )
  beach.position.y = 0.91
  beach.scale.z = 0.72
  beach.receiveShadow = true
  group.add(beach)

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(10.35, 10.62, 0.24, 64),
    grassMat,
  )
  grass.position.y = 1.09
  grass.scale.z = 0.70
  grass.receiveShadow = true
  group.add(grass)

  const rand = seeded(77)
  for (let i = 0; i < 34; i += 1) {
    const angle = rand() * Math.PI * 2
    const radius = 2.5 + rand() * 7
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius * 0.66
    if (x > 2.8 && z > -1.7) continue
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(0.25 + rand() * 0.62, 14),
      rand() > 0.45 ? grassLightMat : material(PALETTE.grassDark, { transparent: true, opacity: 0.42 }),
    )
    patch.rotation.x = -Math.PI / 2
    patch.rotation.z = rand() * Math.PI
    patch.scale.set(1.4 + rand(), 0.45 + rand() * 0.5, 1)
    patch.position.set(x, 1.225, z)
    patch.receiveShadow = true
    group.add(patch)
  }

  return group
}

function createWater() {
  const geometry = new THREE.PlaneGeometry(70, 70, 80, 80)
  geometry.rotateX(-Math.PI / 2)

  const uniforms = {
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color(PALETTE.water) },
    uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        float w1 = sin((p.x + uTime * 1.35) * 0.42) * 0.10;
        float w2 = cos((p.z - uTime * 0.92) * 0.55) * 0.07;
        float w3 = sin((p.x + p.z + uTime) * 0.22) * 0.035;
        p.y += w1 + w2 + w3;
        vWave = w1 + w2 + w3;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      varying float vWave;
      varying vec3 vWorld;
      void main() {
        float shimmer = smoothstep(-0.12, 0.18, vWave);
        float bands = sin((vWorld.x + vWorld.z) * 0.65) * 0.025;
        vec3 color = mix(uDeep, uShallow, 0.56 + shimmer * 0.24 + bands);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.y = -0.95
  mesh.receiveShadow = true
  mesh.userData.uniforms = uniforms
  return mesh
}

function createCloud(seed, x, y, z, scale = 1) {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const cloudMat = material(0xffffff, {
    roughness: 1,
    transparent: true,
    opacity: 0.88,
  })
  for (let i = 0; i < 6; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      cloudMat,
    )
    puff.position.set((i - 2.5) * 0.65, rand() * 0.45, (rand() - 0.5) * 0.55)
    puff.scale.set(0.8 + rand() * 0.65, 0.55 + rand() * 0.38, 0.65 + rand() * 0.35)
    group.add(puff)
  }
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  group.userData.speed = 0.11 + rand() * 0.08
  group.userData.cloud = true
  return group
}

function createHut() {
  const group = new THREE.Group()
  group.name = 'nursery-hut'

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.32, 2.45),
    material(PALETTE.wood),
  )
  base.position.y = 1.32
  group.add(base)

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 1.7, 2.05),
    material(PALETTE.cream),
  )
  wall.position.y = 2.28
  group.add(wall)

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.15, 1.22, 4),
    material(PALETTE.roof),
  )
  roof.rotation.y = Math.PI / 4
  roof.scale.z = 0.78
  roof.position.y = 3.72
  group.add(roof)

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 0.18, 1.2),
    material(PALETTE.roofLight),
  )
  awning.rotation.x = -0.2
  awning.position.set(0, 2.65, 1.42)
  group.add(awning)

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.2, 0.08),
    material(PALETTE.wood),
  )
  door.position.set(0.35, 1.95, 1.065)
  group.add(door)

  const windowMat = material(0x55c9df, { roughness: 0.25 })
  const windowA = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.08), windowMat)
  windowA.position.set(-0.65, 2.35, 1.07)
  group.add(windowA)

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.45, 0.12),
    material(0xf4c94e),
  )
  sign.position.set(-0.1, 3.12, 1.16)
  group.add(sign)

  const postMat = material(PALETTE.wood)
  for (const x of [-1.35, 1.35]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), postMat)
    post.position.set(x, 1.35, 1.6)
    group.add(post)
  }

  group.position.set(5.0, 0, 1.5)
  group.rotation.y = -0.22
  return markShadow(group)
}

function createDock() {
  const group = new THREE.Group()
  const plankMat = material(PALETTE.woodLight)
  const railMat = material(PALETTE.wood)

  for (let i = 0; i < 11; i += 1) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.15, 1.25),
      plankMat,
    )
    plank.position.set(6.0 + i * 0.5, 0.63 - i * 0.045, -3.1)
    plank.rotation.y = 0.02 * Math.sin(i)
    group.add(plank)
  }

  for (const side of [-0.72, 0.72]) {
    for (let i = 0; i < 6; i += 1) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6),
        railMat,
      )
      post.position.set(6.0 + i * 1.0, 0.86 - i * 0.09, -3.1 + side)
      group.add(post)
    }
  }

  return markShadow(group)
}

function createBoat() {
  const group = new THREE.Group()
  group.name = 'boat'

  const hull = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 2.0, 4, 10),
    material(0xef5c36),
  )
  hull.rotation.z = Math.PI / 2
  hull.scale.y = 0.45
  group.add(hull)

  const inside = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.25, 0.5),
    material(0x7a3c25),
  )
  inside.position.y = 0.27
  group.add(inside)

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 2.2, 6),
    material(PALETTE.wood),
  )
  pole.position.set(0.15, 1.1, 0)
  group.add(pole)

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.48),
    material(0xffdc4a, { side: THREE.DoubleSide }),
  )
  flag.position.set(0.55, 1.68, 0)
  group.add(flag)

  group.position.set(11.0, -0.48, -3.2)
  group.rotation.y = -0.17
  group.userData.boat = true
  return markShadow(group)
}

function createBoardwalk() {
  const group = new THREE.Group()
  const wood = material(PALETTE.woodLight)
  const dark = material(PALETTE.wood)
  const points = [
    [3.3, 0.4],
    [2.8, -0.3],
    [3.0, -1.0],
    [3.8, -1.6],
    [4.7, -2.2],
    [5.5, -2.7],
  ]
  points.forEach(([x, z], index) => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.52), wood)
    plank.position.set(x, 1.28 - index * 0.03, z)
    plank.rotation.y = -0.55 + index * 0.1
    group.add(plank)

    if (index % 2 === 0) {
      for (const side of [-0.48, 0.48]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.8, 6), dark)
        post.position.set(x + side, 1.52 - index * 0.03, z)
        group.add(post)
      }
    }
  })
  return markShadow(group)
}

function createBarrier(level = 0) {
  const group = new THREE.Group()
  group.name = 'coastal-barrier'
  if (level <= 0) return group

  const logMat = material(PALETTE.wood)
  const count = 5 + level * 3
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1)
    const x = -7.4 + t * 8.7
    const z = -4.65 + Math.sin(t * Math.PI) * 0.35
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 1.15 + level * 0.08, 7),
      logMat,
    )
    log.position.set(x, 0.38, z)
    log.rotation.z = Math.PI / 2
    log.rotation.y = 0.12 * Math.sin(i)
    group.add(log)

    const peg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.05, 6),
      logMat,
    )
    peg.position.set(x, 0.22, z + 0.12)
    group.add(peg)
  }
  return markShadow(group)
}

function createNurseryBeds(level = 0) {
  const group = new THREE.Group()
  group.name = 'nursery-beds'
  const beds = 1 + level
  for (let i = 0; i < beds; i += 1) {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.18, 0.72),
      material(PALETTE.earth),
    )
    bed.position.set(4.1 + (i % 2) * 1.55, 1.29, 3.55 + Math.floor(i / 2) * 0.9)
    group.add(bed)
    for (let j = 0; j < 6; j += 1) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 0.32, 5),
        material(PALETTE.trunk),
      )
      stem.position.set(
        bed.position.x - 0.55 + (j % 3) * 0.55,
        1.53,
        bed.position.z - 0.22 + Math.floor(j / 3) * 0.42,
      )
      group.add(stem)
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.14, 0),
        material(PALETTE.grassLight),
      )
      leaf.position.set(stem.position.x, 1.73, stem.position.z)
      group.add(leaf)
    }
  }
  return markShadow(group)
}

function createDrone(level = 0) {
  const group = new THREE.Group()
  group.name = 'drone'
  if (level <= 0) return group

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.38),
    material(0xf1f5f2),
  )
  group.add(body)

  const armMat = material(0x335268)
  const rotorMat = material(0x1d2c35, { transparent: true, opacity: 0.72 })
  for (const [x, z] of [[-0.48, -0.4], [0.48, -0.4], [-0.48, 0.4], [0.48, 0.4]]) {
    group.add(cylinderBetween(
      new THREE.Vector3(x * 0.2, 0, z * 0.2),
      new THREE.Vector3(x, 0, z),
      0.035,
      armMat,
      5,
    ))
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.018, 18), rotorMat)
    rotor.position.set(x, 0.03, z)
    group.add(rotor)
  }

  const camera = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    material(0x263d4a),
  )
  camera.position.y = -0.18
  group.add(camera)

  group.position.set(1.8, 6.1, 1.0)
  group.userData.drone = true
  return markShadow(group)
}

function createCommunityMarket(level = 0) {
  const group = new THREE.Group()
  group.name = 'community-market'
  if (level <= 0) return group

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.18, 0.9),
    material(PALETTE.woodLight),
  )
  table.position.set(6.25, 1.55, -0.25)
  group.add(table)

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.16, 1.25),
    material(level >= 2 ? 0xffc43e : 0xf06d45),
  )
  canopy.position.set(6.25, 2.9, -0.25)
  group.add(canopy)

  for (const x of [5.45, 7.05]) {
    for (const z of [-0.65, 0.15]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 1.5, 6),
        material(PALETTE.wood),
      )
      post.position.set(x, 2.2, z)
      group.add(post)
    }
  }

  if (level >= 2) {
    for (let i = 0; i < 5; i += 1) {
      const basket = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 5),
        material(i % 2 ? 0x5aab4d : 0xed7b39),
      )
      basket.position.set(5.65 + i * 0.3, 1.82, -0.2 + (i % 2) * 0.2)
      group.add(basket)
    }
  }

  return markShadow(group)
}

function createPerson(seed, x, z, shirtColor = 0x3e8ed0) {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.38, 3, 7),
    material(shirtColor),
  )
  body.position.y = 0.48
  group.add(body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    material(0xe5a96f),
  )
  head.position.y = 0.93
  group.add(head)
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.08, 12),
    material(0xf4c94e),
  )
  hat.position.y = 1.09
  group.add(hat)
  group.position.set(x, 1.23, z)
  group.rotation.y = rand() * Math.PI * 2
  group.userData.person = true
  group.userData.phase = rand() * Math.PI * 2
  return markShadow(group)
}

function createCrab(seed, x, z) {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const crabMat = material(0xf05b42)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 5), crabMat)
  body.scale.set(1.3, 0.55, 1)
  group.add(body)
  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 4), crabMat)
    claw.position.set(side * 0.19, 0.03, 0.08)
    group.add(claw)
    for (let i = 0; i < 3; i += 1) {
      const leg = cylinderBetween(
        new THREE.Vector3(side * 0.08, 0, (i - 1) * 0.07),
        new THREE.Vector3(side * (0.23 + rand() * 0.08), -0.03, (i - 1) * 0.14),
        0.012,
        crabMat,
        4,
      )
      group.add(leg)
    }
  }
  group.position.set(x, 1.25, z)
  group.userData.crab = true
  group.userData.phase = rand() * Math.PI * 2
  return group
}

function createBird(seed, x, y, z) {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const birdMat = material(0xf9f5e8)
  group.add(cylinderBetween(
    new THREE.Vector3(-0.38, 0, 0),
    new THREE.Vector3(0, 0.06, 0),
    0.035,
    birdMat,
    5,
  ))
  group.add(cylinderBetween(
    new THREE.Vector3(0, 0.06, 0),
    new THREE.Vector3(0.38, 0, 0),
    0.035,
    birdMat,
    5,
  ))
  group.position.set(x, y, z)
  group.userData.bird = true
  group.userData.phase = rand() * Math.PI * 2
  group.userData.radius = 2.5 + rand() * 2
  return group
}

function createRock(seed, x, z, scale = 1) {
  const rand = seeded(seed)
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.45 + rand() * 0.3, 0),
    material(rand() > 0.5 ? 0x77877d : 0x8d978d),
  )
  rock.position.set(x, 1.14, z)
  rock.scale.set(scale, scale * (0.55 + rand() * 0.35), scale * (0.7 + rand() * 0.4))
  rock.rotation.set(rand(), rand(), rand())
  rock.castShadow = true
  rock.receiveShadow = true
  return rock
}

function createReeds(seed, x, z, count = 6) {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const reedMat = material(0x5b9e3a)
  for (let i = 0; i < count; i += 1) {
    const height = 0.38 + rand() * 0.55
    const reed = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, height, 5),
      reedMat,
    )
    reed.position.set((rand() - 0.5) * 0.55, height * 0.5, (rand() - 0.5) * 0.55)
    reed.rotation.z = (rand() - 0.5) * 0.15
    group.add(reed)
  }
  group.position.set(x, 1.2, z)
  return markShadow(group)
}

function createPlotPatch(plot, index) {
  const group = new THREE.Group()
  group.position.set(plot.x, 1.235, plot.z)

  const patchMat = material(index % 3 === 0 ? PALETTE.mudWet : PALETTE.mud, {
    roughness: 1,
  })
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(0.68 + (index % 4) * 0.025, 24),
    patchMat,
  )
  patch.rotation.x = -Math.PI / 2
  patch.rotation.z = (index * 0.71) % Math.PI
  patch.scale.set(1.22 + (index % 2) * 0.1, 0.84 + (index % 3) * 0.05, 1)
  patch.receiveShadow = true
  group.add(patch)

  const hit = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 24),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  hit.rotation.x = -Math.PI / 2
  hit.position.y = 0.08
  hit.userData.plotId = plot.id
  group.add(hit)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.73, 0.86, 32),
    new THREE.MeshBasicMaterial({
      color: PALETTE.selection,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.095
  ring.userData.selectionRing = true
  group.add(ring)

  group.userData.hit = hit
  group.userData.ring = ring
  group.userData.plotId = plot.id
  return group
}

function createMangrove(plot) {
  const group = new THREE.Group()
  group.name = `tree-${plot.id}`
  const rand = seeded(plot.id * 113 + plot.age * 7)
  const ageScale = plot.age < 2 ? 0.26 : plot.age < 5 ? 0.54 : Math.min(1.05, 0.82 + plot.age * 0.018)
  const healthScale = Math.max(0.55, plot.health / 100)
  const totalScale = ageScale * (0.82 + healthScale * 0.18)

  const trunkMat = material(plot.dead ? 0x776354 : PALETTE.trunk)
  const rootMat = material(plot.dead ? 0x6d5b4f : PALETTE.root)
  const lowHealth = plot.health < 45
  const leafColor = lowHealth
    ? PALETTE.leafLow
    : plot.species === 'rhizophora'
      ? PALETTE.leafRhizophora
      : plot.species === 'avicennia'
        ? PALETTE.leafAvicennia
        : PALETTE.leafSonneratia
  const leafMat = material(leafColor)

  const trunkHeight = 2.15 + rand() * 0.5
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.20, trunkHeight, 7),
    trunkMat,
  )
  trunk.position.y = trunkHeight * 0.5
  trunk.rotation.z = (rand() - 0.5) * 0.08
  group.add(trunk)

  if (plot.species === 'rhizophora') {
    const roots = plot.age < 2 ? 3 : 7
    for (let i = 0; i < roots; i += 1) {
      const angle = (i / roots) * Math.PI * 2 + rand() * 0.3
      const radius = 0.62 + rand() * 0.28
      const start = new THREE.Vector3(
        Math.cos(angle) * 0.11,
        0.64 + rand() * 0.4,
        Math.sin(angle) * 0.11,
      )
      const end = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.02,
        Math.sin(angle) * radius,
      )
      group.add(cylinderBetween(start, end, 0.04 + rand() * 0.02, rootMat, 5))
    }
  } else if (plot.species === 'avicennia') {
    const spikes = plot.age < 2 ? 4 : 13
    for (let i = 0; i < spikes; i += 1) {
      const angle = (i / spikes) * Math.PI * 2 + rand() * 0.5
      const radius = 0.35 + rand() * 0.5
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.18 + rand() * 0.2, 5),
        rootMat,
      )
      spike.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius)
      group.add(spike)
    }
  } else {
    const branches = plot.age < 2 ? 2 : 5
    for (let i = 0; i < branches; i += 1) {
      const angle = (i / branches) * Math.PI * 2 + rand() * 0.4
      group.add(cylinderBetween(
        new THREE.Vector3(0, 1.1 + rand() * 0.4, 0),
        new THREE.Vector3(Math.cos(angle) * 0.65, 1.6 + rand() * 0.45, Math.sin(angle) * 0.65),
        0.055,
        trunkMat,
        6,
      ))
    }
  }

  if (!plot.dead) {
    const canopyCount = plot.age < 2 ? 2 : plot.age < 5 ? 4 : 7
    for (let i = 0; i < canopyCount; i += 1) {
      const angle = (i / canopyCount) * Math.PI * 2 + rand() * 0.45
      const radius = plot.age < 2 ? 0.18 : 0.34 + rand() * 0.34
      addBlob(
        group,
        new THREE.Vector3(
          Math.cos(angle) * radius,
          trunkHeight - 0.1 + (rand() - 0.5) * 0.6,
          Math.sin(angle) * radius,
        ),
        new THREE.Vector3(
          0.64 + rand() * 0.28,
          0.48 + rand() * 0.23,
          0.58 + rand() * 0.28,
        ),
        leafMat,
        1,
      )
    }

    if (plot.species === 'sonneratia' && plot.age >= 5) {
      const flowerMat = material(0xffd8e7)
      for (let i = 0; i < 4; i += 1) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), flowerMat)
        flower.position.set((rand() - 0.5) * 1.1, trunkHeight + rand() * 0.5, (rand() - 0.5) * 1.1)
        group.add(flower)
      }
    }
  } else {
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2
      group.add(cylinderBetween(
        new THREE.Vector3(0, 1.1 + i * 0.1, 0),
        new THREE.Vector3(Math.cos(angle) * 0.7, 1.7 + rand() * 0.4, Math.sin(angle) * 0.7),
        0.045,
        trunkMat,
        5,
      ))
    }
  }

  group.scale.setScalar(totalScale)
  group.position.set(plot.x, 1.26, plot.z)
  group.rotation.y = rand() * Math.PI * 2
  group.userData.sway = !plot.dead
  group.userData.phase = rand() * Math.PI * 2
  group.userData.baseRotation = group.rotation.y
  return markShadow(group)
}

function disposeGroup(group) {
  group.traverse((object) => {
    if (object.geometry) object.geometry.dispose()
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((mat) => mat.dispose())
    }
  })
  group.clear()
}

const World3D = forwardRef(function World3D(
  {
    plots,
    selectedPlotId,
    biodiversity,
    community,
    coastal,
    upgrades,
    activeEvent,
    onPlotClick,
    onPlotHover,
  },
  ref,
) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const plotGroupsRef = useRef(new Map())
  const treeGroupRef = useRef(null)
  const upgradeGroupRef = useRef(null)
  const faunaGroupRef = useRef(null)
  const latestHandlersRef = useRef({ onPlotClick, onPlotHover })
  const activeEventRef = useRef(activeEvent)
  const [webglError, setWebglError] = useState('')

  useEffect(() => {
    latestHandlersRef.current = { onPlotClick, onPlotHover }
  }, [onPlotClick, onPlotHover])

  useEffect(() => {
    activeEventRef.current = activeEvent
  }, [activeEvent])

  useImperativeHandle(ref, () => ({
    resetCamera() {
      const camera = cameraRef.current
      const controls = controlsRef.current
      if (!camera || !controls) return
      camera.position.copy(DEFAULT_CAMERA_POSITION)
      camera.zoom = 1
      camera.updateProjectionMatrix()
      controls.target.copy(DEFAULT_TARGET)
      controls.update()
    },
    zoomIn() {
      const camera = cameraRef.current
      if (!camera) return
      camera.zoom = Math.min(2.2, camera.zoom + 0.18)
      camera.updateProjectionMatrix()
    },
    zoomOut() {
      const camera = cameraRef.current
      if (!camera) return
      camera.zoom = Math.max(0.72, camera.zoom - 0.18)
      camera.updateProjectionMatrix()
    },
    focusPlot(plotId) {
      const plot = plots.find((item) => item.id === plotId)
      const controls = controlsRef.current
      if (!plot || !controls) return
      controls.target.set(plot.x, 1.2, plot.z)
      controls.update()
    },
  }), [plots])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    } catch {
      setWebglError('อุปกรณ์นี้ไม่สามารถเปิด WebGL ได้ กรุณาเปิด Hardware Acceleration แล้วโหลดใหม่')
      return undefined
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x8edcff)
    scene.fog = new THREE.Fog(0x8edcff, 31, 59)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'world-canvas'
    renderer.domElement.setAttribute('aria-label', 'โลกสามมิติของโครงการฟื้นฟูป่าชายเลน')
    mount.appendChild(renderer.domElement)

    const aspect = Math.max(0.3, mount.clientWidth / Math.max(1, mount.clientHeight))
    const frustum = 18
    const camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      120,
    )
    camera.position.copy(DEFAULT_CAMERA_POSITION)
    camera.lookAt(DEFAULT_TARGET)
    camera.zoom = 1
    camera.updateProjectionMatrix()

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.minZoom = 0.72
    controls.maxZoom = 2.2
    controls.minPolarAngle = Math.PI * 0.20
    controls.maxPolarAngle = Math.PI * 0.46
    controls.target.copy(DEFAULT_TARGET)
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
    controls.touches.ONE = THREE.TOUCH.PAN
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE
    controls.update()

    const hemi = new THREE.HemisphereLight(0xd9f4ff, 0x6a4e2e, 2.2)
    scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff2c6, 3.2)
    sun.position.set(-10, 19, 11)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -18
    sun.shadow.camera.right = 18
    sun.shadow.camera.top = 18
    sun.shadow.camera.bottom = -18
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 55
    sun.shadow.bias = -0.0007
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0x9ad9ff, 0.85)
    fill.position.set(15, 8, -15)
    scene.add(fill)

    const water = createWater()
    scene.add(water)
    scene.add(createIsland())
    scene.add(createHut())
    scene.add(createDock())
    scene.add(createBoardwalk())

    const plotContainer = new THREE.Group()
    const plotMap = new Map()
    plots.forEach((plot, index) => {
      const plotGroup = createPlotPatch(plot, index)
      plotContainer.add(plotGroup)
      plotMap.set(plot.id, plotGroup)
    })
    scene.add(plotContainer)
    plotGroupsRef.current = plotMap

    const staticDecor = new THREE.Group()
    ;[
      [-8.6, -1.7, 0.7], [-8.0, 2.2, 0.9], [-6.6, 4.15, 0.65],
      [7.9, 3.6, 0.72], [8.6, -0.5, 0.8], [4.0, -4.2, 0.55],
    ].forEach(([x, z, scale], index) => staticDecor.add(createRock(200 + index, x, z, scale)))
    ;[
      [-8.5, -3.5], [-7.8, -3.9], [-6.9, -4.2], [2.5, -4.5],
      [7.8, -2.0], [8.5, 1.8], [-8.2, 0.6],
    ].forEach(([x, z], index) => staticDecor.add(createReeds(500 + index, x, z, 5 + (index % 4))))
    scene.add(staticDecor)

    const cloudGroup = new THREE.Group()
    cloudGroup.name = 'clouds'
    cloudGroup.add(
      createCloud(1, -13, 12.0, -10, 1.1),
      createCloud(2, 4, 13.2, -13, 0.9),
      createCloud(3, 13, 11.3, 0, 1.25),
    )
    scene.add(cloudGroup)

    const boat = createBoat()
    scene.add(boat)

    const treeGroup = new THREE.Group()
    treeGroup.name = 'dynamic-trees'
    treeGroupRef.current = treeGroup
    scene.add(treeGroup)

    const upgradeGroup = new THREE.Group()
    upgradeGroup.name = 'dynamic-upgrades'
    upgradeGroupRef.current = upgradeGroup
    scene.add(upgradeGroup)

    const faunaGroup = new THREE.Group()
    faunaGroup.name = 'dynamic-fauna'
    faunaGroupRef.current = faunaGroup
    scene.add(faunaGroup)

    const environmentGroup = new THREE.Group()
    environmentGroup.name = 'weather'
    const rainGeometry = new THREE.BufferGeometry()
    const rainPositions = new Float32Array(360 * 3)
    const rainRand = seeded(901)
    for (let i = 0; i < 360; i += 1) {
      rainPositions[i * 3] = (rainRand() - 0.5) * 30
      rainPositions[i * 3 + 1] = 3 + rainRand() * 16
      rainPositions[i * 3 + 2] = (rainRand() - 0.5) * 22
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
    const rain = new THREE.Points(
      rainGeometry,
      new THREE.PointsMaterial({
        color: 0xd7f2ff,
        size: 0.07,
        transparent: true,
        opacity: 0.72,
      }),
    )
    rain.visible = false
    rain.userData.rain = true
    environmentGroup.add(rain)
    scene.add(environmentGroup)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const hitMeshes = [...plotMap.values()].map((group) => group.userData.hit)
    let pointerDown = null
    let hovered = null

    const updatePointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const pickPlot = (event) => {
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(hitMeshes, false)[0]
      return hit?.object?.userData?.plotId ?? null
    }

    const handlePointerMove = (event) => {
      const plotId = pickPlot(event)
      if (hovered !== plotId) {
        hovered = plotId
        renderer.domElement.style.cursor = plotId ? 'pointer' : 'grab'
        latestHandlersRef.current.onPlotHover?.(plotId)
      }
    }

    const handlePointerDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY }
    }

    const handlePointerUp = (event) => {
      if (!pointerDown) return
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)
      pointerDown = null
      if (distance > 7) return
      const plotId = pickPlot(event)
      if (plotId) latestHandlersRef.current.onPlotClick?.(plotId)
    }

    const handleContextLost = (event) => {
      event.preventDefault()
      setWebglError('กราฟิก 3D หยุดทำงานชั่วคราว กรุณาโหลดหน้าใหม่')
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost)

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera
    controlsRef.current = controls

    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      const nextAspect = width / height
      camera.left = (-frustum * nextAspect) / 2
      camera.right = (frustum * nextAspect) / 2
      camera.top = frustum / 2
      camera.bottom = -frustum / 2
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const clock = new THREE.Clock()
    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const delta = Math.min(0.04, clock.getDelta())
      const elapsed = clock.elapsedTime

      water.userData.uniforms.uTime.value = elapsed

      cloudGroup.children.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * delta
        if (cloud.position.x > 18) cloud.position.x = -18
      })

      boat.position.y = -0.50 + Math.sin(elapsed * 1.3) * 0.08
      boat.rotation.z = Math.sin(elapsed * 0.85) * 0.025

      treeGroup.children.forEach((tree) => {
        if (!tree.userData.sway) return
        tree.rotation.z = Math.sin(elapsed * 0.8 + tree.userData.phase) * 0.013
        tree.rotation.x = Math.cos(elapsed * 0.65 + tree.userData.phase) * 0.008
      })

      upgradeGroup.children.forEach((object) => {
        if (object.userData.drone) {
          object.position.y = 5.9 + Math.sin(elapsed * 1.6) * 0.3
          object.position.x = 1.5 + Math.cos(elapsed * 0.28) * 2.2
          object.position.z = 0.4 + Math.sin(elapsed * 0.28) * 1.5
          object.rotation.y += delta * 0.7
          object.children.forEach((child) => {
            if (child.geometry?.type === 'CylinderGeometry' && child.scale.y < 0.2) {
              child.rotation.y += delta * 18
            }
          })
        }
        if (object.userData.person) {
          object.position.y = 1.23 + Math.sin(elapsed * 1.8 + object.userData.phase) * 0.025
        }
      })

      faunaGroup.children.forEach((animal, index) => {
        if (animal.userData.crab) {
          animal.position.x += Math.sin(elapsed * 0.45 + animal.userData.phase) * 0.0015
          animal.rotation.y = Math.sin(elapsed * 0.5 + animal.userData.phase) * 0.4
        }
        if (animal.userData.bird) {
          const angle = elapsed * 0.13 + animal.userData.phase
          animal.position.x = Math.cos(angle) * animal.userData.radius - 1
          animal.position.z = Math.sin(angle) * animal.userData.radius * 0.62
          animal.position.y = 7.2 + index * 0.35 + Math.sin(elapsed * 0.8 + index) * 0.2
          animal.rotation.y = -angle
        }
      })

      const storm = activeEventRef.current?.id === 'storm'
      rain.visible = storm
      if (storm) {
        const positions = rain.geometry.attributes.position
        for (let i = 0; i < positions.count; i += 1) {
          let y = positions.getY(i) - delta * 11
          if (y < -0.8) y = 13 + Math.random() * 6
          positions.setY(i, y)
        }
        positions.needsUpdate = true
        scene.background.lerp(new THREE.Color(0x708da5), 0.025)
        scene.fog.color.lerp(new THREE.Color(0x708da5), 0.025)
        sun.intensity = THREE.MathUtils.lerp(sun.intensity, 1.1, 0.04)
      } else {
        scene.background.lerp(new THREE.Color(0x8edcff), 0.025)
        scene.fog.color.lerp(new THREE.Color(0x8edcff), 0.025)
        sun.intensity = THREE.MathUtils.lerp(sun.intensity, 3.2, 0.04)
      }

      plotMap.forEach((plotGroup) => {
        const ring = plotGroup.userData.ring
        if (ring.material.opacity > 0.01) {
          ring.rotation.z += delta * 0.35
          const pulse = 1 + Math.sin(elapsed * 2.6) * 0.045
          ring.scale.setScalar(pulse)
        }
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
      controls.dispose()
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((mat) => mat.dispose())
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
    }
  }, [])

  useEffect(() => {
    const treeGroup = treeGroupRef.current
    if (!treeGroup) return
    disposeGroup(treeGroup)
    plots.forEach((plot) => {
      if (plot.species) treeGroup.add(createMangrove(plot))
    })

    plotGroupsRef.current.forEach((plotGroup, plotId) => {
      const ring = plotGroup.userData.ring
      const selected = selectedPlotId === plotId
      const plot = plots.find((item) => item.id === plotId)
      ring.material.opacity = selected ? 0.95 : plot?.species ? 0 : 0.16
      ring.material.color.setHex(selected ? PALETTE.selection : 0xeef58a)
      ring.scale.setScalar(selected ? 1.08 : 0.94)
    })
  }, [plots, selectedPlotId])

  useEffect(() => {
    const group = upgradeGroupRef.current
    if (!group) return
    disposeGroup(group)
    group.add(createNurseryBeds(upgrades?.nursery || 0))
    group.add(createBarrier(upgrades?.coastal || 0))
    group.add(createDrone(upgrades?.drone || 0))
    group.add(createCommunityMarket(upgrades?.community || 0))

    const people = Math.min(5, Math.max(1, Math.floor((community || 0) / 20) + (upgrades?.community || 0)))
    const positions = [
      [5.1, 0.2], [4.3, 2.6], [6.8, 1.0], [3.8, -1.8], [6.0, -1.7],
    ]
    for (let i = 0; i < people; i += 1) {
      group.add(createPerson(700 + i, positions[i][0], positions[i][1], [0x3e8ed0, 0xe65b4f, 0x8d62c4, 0x31a76b][i % 4]))
    }
  }, [upgrades, community, coastal])

  useEffect(() => {
    const group = faunaGroupRef.current
    if (!group) return
    disposeGroup(group)
    const count = Math.min(10, Math.floor((biodiversity || 0) / 9))
    const shoreline = [
      [-8.3, -3.1], [-7.2, -4.0], [-5.8, -4.45], [-3.7, -4.65],
      [0.2, -4.65], [2.8, -4.5], [7.8, -2.4], [8.5, 0.6],
      [-8.7, 1.1], [-7.9, 3.0],
    ]
    for (let i = 0; i < count; i += 1) {
      group.add(createCrab(900 + i, shoreline[i][0], shoreline[i][1]))
    }
    const birdCount = Math.min(4, Math.floor((biodiversity || 0) / 22))
    for (let i = 0; i < birdCount; i += 1) {
      group.add(createBird(1000 + i, 0, 7 + i * 0.4, 0))
    }
  }, [biodiversity])

  useEffect(() => {
    plotGroupsRef.current.forEach((plotGroup, plotId) => {
      const ring = plotGroup.userData.ring
      const selected = selectedPlotId === plotId
      const plot = plots.find((item) => item.id === plotId)
      ring.material.opacity = selected ? 0.95 : plot?.species ? 0 : 0.16
      ring.material.color.setHex(selected ? PALETTE.selection : 0xeef58a)
    })
  }, [selectedPlotId, plots])

  return (
    <div className="world-mount" ref={mountRef}>
      {webglError && (
        <div className="webgl-error" role="alert">
          <strong>เปิดโลก 3D ไม่สำเร็จ</strong>
          <span>{webglError}</span>
        </div>
      )}
      <div className="world-hint">ลากเพื่อเลื่อน · คลิกขวาเพื่อหมุน · เลื่อนเมาส์เพื่อซูม</div>
    </div>
  )
})

export default World3D
