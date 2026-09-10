import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLOT_LAYOUT, SPECIES, stageFor, suitability } from './gameData.js'

const UP = new THREE.Vector3(0, 1, 0)
const DEFAULT_CAMERA = new THREE.Vector3(20, 18, 24)
const DEFAULT_TARGET = new THREE.Vector3(0, 0.7, 0.8)
const WORLD_LAYOUT = PLOT_LAYOUT.map(([x, z]) => [x * 1.08, z * 0.9 - 0.35])

function seeded(seed) {
  const value = Math.sin(seed * 91.731 + 13.17) * 43758.5453
  return value - Math.floor(value)
}

function mat(color, options = {}) {
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

function withShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  return mesh
}

function disposeMaterial(material) {
  if (!material) return
  if (material.map) material.map.dispose()
  if (material.alphaMap) material.alphaMap.dispose()
  material.dispose?.()
}

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.()
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach(disposeMaterial)
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

function cylinderBetween(start, end, radius, material, radialSegments = 7) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, length, radialSegments)
  const mesh = withShadow(new THREE.Mesh(geometry, material))
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize())
  return mesh
}

function createIrregularShape(radiusX, radiusZ, seed, segments = 16) {
  const shape = new THREE.Shape()
  const points = []
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    const noise = 0.91 + seeded(seed + index * 3.7) * 0.18
    const point = new THREE.Vector2(
      Math.cos(angle) * radiusX * noise,
      Math.sin(angle) * radiusZ * noise,
    )
    points.push(point)
    if (index === 0) shape.moveTo(point.x, point.y)
    else shape.lineTo(point.x, point.y)
  }
  shape.closePath()
  return { shape, points }
}

function createGroundShape(points, color, height = 0.45, y = 0) {
  const shape = new THREE.Shape()
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  })
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.18,
    bevelThickness: 0.1,
    steps: 1,
  })
  geometry.rotateX(Math.PI / 2)
  const mesh = withShadow(new THREE.Mesh(geometry, mat(color)))
  mesh.position.y = y
  return mesh
}

function createCanvasLabel(text, palette = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 112
  const context = canvas.getContext('2d')
  const background = palette.background || '#f7d06a'
  const border = palette.border || '#6d3f20'
  const foreground = palette.foreground || '#59351b'

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.lineWidth = 12
  context.strokeStyle = border
  context.fillStyle = background
  context.beginPath()
  context.roundRect(10, 10, 236, 92, 24)
  context.fill()
  context.stroke()
  context.fillStyle = 'rgba(255,255,255,.32)'
  context.beginPath()
  context.roundRect(24, 21, 208, 20, 10)
  context.fill()
  context.fillStyle = foreground
  context.font = '700 52px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 128, 62)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true }))
  sprite.scale.set(1.1, 0.48, 1)
  return sprite
}

function createGrassTuft(color = '#6fb94c', scale = 1, seed = 0) {
  const group = new THREE.Group()
  const material = mat(color)
  for (let index = 0; index < 5; index += 1) {
    const blade = withShadow(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 4), material), false, false)
    blade.position.set((index - 2) * 0.065, 0.2, (seeded(seed + index) - 0.5) * 0.15)
    blade.rotation.z = (index - 2) * 0.08
    group.add(blade)
  }
  group.scale.setScalar(scale)
  group.userData.grass = true
  group.userData.phase = seed
  return group
}

function addCanopyCluster(group, position, scale, lightColor, darkColor, index = 0) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const leafMaterial = mat(index % 3 === 0 ? darkColor : lightColor)
  const mesh = withShadow(new THREE.Mesh(geometry, leafMaterial))
  mesh.position.copy(position)
  mesh.scale.set(scale.x, scale.y, scale.z)
  mesh.rotation.set(index * 0.22, index * 0.47, index * 0.13)
  group.add(mesh)
  return mesh
}

