import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLOT_LAYOUT, SPECIES, stageFor, suitability } from './gameData.js'

const UP = new THREE.Vector3(0, 1, 0)
const DEFAULT_CAMERA = new THREE.Vector3(19, 18, 23)
const DEFAULT_TARGET = new THREE.Vector3(0, 1.1, 0)

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    flatShading: options.flatShading ?? true,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
  })
}

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  return mesh
}

function cylinderBetween(start, end, radius, mat, radialSegments = 7) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, length, radialSegments)
  const mesh = shadow(new THREE.Mesh(geometry, mat))
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize())
  return mesh
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((item) => item?.dispose?.())
    }
  })
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[group.children.length - 1]
    group.remove(child)
    disposeObject(child)
  }
}

function addCanopyBall(group, position, scale, color, darkColor, index = 0) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const leafMaterial = material(index % 3 === 0 ? darkColor : color)
  const mesh = shadow(new THREE.Mesh(geometry, leafMaterial))
  mesh.position.copy(position)
  mesh.scale.set(scale.x, scale.y, scale.z)
  mesh.rotation.set(index * 0.27, index * 0.53, index * 0.19)
  group.add(mesh)
  return mesh
}

function createMangroveTree(plot) {
  const species = SPECIES[plot.species]
  const stage = stageFor(plot)
  const group = new THREE.Group()
  group.userData.kind = 'tree'
  group.userData.swaySeed = plot.id * 0.73

  const stageScale = stage === 'seedling' ? 0.34 : stage === 'young' ? 0.68 : 1
  const healthScale = THREE.MathUtils.clamp(plot.health / 100, 0.55, 1)
  group.scale.setScalar(stageScale * healthScale)

  const trunkColor = new THREE.Color(species.colors.trunk)
  const leafColor = new THREE.Color(species.colors.leaf)
  const leafDark = new THREE.Color(species.colors.leafDark)
  if (plot.health < 55) {
    leafColor.lerp(new THREE.Color('#a78a45'), (55 - plot.health) / 75)
    leafDark.lerp(new THREE.Color('#745f35'), (55 - plot.health) / 75)
  }

  const trunkMaterial = material(trunkColor)
  const branchMaterial = material(trunkColor.clone().multiplyScalar(0.88))

  if (plot.dead) {
    const deadMaterial = material('#75543d')
    const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 2.7, 7), deadMaterial))
    trunk.position.y = 1.35
    trunk.rotation.z = 0.08
    group.add(trunk)
    ;[-0.7, 0.65].forEach((x, index) => {
      group.add(cylinderBetween(
        new THREE.Vector3(0, 1.7 + index * 0.35, 0),
        new THREE.Vector3(x, 2.65 + index * 0.15, index ? -0.2 : 0.25),
        0.08,
        deadMaterial,
      ))
    })
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5
      group.add(cylinderBetween(
        new THREE.Vector3(Math.cos(angle) * 0.65, 0.03, Math.sin(angle) * 0.65),
        new THREE.Vector3(Math.cos(angle) * 0.12, 0.72, Math.sin(angle) * 0.12),
        0.055,
        deadMaterial,
        5,
      ))
    }
    group.rotation.y = plot.id * 0.41
    return group
  }

  const trunkHeight = plot.species === 'avicennia' ? 3.3 : plot.species === 'sonneratia' ? 2.65 : 3
  const trunk = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.3, trunkHeight, 8),
    trunkMaterial,
  ))
  trunk.position.y = trunkHeight / 2
  trunk.rotation.z = (plot.id % 3 - 1) * 0.035
  group.add(trunk)

  const rootCount = plot.species === 'rhizophora' ? 8 : plot.species === 'sonneratia' ? 4 : 6
  for (let index = 0; index < rootCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rootCount + plot.id * 0.13
    const distance = plot.species === 'rhizophora' ? 0.95 : 0.68
    const rootEnd = new THREE.Vector3(Math.cos(angle) * distance, 0.03, Math.sin(angle) * distance)
    const rootStart = new THREE.Vector3(Math.cos(angle) * 0.1, 0.82 + (index % 2) * 0.2, Math.sin(angle) * 0.1)
    group.add(cylinderBetween(rootEnd, rootStart, plot.species === 'rhizophora' ? 0.055 : 0.035, branchMaterial, 5))
  }

  const branchStarts = plot.species === 'sonneratia' ? 6 : 5
  for (let index = 0; index < branchStarts; index += 1) {
    const angle = (Math.PI * 2 * index) / branchStarts + plot.id * 0.17
    const height = trunkHeight * (0.62 + (index % 2) * 0.08)
    const length = plot.species === 'sonneratia' ? 1.25 : 0.9
    group.add(cylinderBetween(
      new THREE.Vector3(0, height, 0),
      new THREE.Vector3(Math.cos(angle) * length, height + 0.55, Math.sin(angle) * length),
      0.075,
      branchMaterial,
      6,
    ))
  }

  if (plot.species === 'rhizophora') {
    const centers = [
      [-0.8, 3.25, 0.2, 0.9], [0.1, 3.65, 0, 1.05], [0.9, 3.15, -0.15, 0.88],
      [-0.2, 3.1, 0.8, 0.82], [0.25, 3.05, -0.85, 0.78],
    ]
    centers.forEach(([x, y, z, s], index) => addCanopyBall(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(s, s * 0.82, s),
      leafColor,
      leafDark,
      index,
    ))
  }

  if (plot.species === 'avicennia') {
    const centers = [
      [-0.5, 3.45, 0.1, 0.72, 1.1], [0.15, 3.95, 0, 0.82, 1.2],
      [0.65, 3.4, -0.2, 0.68, 1], [0, 3.4, 0.65, 0.68, 0.95],
    ]
    centers.forEach(([x, y, z, s, sy], index) => addCanopyBall(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(s, sy, s * 0.78),
      leafColor,
      leafDark,
      index,
    ))
  }

  if (plot.species === 'sonneratia') {
    const centers = [
      [-1, 2.95, 0, 1], [0, 3.25, 0, 1.1], [1, 2.95, 0, 1],
      [-0.45, 2.95, 0.85, 0.86], [0.5, 2.9, -0.82, 0.88],
    ]
    centers.forEach(([x, y, z, s], index) => addCanopyBall(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(s * 1.08, s * 0.72, s),
      leafColor,
      leafDark,
      index,
    ))

    const blossomMaterial = material(species.colors.accent, { roughness: 0.65 })
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7 + plot.id
      const blossom = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), blossomMaterial), false, false)
      blossom.position.set(Math.cos(angle) * 1.1, 3.2 + (index % 3) * 0.24, Math.sin(angle) * 0.82)
      group.add(blossom)
    }
  }

  group.rotation.y = plot.id * 0.47
  return group
}

