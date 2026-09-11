import {
  BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry,
  DodecahedronGeometry, CircleGeometry, PlaneGeometry, OctahedronGeometry,
  MeshStandardMaterial, MeshBasicMaterial,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const constructors = {
  box: BoxGeometry, sphere: SphereGeometry, cylinder: CylinderGeometry,
  cone: ConeGeometry, torus: TorusGeometry, leaf: DodecahedronGeometry,
  circle: CircleGeometry, plane: PlaneGeometry, octahedron: OctahedronGeometry,
}

// One owner per Canvas. Consumers borrow immutable resources; only the owner disposes.
export function createWorldResources() {
  const geometries = new Map()
  const materials = new Map()
  const windTime = { value: 0 }
  const keyFor = (value) => JSON.stringify(value, Object.keys(value).sort())
  const resources = {
    windTime,
    geometry(kind, args) {
      const key = `${kind}:${JSON.stringify(args)}`
      if (!geometries.has(key)) {
        if (!constructors[kind]) throw new Error(`Unknown scenery geometry: ${kind}`)
        geometries.set(key, new constructors[kind](...args))
      }
      return geometries.get(key)
    },
    material(options = {}, kind = 'standard') {
      const key = `${kind}:${keyFor(options)}`
      if (!materials.has(key)) {
        const Material = kind === 'basic' ? MeshBasicMaterial : MeshStandardMaterial
        materials.set(key, new Material(options))
      }
      return materials.get(key)
    },
    grassGeometry() {
      if (!geometries.has('grass-tuft')) {
        const blades = Array.from({ length: 5 }, (_, index) => {
          const blade = new ConeGeometry(.045, .34, 4)
          blade.rotateZ((index - 2) * .08)
          blade.translate((index - 2) * .055, .17, Math.sin(index * 2.71) * .055)
          return blade
        })
        const tuft = mergeGeometries(blades)
        blades.forEach((blade) => blade.dispose())
        geometries.set('grass-tuft', tuft)
      }
      return geometries.get('grass-tuft')
    },
    grassMaterial() {
      if (!materials.has('grass-wind')) {
        const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true })
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uWorldWind = windTime
          shader.vertexShader = `uniform float uWorldWind;\n${shader.vertexShader}`.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             #ifdef USE_INSTANCING
               vec4 anchor = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
               float phase = dot(anchor.xz, vec2(3.73, 1.61));
               transformed.x += sin(uWorldWind * 0.8 + phase) * 0.022 * position.y;
             #endif`,
          )
        }
        material.customProgramCacheKey = () => 'coast-grass-wind-v1'
        materials.set('grass-wind', material)
      }
      return materials.get('grass-wind')
    },
    stats() { return { geometries: geometries.size, materials: materials.size } },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      geometries.clear()
      materials.clear()
    },
  }
  return resources
}