function createMangroveTree(plot) {
  const species = SPECIES[plot.species]
  const stage = stageFor(plot)
  const group = new THREE.Group()
  group.userData.kind = 'tree'
  group.userData.swaySeed = plot.id * 0.73

  const stageScale = stage === 'seedling' ? 0.28 : stage === 'young' ? 0.63 : 1
  const healthScale = THREE.MathUtils.clamp(plot.health / 100, 0.52, 1)
  group.scale.setScalar(stageScale * healthScale)

  const trunkColor = new THREE.Color(species.colors.trunk)
  const leafColor = new THREE.Color(species.colors.leaf)
  const leafDark = new THREE.Color(species.colors.leafDark)
  if (plot.health < 58) {
    const stress = (58 - plot.health) / 75
    leafColor.lerp(new THREE.Color('#aa8b43'), stress)
    leafDark.lerp(new THREE.Color('#78613a'), stress)
  }

  const trunkMaterial = mat(trunkColor)
  const branchMaterial = mat(trunkColor.clone().multiplyScalar(0.86))

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 24),
    new THREE.MeshBasicMaterial({ color: '#26391f', transparent: true, opacity: 0.16, depthWrite: false }),
  )
  groundShadow.rotation.x = -Math.PI / 2
  groundShadow.position.y = 0.015
  groundShadow.scale.set(1.3, 0.8, 1)
  group.add(groundShadow)

  if (plot.dead) {
    const deadMaterial = mat('#76523a')
    const trunk = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.55, 7), deadMaterial))
    trunk.position.y = 1.28
    trunk.rotation.z = 0.1
    group.add(trunk)
    ;[-0.7, 0.62, 0.15].forEach((x, index) => {
      group.add(cylinderBetween(
        new THREE.Vector3(0, 1.45 + index * 0.25, 0),
        new THREE.Vector3(x, 2.4 + index * 0.08, index % 2 ? -0.25 : 0.28),
        0.07,
        deadMaterial,
      ))
    })
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5
      group.add(cylinderBetween(
        new THREE.Vector3(Math.cos(angle) * 0.62, 0.02, Math.sin(angle) * 0.62),
        new THREE.Vector3(Math.cos(angle) * 0.1, 0.68, Math.sin(angle) * 0.1),
        0.05,
        deadMaterial,
        5,
      ))
    }
    group.rotation.y = plot.id * 0.41
    return group
  }

  const trunkHeight = plot.species === 'avicennia' ? 3.25 : plot.species === 'sonneratia' ? 2.65 : 2.95
  const trunk = withShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.29, trunkHeight, 8),
    trunkMaterial,
  ))
  trunk.position.y = trunkHeight / 2
  trunk.rotation.z = (plot.id % 3 - 1) * 0.03
  group.add(trunk)

  const rootCount = plot.species === 'rhizophora' ? 9 : plot.species === 'sonneratia' ? 4 : 6
  for (let index = 0; index < rootCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rootCount + plot.id * 0.13
    const distance = plot.species === 'rhizophora' ? 1 : 0.7
    const end = new THREE.Vector3(Math.cos(angle) * distance, 0.03, Math.sin(angle) * distance)
    const start = new THREE.Vector3(Math.cos(angle) * 0.1, 0.78 + (index % 2) * 0.22, Math.sin(angle) * 0.1)
    group.add(cylinderBetween(end, start, plot.species === 'rhizophora' ? 0.053 : 0.034, branchMaterial, 5))
  }

  const branchCount = plot.species === 'sonneratia' ? 6 : 5
  for (let index = 0; index < branchCount; index += 1) {
    const angle = (Math.PI * 2 * index) / branchCount + plot.id * 0.17
    const height = trunkHeight * (0.62 + (index % 2) * 0.08)
    const length = plot.species === 'sonneratia' ? 1.22 : 0.9
    group.add(cylinderBetween(
      new THREE.Vector3(0, height, 0),
      new THREE.Vector3(Math.cos(angle) * length, height + 0.52, Math.sin(angle) * length),
      0.07,
      branchMaterial,
      6,
    ))
  }

  if (plot.species === 'rhizophora') {
    const centers = [
      [-0.82, 3.18, 0.2, 0.88], [0.05, 3.58, 0, 1.02], [0.88, 3.1, -0.15, 0.86],
      [-0.2, 3.05, 0.82, 0.8], [0.22, 3.02, -0.82, 0.78],
    ]
    centers.forEach(([x, y, z, size], index) => addCanopyCluster(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(size, size * 0.82, size),
      leafColor,
      leafDark,
      index,
    ))
  }

  if (plot.species === 'avicennia') {
    const centers = [
      [-0.52, 3.4, 0.1, 0.7, 1.08], [0.12, 3.88, 0, 0.8, 1.16],
      [0.64, 3.36, -0.2, 0.67, 0.98], [0, 3.34, 0.64, 0.67, 0.94],
    ]
    centers.forEach(([x, y, z, size, sizeY], index) => addCanopyCluster(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(size, sizeY, size * 0.78),
      leafColor,
      leafDark,
      index,
    ))
  }

  if (plot.species === 'sonneratia') {
    const centers = [
      [-1, 2.92, 0, 0.98], [0, 3.2, 0, 1.08], [1, 2.92, 0, 0.98],
      [-0.45, 2.93, 0.84, 0.84], [0.5, 2.88, -0.8, 0.86],
    ]
    centers.forEach(([x, y, z, size], index) => addCanopyCluster(
      group,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(size * 1.08, size * 0.72, size),
      leafColor,
      leafDark,
      index,
    ))

    const blossomMaterial = mat(species.colors.accent, { roughness: 0.65 })
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7 + plot.id
      const blossom = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 5), blossomMaterial), false, false)
      blossom.position.set(Math.cos(angle) * 1.08, 3.15 + (index % 3) * 0.22, Math.sin(angle) * 0.8)
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

  const stem = withShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.065, 0.72, 6),
    mat(species.colors.trunk, { transparent: true, opacity: 0.78 }),
  ), false, false)
  stem.position.y = 0.38
  group.add(stem)

  const leafMaterial = mat(species.colors.leaf, { transparent: true, opacity: fit === 0 ? 0.4 : 0.82 })
  ;[-1, 1].forEach((side) => {
    const leaf = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5), leafMaterial), false, false)
    leaf.scale.set(1.25, 0.42, 0.7)
    leaf.position.set(side * 0.17, 0.72, 0)
    leaf.rotation.z = side * 0.52
    group.add(leaf)
  })

  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: fit === 2 ? '#f7ef65' : fit === 1 ? '#ffd166' : '#ff9878',
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 36), pulseMaterial)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.02
  ring.userData.pulseRing = true
  group.add(ring)
  return group
}

function soilColor(soil) {
  return {
    เลน: '#75583e',
    ตะกอน: '#8e6b48',
    ดินเลน: '#765643',
    ทราย: '#b9955f',
  }[soil] || '#806044'
}

function plotElevation(tide) {
  return tide === 'ต่ำ' ? 0.02 : tide === 'กลาง' ? 0.08 : 0.14
}