function createSeedlingPreview(speciesKey, fit) {
  const species = SPECIES[speciesKey]
  const group = new THREE.Group()
  group.userData.preview = true

  const stem = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.075, 0.78, 6),
    material(species.colors.trunk, { transparent: true, opacity: 0.72 }),
  ), false, false)
  stem.position.y = 0.42
  group.add(stem)

  const leafMaterial = material(species.colors.leaf, { transparent: true, opacity: fit === 0 ? 0.42 : 0.78 })
  ;[-1, 1].forEach((side) => {
    const leaf = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 5), leafMaterial), false, false)
    leaf.scale.set(1.25, 0.45, 0.72)
    leaf.position.set(side * 0.18, 0.78, 0)
    leaf.rotation.z = side * 0.52
    group.add(leaf)
  })

  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: fit === 2 ? '#fff467' : fit === 1 ? '#ffd166' : '#ff9b74',
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.86, 36), pulseMaterial)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.04
  ring.userData.pulseRing = true
  group.add(ring)
  return group
}

function createGrassTuft(color = '#73b84e', scale = 1) {
  const group = new THREE.Group()
  const bladeMaterial = material(color)
  for (let index = 0; index < 4; index += 1) {
    const blade = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 4), bladeMaterial), false, false)
    blade.position.set((index - 1.5) * 0.07, 0.2, Math.sin(index) * 0.05)
    blade.rotation.z = (index - 1.5) * 0.09
    group.add(blade)
  }
  group.scale.setScalar(scale)
  return group
}

function soilColor(soil) {
  return {
    เลน: '#7b5f3f',
    ตะกอน: '#9a7650',
    ดินเลน: '#805f46',
    ทราย: '#c7a56c',
  }[soil] || '#8a6b49'
}

function plotHeight(tide) {
  return tide === 'ต่ำ' ? -0.02 : tide === 'กลาง' ? 0.12 : 0.27
}