function createPlotPatch(plot, state, engine) {
  const [x, z] = WORLD_LAYOUT[plot.id - 1]
  const y = plotElevation(plot.tide)
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.rotation.y = (seeded(plot.id * 4.2) - 0.5) * 0.34
  group.userData.plotId = plot.id
  group.userData.baseScale = state.selectedPlot === plot.id ? 1.045 : 1

  const radiusX = 1.43 + seeded(plot.id * 7.3) * 0.18
  const radiusZ = 1.12 + seeded(plot.id * 8.7) * 0.17
  const { shape, points } = createIrregularShape(radiusX, radiusZ, plot.id * 2.73)
  const patchGeometry = new THREE.ShapeGeometry(shape, 18)
  patchGeometry.rotateX(-Math.PI / 2)
  const fit = suitability(plot, plot.species || state.selectedSpecies)
  const selected = state.selectedPlot === plot.id
  const patchMaterial = mat(soilColor(plot.soil), {
    roughness: 0.95,
    emissive: selected ? '#ffd75a' : '#000000',
    emissiveIntensity: selected ? 0.24 : 0,
  })
  const patch = withShadow(new THREE.Mesh(patchGeometry, patchMaterial), false, true)
  patch.position.y = 0.02
  group.add(patch)

  const rimPoints = points.map((point) => new THREE.Vector3(point.x, 0.055, -point.y))
  const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true, 'centripetal')
  const rimGeometry = new THREE.TubeGeometry(rimCurve, 42, selected ? 0.035 : 0.022, 5, true)
  const rimColor = selected ? '#fff072' : fit === 2 ? '#7dc84e' : fit === 1 ? '#e4b95c' : '#a87158'
  const rim = new THREE.Mesh(rimGeometry, mat(rimColor, {
    transparent: true,
    opacity: selected ? 0.98 : 0.64,
    emissive: selected ? '#7b5b00' : '#000000',
    emissiveIntensity: selected ? 0.45 : 0,
  }))
  rim.userData.plotRim = true
  group.add(rim)
  group.userData.rim = rim

  const dampMaterial = new THREE.MeshBasicMaterial({ color: '#3a8e91', transparent: true, opacity: plot.tide === 'ต่ำ' ? 0.18 : 0.08, depthWrite: false })
  const damp = new THREE.Mesh(new THREE.CircleGeometry(radiusX * 0.86, 24), dampMaterial)
  damp.rotation.x = -Math.PI / 2
  damp.scale.z = radiusZ / radiusX
  damp.position.y = 0.032
  group.add(damp)

  const grassCount = plot.tide === 'สูง' ? 7 : plot.tide === 'กลาง' ? 4 : 2
  for (let index = 0; index < grassCount; index += 1) {
    const angle = (Math.PI * 2 * index) / grassCount + plot.id * 0.37
    const radius = 0.86 + seeded(plot.id * 10 + index) * 0.34
    const tuft = createGrassTuft(plot.tide === 'สูง' ? '#72ba4d' : '#80b85b', 0.55 + seeded(index + plot.id) * 0.2, plot.id * 10 + index)
    tuft.position.set(Math.cos(angle) * radiusX * radius, 0.03, Math.sin(angle) * radiusZ * radius)
    group.add(tuft)
  }

  const signPost = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 6), mat('#79502e')))
  signPost.position.set(-radiusX * 0.72, 0.36, radiusZ * 0.65)
  group.add(signPost)
  const sign = createCanvasLabel(`#${String(plot.id).padStart(2, '0')}`, {
    background: selected ? '#fff06a' : '#f0c56a',
  })
  sign.position.set(-radiusX * 0.72, 0.77, radiusZ * 0.65)
  sign.scale.multiplyScalar(selected ? 1.08 : 0.8)
  group.add(sign)

  if (plot.species) {
    const tree = createMangroveTree(plot)
    tree.position.y = 0.04
    group.add(tree)
  } else {
    const preview = createSeedlingPreview(state.selectedSpecies, fit)
    preview.position.y = 0.03
    group.add(preview)

    const fitMaterial = mat(fit === 2 ? '#92dc50' : fit === 1 ? '#f0c65b' : '#dc765d', {
      emissive: fit === 2 ? '#244f15' : '#5b2918',
      emissiveIntensity: 0.22,
    })
    for (let index = 0; index < 2; index += 1) {
      const marker = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), fitMaterial), false, false)
      marker.position.set(-0.12 + index * 0.24, 0.12, radiusZ * 0.78)
      marker.scale.setScalar(index < fit ? 1 : 0.56)
      if (index >= fit) marker.material = mat('#675a4d', { transparent: true, opacity: 0.46 })
      group.add(marker)
    }
  }

  if (selected) {
    const markerGroup = new THREE.Group()
    const markerMaterial = mat('#ffdf4f', { emissive: '#8a5b00', emissiveIntensity: 0.55 })
    const diamond = withShadow(new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), markerMaterial), false, false)
    diamond.scale.y = 1.35
    markerGroup.add(diamond)
    const pointer = withShadow(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 8), markerMaterial), false, false)
    pointer.position.y = -0.38
    pointer.rotation.z = Math.PI
    markerGroup.add(pointer)
    markerGroup.position.y = plot.species ? (stageFor(plot) === 'mature' ? 4.8 : 3.1) : 1.75
    markerGroup.userData.selectionMarker = true
    markerGroup.userData.phase = plot.id
    group.add(markerGroup)
  }

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(radiusX, radiusZ) * 1.03, Math.max(radiusX, radiusZ) * 1.03, 2.2, 14),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.001, depthWrite: false }),
  )
  hit.position.y = 0.8
  hit.userData.plotId = plot.id
  hit.renderOrder = 30
  group.add(hit)
  engine.hitTargets.push(hit)
  engine.plotGroups.set(plot.id, group)

  group.scale.setScalar(group.userData.baseScale)
  return group
}

function createHouse(x, z, scale = 1, roofColor = '#e95f4d', wallColor = '#fff0b3') {
  const group = new THREE.Group()
  const wood = mat('#7d4b2b')
  ;[-0.88, 0.88].forEach((px) => {
    ;[-0.65, 0.65].forEach((pz) => {
      const stilt = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 7), wood))
      stilt.position.set(px, 0.37, pz)
      group.add(stilt)
    })
  })

  const deck = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.9), mat('#b87842')))
  deck.position.y = 0.82
  group.add(deck)
  const wall = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.45, 1.65), mat(wallColor)))
  wall.position.y = 1.62
  group.add(wall)
  const roof = withShadow(new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.05, 4), mat(roofColor)))
  roof.position.y = 2.78
  roof.rotation.y = Math.PI / 4
  roof.scale.z = 0.82
  group.add(roof)

  const door = withShadow(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.92, 0.1), wood))
  door.position.set(0, 1.35, 0.88)
  group.add(door)
  const windowMaterial = mat('#74d5e7', { roughness: 0.22, emissive: '#277e9a', emissiveIntensity: 0.15 })
  ;[-0.68, 0.68].forEach((windowX) => {
    const windowMesh = withShadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.09), windowMaterial), false, false)
    windowMesh.position.set(windowX, 1.78, 0.89)
    group.add(windowMesh)
  })

  const porch = withShadow(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.75), mat('#d39a54')))
  porch.position.set(0, 0.87, 1.15)
  group.add(porch)

  group.position.set(x, 0, z)
  group.scale.setScalar(scale)
  return group
}

function createSeedlingRow(count, y = 0.2) {
  const group = new THREE.Group()
  for (let index = 0; index < count; index += 1) {
    const speciesKey = ['rhizophora', 'avicennia', 'sonneratia'][index % 3]
    const sprout = createSeedlingPreview(speciesKey, 2)
    sprout.scale.setScalar(0.24)
    sprout.position.set((index - (count - 1) / 2) * 0.45, y, 0)
    group.add(sprout)
  }
  return group
}

function createNursery(level) {
  const group = new THREE.Group()
  group.add(createHouse(-1.8, 0, 0.68 + level * 0.04, '#eea43d', '#fff2bd'))

  const greenhouse = new THREE.Group()
  const base = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.14, 1.85), mat('#78b854')))
  base.position.y = 0.72
  greenhouse.add(base)
  const glass = withShadow(new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 1.05, 1.62),
    mat('#a8e3c4', { transparent: true, opacity: 0.48, roughness: 0.22, side: THREE.DoubleSide }),
  ), false, true)
  glass.position.y = 1.28
  greenhouse.add(glass)
  const frameMaterial = mat('#f1ead1')
  ;[-1.15, 0, 1.15].forEach((px) => {
    const post = withShadow(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.32, 0.07), frameMaterial))
    post.position.set(px, 1.3, 0.77)
    greenhouse.add(post)
  })
  greenhouse.position.set(1.55, 0, 0)
  group.add(greenhouse)

  const rows = 1 + level
  for (let row = 0; row < rows; row += 1) {
    const seedlings = createSeedlingRow(5)
    seedlings.position.set(1.55, 0.68, -0.5 + row * 0.48)
    group.add(seedlings)
  }

  const sign = createCanvasLabel(`NURSERY LV.${level}`, {
    background: '#a9df64',
    border: '#4c782d',
    foreground: '#31561e',
  })
  sign.position.set(0.1, 3.25, 0.8)
  sign.scale.set(2.1, 0.74, 1)
  group.add(sign)

  group.position.set(-10.4, 0.28, 9.3)
  group.rotation.y = 0.08
  return group
}

function createMarketStall() {
  const group = new THREE.Group()
  const counter = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 0.9), mat('#d58a43')))
  counter.position.y = 0.75
  group.add(counter)
  const canopy = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.18, 1.35), mat('#f7d65c')))
  canopy.position.y = 2.15
  group.add(canopy)
  ;[-0.92, 0.92].forEach((px) => {
    const post = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.8, 6), mat('#744629')))
    post.position.set(px, 1.33, 0)
    group.add(post)
  })
  ;[-0.65, 0, 0.65].forEach((px, index) => {
    const basket = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.28, 10), mat(['#f27855', '#74bb4b', '#e4a345'][index])))
    basket.position.set(px, 1.28, 0.05)
    group.add(basket)
  })
  group.position.set(5.7, 0.45, 9.2)
  group.rotation.y = -0.22
  return group
}

function createDockAndBoat() {
  const group = new THREE.Group()
  const woodMaterial = mat('#a66c3d')
  const darkWood = mat('#72462a')
  for (let index = 0; index < 9; index += 1) {
    const plank = withShadow(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.15, 1.05), woodMaterial))
    plank.position.set(index * 0.7, 0.28, 0)
    group.add(plank)
    const post = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 1.15, 7), darkWood))
    post.position.set(index * 0.7, -0.18, index % 2 ? 0.47 : -0.47)
    group.add(post)
  }

  const boat = new THREE.Group()
  const hull = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 3.15, 8, 1, false), mat('#ef6742')))
  hull.rotation.z = Math.PI / 2
  hull.scale.z = 0.46
  boat.add(hull)
  const inner = withShadow(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.6), mat('#f4c766')))
  inner.position.y = 0.18
  boat.add(inner)
  const motor = withShadow(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.4), mat('#465964', { metalness: 0.2 })))
  motor.position.set(-1.43, 0.14, 0)
  boat.add(motor)
  boat.position.set(3.4, -0.2, -1.6)
  boat.rotation.y = -0.16
  boat.userData.boat = true
  group.add(boat)

  group.position.set(-2.5, 0.04, 8.45)
  group.rotation.y = -0.72
  return group
}

function createBoardwalk(points, width = 0.82) {
  const group = new THREE.Group()
  const plankMaterial = mat('#b27641')
  const postMaterial = mat('#72452a')

  for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
    const [x1, z1] = points[segmentIndex]
    const [x2, z2] = points[segmentIndex + 1]
    const dx = x2 - x1
    const dz = z2 - z1
    const length = Math.hypot(dx, dz)
    const steps = Math.max(1, Math.ceil(length / 0.58))
    for (let index = 0; index < steps; index += 1) {
      const t = (index + 0.5) / steps
      const x = x1 + dx * t
      const z = z1 + dz * t
      const plank = withShadow(new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, length / steps * 0.88), plankMaterial))
      plank.position.set(x, 0.34, z)
      plank.rotation.y = Math.atan2(dx, dz)
      plank.rotation.z = (index % 2 ? 1 : -1) * 0.01
      group.add(plank)
    }
    ;[0, 1].forEach((side) => {
      const t = side
      const x = x1 + dx * t
      const z = z1 + dz * t
      const post = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.05, 7), postMaterial))
      post.position.set(x, -0.08, z)
      group.add(post)
    })
  }
  return group
}