function createPlotIsland(plot, state, engine) {
  const [x, z] = PLOT_LAYOUT[plot.id - 1]
  const y = plotHeight(plot.tide)
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.userData.plotId = plot.id
  group.userData.baseScale = state.selectedPlot === plot.id ? 1.055 : 1

  const baseMat = material(new THREE.Color(soilColor(plot.soil)).multiplyScalar(0.76))
  const topMat = material(soilColor(plot.soil))
  const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.77, 1.95, 0.5, 10), baseMat))
  base.position.y = 0.03
  group.add(base)

  const top = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.59, 1.72, 0.2, 10), topMat))
  top.position.y = 0.34
  group.add(top)

  const rimMaterial = material(plot.tide === 'ต่ำ' ? '#56c7da' : '#8bc75b', {
    transparent: true,
    opacity: plot.tide === 'ต่ำ' ? 0.5 : 0.75,
    emissive: state.selectedPlot === plot.id ? '#fff28c' : '#000000',
    emissiveIntensity: state.selectedPlot === plot.id ? 0.65 : 0,
  })
  const rim = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.67, 0.055, 8, 40), rimMaterial), false, false)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.46
  group.add(rim)

  if (plot.tide !== 'ต่ำ') {
    const tuftCount = plot.tide === 'สูง' ? 5 : 3
    for (let index = 0; index < tuftCount; index += 1) {
      const angle = (Math.PI * 2 * index) / tuftCount + plot.id
      const tuft = createGrassTuft(plot.tide === 'สูง' ? '#65b94c' : '#77b957', 0.75)
      tuft.position.set(Math.cos(angle) * 1.27, 0.44, Math.sin(angle) * 1.27)
      group.add(tuft)
    }
  }

  if (plot.species) {
    const tree = createMangroveTree(plot)
    tree.position.y = 0.43
    group.add(tree)
  } else {
    const fit = suitability(plot, state.selectedSpecies)
    const preview = createSeedlingPreview(state.selectedSpecies, fit)
    preview.position.y = 0.43
    group.add(preview)

    const fitMaterial = material(fit === 2 ? '#9ee85c' : fit === 1 ? '#ffd45f' : '#f38a6d', {
      emissive: fit === 2 ? '#356b19' : '#7a3e18',
      emissiveIntensity: 0.25,
    })
    for (let index = 0; index < 2; index += 1) {
      const marker = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), fitMaterial), false, false)
      marker.position.set(-0.14 + index * 0.28, 0.62, 1.2)
      marker.scale.setScalar(index < fit ? 1 : 0.62)
      if (index >= fit) marker.material = material('#6e5f50', { transparent: true, opacity: 0.5 })
      group.add(marker)
    }
  }

  const hitMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.001,
    depthWrite: false,
  })
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 1.55, 12), hitMaterial)
  hit.position.y = 0.72
  hit.userData.plotId = plot.id
  hit.renderOrder = 20
  group.add(hit)
  engine.hitTargets.push(hit)
  engine.plotGroups.set(plot.id, group)

  group.scale.setScalar(group.userData.baseScale)
  return group
}

function createHouse(x, z, scale = 1, roofColor = '#ef5d45') {
  const group = new THREE.Group()
  const wall = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2), material('#fff0b8')))
  wall.position.y = 0.85
  group.add(wall)

  const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.35, 4), material(roofColor)))
  roof.position.y = 2.15
  roof.rotation.y = Math.PI / 4
  roof.scale.z = 0.86
  group.add(roof)

  const door = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.12), material('#865138')))
  door.position.set(0, 0.55, 1.05)
  group.add(door)

  const windowMaterial = material('#78d5e8', { roughness: 0.2, emissive: '#2b8ba7', emissiveIntensity: 0.15 })
  ;[-0.78, 0.78].forEach((windowX) => {
    const windowMesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.11), windowMaterial), false, false)
    windowMesh.position.set(windowX, 1.05, 1.06)
    group.add(windowMesh)
  })

  group.position.set(x, 0.48, z)
  group.scale.setScalar(scale)
  group.rotation.y = -0.18
  return group
}

function createNursery(level) {
  const group = new THREE.Group()
  group.add(createHouse(0, 0, 0.72 + level * 0.05, '#f4a541'))

  const frameMaterial = material('#f2f0d1')
  const glassMaterial = material('#a8e3c4', { transparent: true, opacity: 0.52, roughness: 0.22, side: THREE.DoubleSide })
  const greenhouse = new THREE.Group()
  const base = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.8), material('#78b858')))
  base.position.y = 0.1
  greenhouse.add(base)
  const glass = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.2, 1.65), glassMaterial), false, true)
  glass.position.y = 0.78
  greenhouse.add(glass)
  ;[-1.12, 0, 1.12].forEach((x) => {
    const post = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.08), frameMaterial))
    post.position.set(x, 0.82, 0.82)
    greenhouse.add(post)
  })
  greenhouse.position.set(3, 0, 0.1)
  group.add(greenhouse)

  for (let row = 0; row < 1 + level; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const sprout = createSeedlingPreview(['rhizophora', 'avicennia', 'sonneratia'][column % 3], 2)
      sprout.scale.setScalar(0.3)
      sprout.position.set(2.15 + column * 0.55, 0.16, -0.48 + row * 0.7)
      group.add(sprout)
    }
  }

  group.position.set(-10.8, 0.25, 9.6)
  group.rotation.y = 0.2
  return group
}

function createDockAndBoat() {
  const group = new THREE.Group()
  const woodMaterial = material('#9b633b')
  const darkWood = material('#714429')
  for (let index = 0; index < 7; index += 1) {
    const plank = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 1.05), woodMaterial))
    plank.position.set(index * 0.68, 0.4, 0)
    group.add(plank)
    const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 7), darkWood))
    post.position.set(index * 0.68, -0.12, index % 2 ? 0.47 : -0.47)
    group.add(post)
  }

  const boat = new THREE.Group()
  const hull = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 3.2, 8, 1, false), material('#ef6b3f')))
  hull.rotation.z = Math.PI / 2
  hull.scale.z = 0.46
  boat.add(hull)
  const inner = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.3, 0.62), material('#f4c766')))
  inner.position.y = 0.2
  boat.add(inner)
  const motor = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.42), material('#4b5d67', { metalness: 0.2 })))
  motor.position.set(-1.45, 0.15, 0)
  boat.add(motor)
  boat.position.set(2.7, -0.17, -1.6)
  boat.rotation.y = -0.16
  boat.userData.boat = true
  group.add(boat)

  group.position.set(-1.8, 0, 7.9)
  group.rotation.y = -0.72
  return group
}

function createDrone(level) {
  const group = new THREE.Group()
  const bodyMaterial = material(level >= 2 ? '#ffd54f' : '#f4f7f7', { metalness: 0.1, roughness: 0.45 })
  const dark = material('#334853', { metalness: 0.2 })
  const body = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 7), bodyMaterial))
  body.scale.set(1.3, 0.55, 0.95)
  group.add(body)

  const armDirections = [[1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1]]
  armDirections.forEach(([x, , z]) => {
    const arm = cylinderBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(x * 0.72, 0, z * 0.72),
      0.045,
      dark,
      6,
    )
    group.add(arm)
    const rotor = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.025, 20), dark), false, false)
    rotor.position.set(x * 0.72, 0.08, z * 0.72)
    rotor.userData.rotor = true
    group.add(rotor)
  })

  const camera = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), material('#2c3d49', { metalness: 0.2 })))
  camera.position.set(0.25, -0.25, 0)
  group.add(camera)
  group.userData.drone = true
  group.scale.setScalar(0.72 + level * 0.07)
  return group
}

function createWorker(color = '#f4d35e') {
  const group = new THREE.Group()
  const body = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 8), material(color)))
  body.position.y = 0.45
  group.add(body)
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), material('#d79c6a')))
  head.position.y = 0.97
  group.add(head)
  const hat = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.1, 10), material('#f1a93b')))
  hat.position.y = 1.15
  group.add(hat)
  return group
}

function createCrab() {
  const group = new THREE.Group()
  const crabMaterial = material('#f05c45')
  const body = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), crabMaterial), false, false)
  body.scale.set(1.3, 0.55, 1)
  group.add(body)
  ;[-1, 1].forEach((side) => {
    for (let index = 0; index < 3; index += 1) {
      const leg = cylinderBetween(
        new THREE.Vector3(side * 0.12, 0, (index - 1) * 0.12),
        new THREE.Vector3(side * (0.42 + index * 0.03), -0.07, (index - 1) * 0.2),
        0.018,
        crabMaterial,
        5,
      )
      group.add(leg)
    }
  })
  group.userData.crab = true
  return group
}