function createWaterChannel(points, radius = 0.55) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.065, z)), false, 'centripetal')
  const geometry = new THREE.TubeGeometry(curve, 72, radius, 10, false)
  const mesh = new THREE.Mesh(geometry, mat('#4abbd2', {
    transparent: true,
    opacity: 0.82,
    roughness: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }))
  mesh.scale.y = 0.13
  mesh.renderOrder = 4
  mesh.userData.channel = true
  return mesh
}

function createDrone(level) {
  const group = new THREE.Group()
  const bodyMaterial = mat(level >= 2 ? '#ffd450' : '#f4f7f7', { metalness: 0.08, roughness: 0.45 })
  const dark = mat('#334853', { metalness: 0.18 })
  const body = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 7), bodyMaterial))
  body.scale.set(1.3, 0.55, 0.95)
  group.add(body)

  ;[[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => {
    group.add(cylinderBetween(new THREE.Vector3(), new THREE.Vector3(x * 0.7, 0, z * 0.7), 0.04, dark, 6))
    const rotor = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.024, 20), dark), false, false)
    rotor.position.set(x * 0.7, 0.08, z * 0.7)
    rotor.userData.rotor = true
    group.add(rotor)
  })

  const camera = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat('#263a47', { metalness: 0.2 })))
  camera.position.set(0.24, -0.24, 0)
  group.add(camera)
  group.userData.drone = true
  group.scale.setScalar(0.74 + level * 0.07)
  return group
}

function createWorker(color = '#f4d35e') {
  const group = new THREE.Group()
  const body = withShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 8), mat(color)))
  body.position.y = 0.44
  group.add(body)
  const head = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), mat('#d89b68')))
  head.position.y = 0.96
  group.add(head)
  const hat = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.1, 10), mat('#f1a33a')))
  hat.position.y = 1.14
  group.add(hat)
  group.userData.worker = true
  return group
}

function createCrab() {
  const group = new THREE.Group()
  const material = mat('#ef5d46')
  const body = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), material), false, false)
  body.scale.set(1.3, 0.54, 1)
  group.add(body)
  ;[-1, 1].forEach((side) => {
    for (let index = 0; index < 3; index += 1) {
      group.add(cylinderBetween(
        new THREE.Vector3(side * 0.12, 0, (index - 1) * 0.12),
        new THREE.Vector3(side * (0.4 + index * 0.03), -0.06, (index - 1) * 0.2),
        0.017,
        material,
        5,
      ))
    }
  })
  group.userData.crab = true
  return group
}

function createFish(color = '#ffd166') {
  const group = new THREE.Group()
  const material = mat(color, { transparent: true, opacity: 0.86 })
  const body = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), material), false, false)
  body.scale.set(1.5, 0.64, 0.64)
  group.add(body)
  const tail = withShadow(new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.4, 3), material), false, false)
  tail.rotation.z = -Math.PI / 2
  tail.position.x = -0.48
  group.add(tail)
  group.userData.fish = true
  return group
}

function createBird(seed = 0) {
  const group = new THREE.Group()
  const material = mat('#f8f4dd', { roughness: 0.6 })
  const body = withShadow(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), material), false, false)
  body.scale.set(1.5, 0.55, 0.6)
  group.add(body)
  ;[-1, 1].forEach((side) => {
    const wing = withShadow(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 3), material), false, false)
    wing.rotation.z = side * 1.15
    wing.position.set(side * 0.27, 0, 0)
    wing.userData.wing = true
    wing.userData.side = side
    group.add(wing)
  })
  group.userData.bird = true
  group.userData.phase = seed
  return group
}

function createCloud(scale = 1) {
  const group = new THREE.Group()
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.87, depthWrite: false })
  ;[
    [-0.7, 0, 0, 0.65], [0, 0.18, 0, 0.85], [0.75, 0, 0, 0.62], [0.1, -0.15, 0.15, 0.75],
  ].forEach(([x, y, z, size]) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), cloudMaterial)
    blob.position.set(x, y, z)
    blob.scale.set(size * 1.2, size * 0.65, size)
    group.add(blob)
  })
  group.scale.setScalar(scale)
  group.userData.cloud = true
  return group
}