function createFish(color = '#ffd166') {
  const group = new THREE.Group()
  const fishMaterial = material(color, { transparent: true, opacity: 0.85 })
  const body = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), fishMaterial), false, false)
  body.scale.set(1.5, 0.65, 0.65)
  group.add(body)
  const tail = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 3), fishMaterial), false, false)
  tail.rotation.z = -Math.PI / 2
  tail.position.x = -0.5
  group.add(tail)
  group.userData.fish = true
  return group
}

function createCloud(scale = 1) {
  const group = new THREE.Group()
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.86, depthWrite: false })
  const blobs = [
    [-0.7, 0, 0, 0.65], [0, 0.18, 0, 0.85], [0.75, 0, 0, 0.62], [0.1, -0.15, 0.15, 0.75],
  ]
  blobs.forEach(([x, y, z, s]) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), cloudMaterial)
    blob.position.set(x, y, z)
    blob.scale.set(s * 1.2, s * 0.65, s)
    group.add(blob)
  })
  group.scale.setScalar(scale)
  group.userData.cloud = true
  return group
}

function createMainland() {
  const group = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-20, 4.8)
  shape.bezierCurveTo(-12, 4.2, -7, 7.1, -1, 5.2)
  shape.bezierCurveTo(5, 3.8, 10, 6.6, 20, 5)
  shape.lineTo(20, 18)
  shape.lineTo(-20, 18)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.95,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.35,
    bevelThickness: 0.16,
  })
  geometry.rotateX(Math.PI / 2)
  const land = shadow(new THREE.Mesh(geometry, material('#67b84c')))
  land.position.y = 0.54
  group.add(land)

  const shoreShape = new THREE.Shape()
  shoreShape.moveTo(-19, 4.1)
  shoreShape.bezierCurveTo(-11, 3.5, -6, 6.2, -1, 4.4)
  shoreShape.bezierCurveTo(5, 3.1, 11, 5.8, 19, 4.2)
  shoreShape.lineTo(19, 6.1)
  shoreShape.bezierCurveTo(10, 7.1, 5, 4.9, -1, 6.1)
  shoreShape.bezierCurveTo(-7, 8, -12, 5.2, -19, 6)
  shoreShape.closePath()
  const shoreGeometry = new THREE.ShapeGeometry(shoreShape, 32)
  shoreGeometry.rotateX(Math.PI / 2)
  const shore = shadow(new THREE.Mesh(shoreGeometry, material('#c9a66a')), false, true)
  shore.position.y = 0.58
  group.add(shore)

  return group
}

function createStaticEnvironment(scene, engine) {
  const seabed = shadow(new THREE.Mesh(
    new THREE.PlaneGeometry(70, 62),
    material('#a5d7c4'),
  ), false, true)
  seabed.rotation.x = -Math.PI / 2
  seabed.position.y = -0.55
  scene.add(seabed)

  const waterMaterial = material('#50c8e3', {
    transparent: true,
    opacity: 0.78,
    roughness: 0.18,
    metalness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const water = shadow(new THREE.Mesh(new THREE.PlaneGeometry(72, 62, 1, 1), waterMaterial), false, true)
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.25
  water.renderOrder = 1
  water.userData.water = true
  scene.add(water)
  engine.water = water

  const mainland = createMainland()
  scene.add(mainland)

  const mudflatShape = new THREE.Shape()
  mudflatShape.moveTo(-13, -9)
  mudflatShape.bezierCurveTo(-5, -11, 4, -9.7, 13, -8)
  mudflatShape.bezierCurveTo(15, -1, 11, 5, 4, 7)
  mudflatShape.bezierCurveTo(-4, 8, -12, 5, -14, -1)
  mudflatShape.closePath()
  const mudflatGeometry = new THREE.ShapeGeometry(mudflatShape, 30)
  mudflatGeometry.rotateX(Math.PI / 2)
  const mudflat = shadow(new THREE.Mesh(
    mudflatGeometry,
    material('#806b4b', { transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
  ), false, true)
  mudflat.position.y = -0.17
  mudflat.renderOrder = 2
  scene.add(mudflat)

  const dock = createDockAndBoat()
  scene.add(dock)
  engine.boat = null
  dock.traverse((child) => {
    if (child.userData?.boat) engine.boat = child
  })

  scene.add(createHouse(9.5, 10.4, 1.1, '#e34d55'))

  const decoTreePlots = [
    { id: 101, species: 'rhizophora', age: 8, health: 100, dead: false },
    { id: 102, species: 'avicennia', age: 8, health: 100, dead: false },
    { id: 103, species: 'sonneratia', age: 8, health: 100, dead: false },
    { id: 104, species: 'rhizophora', age: 8, health: 100, dead: false },
  ]
  const decoPositions = [[-15, 8], [-6, 11.5], [3, 10], [15, 9.4]]
  decoTreePlots.forEach((plot, index) => {
    const tree = createMangroveTree(plot)
    tree.position.set(decoPositions[index][0], 0.65, decoPositions[index][1])
    tree.scale.multiplyScalar(0.65)
    scene.add(tree)
    engine.decorativeTrees.push(tree)
  })

  const cloudData = [
    [-13, 12, -8, 1.3], [4, 14, 1, 1.65], [15, 11, 8, 1.05],
  ]
  cloudData.forEach(([x, y, z, scale], index) => {
    const cloud = createCloud(scale)
    cloud.position.set(x, y, z)
    cloud.userData.speed = 0.18 + index * 0.06
    scene.add(cloud)
    engine.clouds.push(cloud)
  })

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#ffe27a' }),
  )
  sun.position.set(-18, 20, -24)
  scene.add(sun)

  const waveMaterial = new THREE.MeshBasicMaterial({ color: '#d9fbff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
  for (let index = 0; index < 16; index += 1) {
    const wave = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.68, 32, 1, 0, Math.PI * 1.2), waveMaterial.clone())
    wave.rotation.x = -Math.PI / 2
    wave.rotation.z = index * 0.7
    wave.position.set(-15 + (index * 4.3) % 30, -0.18, -11 + (index % 4) * 4.2)
    wave.userData.wave = true
    wave.userData.phase = index * 0.45
    scene.add(wave)
    engine.waves.push(wave)
  }
}

function rebuildDynamic(engine, state) {
  clearGroup(engine.plotLayer)
  clearGroup(engine.featureLayer)
  engine.hitTargets = []
  engine.plotGroups.clear()

  state.plots.forEach((plot) => {
    engine.plotLayer.add(createPlotIsland(plot, state, engine))
  })

  const nursery = createNursery(state.upgrades.nursery)
  engine.featureLayer.add(nursery)

  const drone = createDrone(state.upgrades.drone)
  drone.position.set(0, 6.8, 0)
  drone.visible = state.upgrades.drone > 0 || state.mrvActive
  engine.featureLayer.add(drone)
  engine.drone = drone

  const workerCount = Math.min(5, 1 + state.upgrades.community + Math.floor(state.community / 28))
  for (let index = 0; index < workerCount; index += 1) {
    const worker = createWorker(['#f4d35e', '#63c7ed', '#ef7d6a'][index % 3])
    worker.position.set(-8.8 + index * 1.05, 0.62, 7.2 + Math.sin(index) * 0.55)
    worker.rotation.y = 0.4 + index * 0.3
    worker.userData.worker = true
    worker.userData.phase = index
    engine.featureLayer.add(worker)
  }

  const barrierCount = Math.min(12, Math.floor(state.coastal / 7) + state.upgrades.community)
  const postMaterial = material('#9a5f35')
  for (let index = 0; index < barrierCount; index += 1) {
    const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.45, 7), postMaterial))
    post.position.set(-10 + index * 1.65, 0.25, -9.1 + Math.sin(index * 0.8) * 0.6)
    post.rotation.z = (index % 2 ? 1 : -1) * 0.08
    engine.featureLayer.add(post)
  }

  if (state.biodiversity >= 18) {
    const crabCount = Math.min(6, 1 + Math.floor((state.biodiversity - 18) / 12))
    for (let index = 0; index < crabCount; index += 1) {
      const crab = createCrab()
      crab.position.set(-9 + index * 3.1, 0.28, -8 + (index % 2) * 1.1)
      crab.scale.setScalar(0.65)
      crab.userData.phase = index * 0.7
      engine.featureLayer.add(crab)
    }
  }

  if (state.biodiversity >= 32) {
    const fishCount = Math.min(8, 2 + Math.floor((state.biodiversity - 32) / 9))
    for (let index = 0; index < fishCount; index += 1) {
      const fish = createFish(['#ffd166', '#ff8f70', '#8ce1dc'][index % 3])
      fish.position.set(-11 + (index * 3.7) % 22, -0.35, -12 + (index % 3) * 3.2)
      fish.scale.setScalar(0.55)
      fish.userData.phase = index * 0.8
      engine.featureLayer.add(fish)
    }
  }

  engine.eventId = state.eventId
  engine.mrvActive = state.mrvActive
  const storm = state.eventId === 'storm'
  engine.scene.background.set(storm ? '#7ea4b0' : '#8fdcff')
  engine.scene.fog.color.set(storm ? '#9bb1ae' : '#bceeff')
}