function createSkyDome() {
  const uniforms = {
    topColor: { value: new THREE.Color('#56bde9') },
    bottomColor: { value: new THREE.Color('#e2f8ff') },
    offset: { value: 18 },
    exponent: { value: 0.75 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(78, 32, 18), material)
  dome.userData.skyMaterial = material
  return dome
}

function createStaticEnvironment(scene, engine) {
  const sky = createSkyDome()
  scene.add(sky)
  engine.skyMaterial = sky.userData.skyMaterial

  const seabed = withShadow(new THREE.Mesh(new THREE.PlaneGeometry(76, 66), mat('#9bd4c3')), false, true)
  seabed.rotation.x = -Math.PI / 2
  seabed.position.y = -0.58
  scene.add(seabed)

  const water = withShadow(new THREE.Mesh(
    new THREE.PlaneGeometry(78, 68),
    mat('#4fc5df', {
      transparent: true,
      opacity: 0.76,
      roughness: 0.18,
      metalness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  ), false, true)
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.26
  water.renderOrder = 1
  water.userData.water = true
  scene.add(water)
  engine.water = water

  const mudflatPoints = [
    [-14.5, -10], [-9.5, -11.5], [-3.2, -10.8], [3.8, -10.4], [10.8, -8.8], [13.4, -4.2],
    [12.2, 2.8], [10.5, 6.7], [5, 7.7], [-0.5, 7.25], [-6.4, 8.1], [-11.8, 6.2], [-14.2, 1.5],
  ]
  const mudflat = createGroundShape(mudflatPoints, '#806348', 0.34, 0.02)
  scene.add(mudflat)

  const mainlandPoints = [
    [-20, 6.9], [-14, 6.3], [-9.2, 8.2], [-4.2, 7.4], [1.4, 8.1], [6.7, 7.2], [12, 8.3], [20, 6.7],
    [20, 18], [-20, 18],
  ]
  const mainland = createGroundShape(mainlandPoints, '#68b94e', 0.88, 0.82)
  scene.add(mainland)

  const shorelinePoints = [
    [-19.3, 6.15], [-13.2, 5.5], [-9, 7.25], [-4.1, 6.5], [1.2, 7.2], [6.7, 6.3], [12, 7.3], [19.2, 5.95],
    [19.2, 7.5], [12, 8.8], [6.8, 7.8], [1.1, 8.7], [-4.2, 8.1], [-9.1, 9.25], [-13.5, 7.2], [-19.3, 7.7],
  ]
  const shorelineShape = new THREE.Shape()
  shorelinePoints.forEach(([x, z], index) => {
    if (index === 0) shorelineShape.moveTo(x, z)
    else shorelineShape.lineTo(x, z)
  })
  shorelineShape.closePath()
  const shorelineGeometry = new THREE.ShapeGeometry(shorelineShape, 32)
  shorelineGeometry.rotateX(-Math.PI / 2)
  const shoreline = withShadow(new THREE.Mesh(shorelineGeometry, mat('#c9a166')), false, true)
  shoreline.position.y = 1.03
  scene.add(shoreline)

  const channels = [
    createWaterChannel([[-11.8, -7.8], [-8.6, -4.4], [-7.2, -0.4], [-8.5, 3.4], [-10.5, 6.2]], 0.48),
    createWaterChannel([[-2.7, -10.1], [-2.1, -6.3], [-3.5, -2.5], [-2.6, 1.8], [-1.5, 6.8]], 0.42),
    createWaterChannel([[8.9, -8], [7.3, -4.8], [8.1, -0.8], [7.3, 3.2], [9.3, 6.5]], 0.46),
  ]
  channels.forEach((channel) => {
    scene.add(channel)
    engine.channels.push(channel)
  })

  const boardwalk = createBoardwalk([[-10.2, 8.1], [-8.2, 5.8], [-5.8, 4.7], [-3.3, 3.4], [-0.6, 2.7]], 0.88)
  boardwalk.position.y = 0.16
  scene.add(boardwalk)
  const crossWalk = createBoardwalk([[-3.3, 3.4], [-1.5, 0.6], [1.5, -1.6], [4.7, -3.2]], 0.72)
  crossWalk.position.y = 0.14
  scene.add(crossWalk)

  const dock = createDockAndBoat()
  scene.add(dock)
  dock.traverse((child) => {
    if (child.userData?.boat) engine.boat = child
  })

  scene.add(createHouse(8.2, 10.4, 1.03, '#e34d55', '#fff0bd'))
  scene.add(createHouse(12.1, 9.7, 0.78, '#f0a13b', '#f5e4a5'))

  const distantIslands = [
    { x: -18, z: -14, sx: 4.5, sz: 2.3 },
    { x: 16, z: -15, sx: 3.8, sz: 2 },
    { x: 22, z: 1, sx: 4.2, sz: 2.2 },
  ]
  distantIslands.forEach((item, index) => {
    const { shape } = createIrregularShape(item.sx, item.sz, 400 + index)
    const geometry = new THREE.ShapeGeometry(shape, 18)
    geometry.rotateX(-Math.PI / 2)
    const island = withShadow(new THREE.Mesh(geometry, mat('#6cb04a')), false, true)
    island.position.set(item.x, -0.08, item.z)
    scene.add(island)
  })

  const decorativePlots = [
    { id: 101, species: 'rhizophora', age: 8, health: 100, dead: false },
    { id: 102, species: 'avicennia', age: 8, health: 100, dead: false },
    { id: 103, species: 'sonneratia', age: 8, health: 100, dead: false },
    { id: 104, species: 'rhizophora', age: 8, health: 100, dead: false },
    { id: 105, species: 'avicennia', age: 8, health: 100, dead: false },
  ]
  const decorativePositions = [[-15.2, 8.7], [-6, 11.2], [2.8, 10.4], [15.4, 9.3], [17.3, -0.5]]
  decorativePlots.forEach((plot, index) => {
    const tree = createMangroveTree(plot)
    tree.position.set(decorativePositions[index][0], index === 4 ? 0 : 1.2, decorativePositions[index][1])
    tree.scale.multiplyScalar(index === 4 ? 0.52 : 0.62)
    scene.add(tree)
    engine.decorativeTrees.push(tree)
  })

  for (let index = 0; index < 34; index += 1) {
    const tuft = createGrassTuft(index % 3 === 0 ? '#5ca843' : '#79bf54', 0.7 + seeded(index) * 0.45, index)
    const side = index % 2 === 0 ? -1 : 1
    tuft.position.set(side * (10.5 + seeded(index * 2) * 7), 1.15, 7.7 + seeded(index * 5) * 4.6)
    scene.add(tuft)
    engine.staticGrass.push(tuft)
  }

  const cloudData = [[-13, 13, -8, 1.25], [4, 15, 1, 1.55], [15, 12, 8, 1.05], [-3, 11, 15, 0.9]]
  cloudData.forEach(([x, y, z, scale], index) => {
    const cloud = createCloud(scale)
    cloud.position.set(x, y, z)
    cloud.userData.speed = 0.16 + index * 0.05
    scene.add(cloud)
    engine.clouds.push(cloud)
  })

  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.15, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe27a' }))
  sun.position.set(-19, 21, -25)
  scene.add(sun)
  engine.sunVisual = sun

  const waveMaterial = new THREE.MeshBasicMaterial({ color: '#d9fbff', transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })
  for (let index = 0; index < 19; index += 1) {
    const wave = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.63, 32, 1, 0, Math.PI * 1.2), waveMaterial.clone())
    wave.rotation.x = -Math.PI / 2
    wave.rotation.z = index * 0.7
    wave.position.set(-17 + (index * 4.2) % 34, -0.18, -13 + (index % 5) * 4.4)
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

  state.plots.forEach((plot) => engine.plotLayer.add(createPlotPatch(plot, state, engine)))

  engine.featureLayer.add(createNursery(state.upgrades.nursery))
  if (state.community >= 28) engine.featureLayer.add(createMarketStall())

  const drone = createDrone(state.upgrades.drone)
  drone.position.set(0, 6.8, 0)
  drone.visible = state.upgrades.drone > 0 || state.mrvActive
  engine.featureLayer.add(drone)
  engine.drone = drone

  const workerCount = Math.min(6, 1 + state.upgrades.community + Math.floor(state.community / 25))
  const workerPath = [[-9.5, 7.3], [-7.4, 5.3], [-5.1, 4.3], [-2.9, 3.1], [-0.8, 2.4], [2, 0.4]]
  for (let index = 0; index < workerCount; index += 1) {
    const worker = createWorker(['#f4d35e', '#62c4ed', '#ef7c68', '#9bd45b'][index % 4])
    const [x, z] = workerPath[index % workerPath.length]
    worker.position.set(x, 0.55, z)
    worker.rotation.y = 0.3 + index * 0.45
    worker.userData.phase = index
    engine.featureLayer.add(worker)
  }

  const barrierCount = Math.min(16, Math.floor(state.coastal / 6) + state.upgrades.community)
  const postMaterial = mat('#98603a')
  for (let index = 0; index < barrierCount; index += 1) {
    const post = withShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.35, 7), postMaterial))
    post.position.set(-11.8 + index * 1.55, 0.02, -9.6 + Math.sin(index * 0.8) * 0.55)
    post.rotation.z = (index % 2 ? 1 : -1) * 0.08
    engine.featureLayer.add(post)
    if (index > 0) {
      const previousX = -11.8 + (index - 1) * 1.55
      const previousZ = -9.6 + Math.sin((index - 1) * 0.8) * 0.55
      engine.featureLayer.add(cylinderBetween(
        new THREE.Vector3(previousX, 0.35, previousZ),
        new THREE.Vector3(post.position.x, 0.35, post.position.z),
        0.028,
        postMaterial,
        5,
      ))
    }
  }

  if (state.biodiversity >= 18) {
    const crabCount = Math.min(7, 1 + Math.floor((state.biodiversity - 18) / 10))
    for (let index = 0; index < crabCount; index += 1) {
      const crab = createCrab()
      crab.position.set(-10 + index * 3.05, 0.22, -8.2 + (index % 2) * 1.05)
      crab.scale.setScalar(0.64)
      crab.userData.phase = index * 0.7
      engine.featureLayer.add(crab)
    }
  }

  if (state.biodiversity >= 30) {
    const fishCount = Math.min(9, 2 + Math.floor((state.biodiversity - 30) / 8))
    for (let index = 0; index < fishCount; index += 1) {
      const fish = createFish(['#ffd166', '#ff8d70', '#88e0dd'][index % 3])
      fish.position.set(-12 + (index * 3.7) % 24, -0.34, -12 + (index % 3) * 3.1)
      fish.scale.setScalar(0.54)
      fish.userData.phase = index * 0.8
      engine.featureLayer.add(fish)
    }
  }

  if (state.biodiversity >= 42) {
    const birdCount = Math.min(5, 1 + Math.floor((state.biodiversity - 42) / 14))
    for (let index = 0; index < birdCount; index += 1) {
      const bird = createBird(index)
      bird.position.set(-3 + index * 1.3, 8 + index * 0.35, -2 + index * 0.7)
      bird.scale.setScalar(0.85)
      engine.featureLayer.add(bird)
    }
  }

  const storm = state.eventId === 'storm'
  engine.eventId = state.eventId
  engine.mrvActive = state.mrvActive
  if (engine.skyMaterial) {
    engine.skyMaterial.uniforms.topColor.value.set(storm ? '#637f91' : '#56bde9')
    engine.skyMaterial.uniforms.bottomColor.value.set(storm ? '#a8b9b8' : '#e2f8ff')
  }
  engine.scene.fog.color.set(storm ? '#9bb1ae' : '#c7f1fa')
  engine.sunLight.intensity = storm ? 1.7 : 4.1
  engine.fillLight.intensity = storm ? 0.65 : 1.2
  if (engine.sunVisual) engine.sunVisual.visible = !storm

  if (state.selectedPlot && state.selectedPlot !== engine.lastSelectedPlot) {
    const [x, z] = WORLD_LAYOUT[state.selectedPlot - 1]
    engine.focusTarget.set(x, 0.65, z)
    engine.focusFrames = 40
  }
  engine.lastSelectedPlot = state.selectedPlot
}