function setPlotScale(engine, plotId, hovered = false) {
  const group = engine.plotGroups.get(plotId)
  if (!group) return
  const target = hovered ? Math.max(1.085, group.userData.baseScale) : group.userData.baseScale
  group.scale.setScalar(target)
}

export default function MangroveWorld3D({
  plots,
  selectedPlot,
  selectedSpecies,
  biodiversity,
  community,
  coastal,
  upgrades,
  day,
  eventId,
  mrvActive,
  cameraResetSignal,
  onPlotClick,
  onReady,
}) {
  const mountRef = useRef(null)
  const engineRef = useRef(null)
  const stateRef = useRef(null)
  const callbackRef = useRef(onPlotClick)
  const readyRef = useRef(onReady)

  stateRef.current = {
    plots,
    selectedPlot,
    selectedSpecies,
    biodiversity,
    community,
    coastal,
    upgrades,
    day,
    eventId,
    mrvActive,
  }
  callbackRef.current = onPlotClick
  readyRef.current = onReady

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#8fdcff')
    scene.fog = new THREE.Fog('#bceeff', 34, 76)

    const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 120)
    camera.position.copy(DEFAULT_CAMERA)
    camera.lookAt(DEFAULT_TARGET)
    camera.zoom = 0.82
    camera.updateProjectionMatrix()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.04
    renderer.domElement.setAttribute('aria-label', 'แผนที่สามมิติของพื้นที่ฟื้นฟูป่าชายเลน')
    renderer.domElement.style.touchAction = 'none'
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(DEFAULT_TARGET)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.minZoom = 0.58
    controls.maxZoom = 1.55
    controls.minPolarAngle = Math.PI * 0.2
    controls.maxPolarAngle = Math.PI * 0.43
    controls.minAzimuthAngle = -Math.PI * 0.95
    controls.maxAzimuthAngle = Math.PI * 0.15

    const hemisphere = new THREE.HemisphereLight('#e7f8ff', '#7c684a', 2.25)
    scene.add(hemisphere)
    const sunLight = new THREE.DirectionalLight('#fff4d8', 4.2)
    sunLight.position.set(-18, 28, -14)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(1536, 1536)
    sunLight.shadow.camera.left = -30
    sunLight.shadow.camera.right = 30
    sunLight.shadow.camera.top = 30
    sunLight.shadow.camera.bottom = -30
    sunLight.shadow.camera.near = 1
    sunLight.shadow.camera.far = 80
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)
    const fill = new THREE.DirectionalLight('#8ad6ff', 1.2)
    fill.position.set(18, 12, 18)
    scene.add(fill)

    const plotLayer = new THREE.Group()
    const featureLayer = new THREE.Group()
    scene.add(plotLayer, featureLayer)

    const engine = {
      scene,
      camera,
      renderer,
      controls,
      plotLayer,
      featureLayer,
      plotGroups: new Map(),
      hitTargets: [],
      clouds: [],
      waves: [],
      decorativeTrees: [],
      hoveredPlot: null,
      water: null,
      boat: null,
      drone: null,
      eventId: null,
      mrvActive: false,
      clock: new THREE.Clock(),
    }
    engineRef.current = engine

    createStaticEnvironment(scene, engine)
    rebuildDynamic(engine, stateRef.current)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown = null

    const getPlotAtEvent = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const intersections = raycaster.intersectObjects(engine.hitTargets, false)
      return intersections[0]?.object?.userData?.plotId ?? null
    }

    const handlePointerMove = (event) => {
      const plotId = getPlotAtEvent(event)
      if (engine.hoveredPlot !== plotId) {
        if (engine.hoveredPlot != null) setPlotScale(engine, engine.hoveredPlot, false)
        engine.hoveredPlot = plotId
        if (plotId != null) setPlotScale(engine, plotId, true)
        renderer.domElement.style.cursor = plotId != null ? 'pointer' : 'grab'
      }
    }

    const handlePointerDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY, plotId: getPlotAtEvent(event) }
      renderer.domElement.style.cursor = 'grabbing'
    }

    const handlePointerUp = (event) => {
      renderer.domElement.style.cursor = engine.hoveredPlot != null ? 'pointer' : 'grab'
      if (!pointerDown) return
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)
      const plotId = getPlotAtEvent(event)
      if (distance < 7 && plotId != null && plotId === pointerDown.plotId) callbackRef.current?.(plotId)
      pointerDown = null
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', handlePointerUp)

    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      const aspect = width / height
      const frustum = width < 700 ? 13.8 : 11.2
      camera.left = -frustum * aspect
      camera.right = frustum * aspect
      camera.top = frustum
      camera.bottom = -frustum
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    let animationFrame = 0
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      const elapsed = engine.clock.getElapsedTime()
      const storm = engine.eventId === 'storm'

      controls.update()
      if (engine.water) engine.water.position.y = -0.25 + Math.sin(elapsed * 0.78) * 0.035

      engine.waves.forEach((wave) => {
        const pulse = 0.9 + (Math.sin(elapsed * 0.9 + wave.userData.phase) + 1) * 0.12
        wave.scale.setScalar(pulse)
        wave.material.opacity = (storm ? 0.62 : 0.34) + Math.sin(elapsed + wave.userData.phase) * 0.08
      })

      engine.clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * 0.004
        if (cloud.position.x > 24) cloud.position.x = -24
      })

      engine.plotLayer.traverse((child) => {
        if (child.userData?.kind === 'tree') {
          child.rotation.z = Math.sin(elapsed * 0.72 + child.userData.swaySeed) * (storm ? 0.055 : 0.018)
        }
        if (child.userData?.pulseRing) {
          const pulse = 0.92 + (Math.sin(elapsed * 2.2) + 1) * 0.12
          child.scale.setScalar(pulse)
          child.material.opacity = 0.4 + (Math.sin(elapsed * 2.2) + 1) * 0.16
        }
      })

      engine.featureLayer.traverse((child) => {
        if (child.userData?.rotor) child.rotation.y += 0.65
        if (child.userData?.worker) child.position.y = 0.62 + Math.sin(elapsed * 1.7 + child.userData.phase) * 0.025
        if (child.userData?.crab) {
          child.position.x += Math.sin(elapsed * 1.2 + child.userData.phase) * 0.0015
          child.rotation.y = Math.sin(elapsed + child.userData.phase) * 0.2
        }
        if (child.userData?.fish) {
          child.position.x += Math.sin(elapsed * 0.72 + child.userData.phase) * 0.003
          child.position.y = -0.36 + Math.sin(elapsed * 1.4 + child.userData.phase) * 0.06
        }
      })

      if (engine.drone) {
        const radius = engine.mrvActive ? 9 : 3.8
        const speed = engine.mrvActive ? 0.82 : 0.27
        engine.drone.position.set(
          Math.cos(elapsed * speed) * radius,
          engine.mrvActive ? 7.5 + Math.sin(elapsed * 2) * 0.4 : 6.2,
          Math.sin(elapsed * speed) * radius - 0.5,
        )
        engine.drone.rotation.y = -elapsed * speed + Math.PI / 2
      }

      if (engine.boat) {
        engine.boat.position.y = -0.17 + Math.sin(elapsed * 1.1) * 0.045
        engine.boat.rotation.z = Math.sin(elapsed * 0.8) * 0.025
      }

      renderer.render(scene, camera)
    }
    animate()
    readyRef.current?.()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointerleave', handlePointerUp)
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!engineRef.current) return
    rebuildDynamic(engineRef.current, stateRef.current)
  }, [plots, selectedPlot, selectedSpecies, biodiversity, community, coastal, upgrades, day, eventId, mrvActive])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || cameraResetSignal == null) return
    engine.camera.position.copy(DEFAULT_CAMERA)
    engine.camera.zoom = 0.82
    engine.camera.updateProjectionMatrix()
    engine.controls.target.copy(DEFAULT_TARGET)
    engine.controls.update()
  }, [cameraResetSignal])

  return <div ref={mountRef} className="mangrove-world-3d" />
}