function setPlotHover(engine, plotId, hovered) {
  const group = engine.plotGroups.get(plotId)
  if (!group) return
  const target = hovered ? Math.max(1.075, group.userData.baseScale) : group.userData.baseScale
  group.scale.setScalar(target)
  if (group.userData.rim?.material) {
    group.userData.rim.material.emissive.set(hovered ? '#5d4300' : '#000000')
    group.userData.rim.material.emissiveIntensity = hovered ? 0.35 : 0
  }
}

export default function MangroveWorld3DIntegrated({
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
    scene.background = new THREE.Color('#bdeeff')
    scene.fog = new THREE.Fog('#c7f1fa', 35, 80)

    const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 130)
    camera.position.copy(DEFAULT_CAMERA)
    camera.lookAt(DEFAULT_TARGET)
    camera.zoom = 0.8
    camera.updateProjectionMatrix()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.04
    renderer.domElement.setAttribute('aria-label', 'โลกสามมิติของโครงการฟื้นฟูป่าชายเลน')
    renderer.domElement.style.touchAction = 'none'
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(DEFAULT_TARGET)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.minZoom = 0.56
    controls.maxZoom = 1.62
    controls.minPolarAngle = Math.PI * 0.2
    controls.maxPolarAngle = Math.PI * 0.44
    controls.minAzimuthAngle = -Math.PI * 0.96
    controls.maxAzimuthAngle = Math.PI * 0.18

    const hemisphere = new THREE.HemisphereLight('#edfaff', '#68553c', 2.2)
    scene.add(hemisphere)
    const sunLight = new THREE.DirectionalLight('#fff4d7', 4.1)
    sunLight.position.set(-18, 28, -14)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(1536, 1536)
    sunLight.shadow.camera.left = -32
    sunLight.shadow.camera.right = 32
    sunLight.shadow.camera.top = 32
    sunLight.shadow.camera.bottom = -32
    sunLight.shadow.camera.near = 1
    sunLight.shadow.camera.far = 85
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)
    const fillLight = new THREE.DirectionalLight('#82d4ff', 1.2)
    fillLight.position.set(18, 12, 18)
    scene.add(fillLight)

    const plotLayer = new THREE.Group()
    const featureLayer = new THREE.Group()
    scene.add(plotLayer, featureLayer)

    const engine = {
      scene,
      camera,
      renderer,
      controls,
      sunLight,
      fillLight,
      plotLayer,
      featureLayer,
      plotGroups: new Map(),
      hitTargets: [],
      clouds: [],
      waves: [],
      channels: [],
      decorativeTrees: [],
      staticGrass: [],
      hoveredPlot: null,
      water: null,
      boat: null,
      drone: null,
      eventId: null,
      mrvActive: false,
      clock: new THREE.Clock(),
      skyMaterial: null,
      sunVisual: null,
      focusTarget: DEFAULT_TARGET.clone(),
      focusFrames: 0,
      lastSelectedPlot: null,
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
        if (engine.hoveredPlot != null) setPlotHover(engine, engine.hoveredPlot, false)
        engine.hoveredPlot = plotId
        if (plotId != null) setPlotHover(engine, plotId, true)
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
      const frustum = width < 700 ? 13.7 : 11.4
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

      if (engine.focusFrames > 0) {
        const delta = engine.focusTarget.clone().sub(controls.target).multiplyScalar(0.07)
        controls.target.add(delta)
        camera.position.add(delta)
        engine.focusFrames -= 1
      }

      controls.update()
      if (engine.water) engine.water.position.y = -0.26 + Math.sin(elapsed * 0.78) * 0.032

      engine.channels.forEach((channel, index) => {
        channel.position.y = Math.sin(elapsed * 0.9 + index) * 0.015
      })

      engine.waves.forEach((wave) => {
        const pulse = 0.9 + (Math.sin(elapsed * 0.9 + wave.userData.phase) + 1) * 0.12
        wave.scale.setScalar(pulse)
        wave.material.opacity = (storm ? 0.62 : 0.34) + Math.sin(elapsed + wave.userData.phase) * 0.08
      })

      engine.clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * 0.004
        if (cloud.position.x > 25) cloud.position.x = -25
      })

      engine.staticGrass.forEach((grass) => {
        grass.rotation.z = Math.sin(elapsed * 0.8 + grass.userData.phase) * (storm ? 0.055 : 0.018)
      })

      engine.plotLayer.traverse((child) => {
        if (child.userData?.kind === 'tree') {
          child.rotation.z = Math.sin(elapsed * 0.72 + child.userData.swaySeed) * (storm ? 0.06 : 0.018)
        }
        if (child.userData?.pulseRing) {
          const pulse = 0.92 + (Math.sin(elapsed * 2.2) + 1) * 0.12
          child.scale.setScalar(pulse)
          child.material.opacity = 0.4 + (Math.sin(elapsed * 2.2) + 1) * 0.16
        }
        if (child.userData?.selectionMarker) {
          child.position.y += Math.sin(elapsed * 2.8 + child.userData.phase) * 0.0025
          child.rotation.y = elapsed * 0.9
        }
        if (child.userData?.grass) {
          child.rotation.z = Math.sin(elapsed * 0.9 + child.userData.phase) * (storm ? 0.07 : 0.022)
        }
      })

      engine.featureLayer.traverse((child) => {
        if (child.userData?.rotor) child.rotation.y += 0.65
        if (child.userData?.worker) {
          child.position.y += Math.sin(elapsed * 1.7 + child.userData.phase) * 0.0012
          child.rotation.y += Math.sin(elapsed * 0.45 + child.userData.phase) * 0.0008
        }
        if (child.userData?.crab) {
          child.position.x += Math.sin(elapsed * 1.2 + child.userData.phase) * 0.0015
          child.rotation.y = Math.sin(elapsed + child.userData.phase) * 0.2
        }
        if (child.userData?.fish) {
          child.position.x += Math.sin(elapsed * 0.72 + child.userData.phase) * 0.003
          child.position.y = -0.34 + Math.sin(elapsed * 1.4 + child.userData.phase) * 0.06
        }
        if (child.userData?.bird) {
          const radius = 5 + child.userData.phase * 0.8
          child.position.x = Math.cos(elapsed * 0.32 + child.userData.phase) * radius
          child.position.z = Math.sin(elapsed * 0.32 + child.userData.phase) * radius + 1
          child.rotation.y = -elapsed * 0.32 - child.userData.phase + Math.PI / 2
        }
        if (child.userData?.wing) child.rotation.y = Math.sin(elapsed * 5) * 0.35 * child.userData.side
      })

      if (engine.drone) {
        const radius = engine.mrvActive ? 9.5 : 3.8
        const speed = engine.mrvActive ? 0.82 : 0.27
        engine.drone.position.set(
          Math.cos(elapsed * speed) * radius,
          engine.mrvActive ? 7.6 + Math.sin(elapsed * 2) * 0.4 : 6.2,
          Math.sin(elapsed * speed) * radius - 0.5,
        )
        engine.drone.rotation.y = -elapsed * speed + Math.PI / 2
      }

      if (engine.boat) {
        engine.boat.position.y = -0.2 + Math.sin(elapsed * 1.1) * 0.042
        engine.boat.rotation.z = Math.sin(elapsed * 0.8) * 0.024
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
    engine.camera.zoom = 0.8
    engine.camera.updateProjectionMatrix()
    engine.controls.target.copy(DEFAULT_TARGET)
    engine.controls.update()
    engine.focusFrames = 0
  }, [cameraResetSignal])

  return <div ref={mountRef} className="mangrove-world-3d" />
}
