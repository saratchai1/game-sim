import { memo, useEffect, useLayoutEffect, useMemo } from 'react'
import { Color, InstancedMesh, Object3D, StaticDrawUsage } from 'three'
import { useWorldResources } from './WorldResources.jsx'

const noRaycast = () => null

// Only non-interactive scenery belongs here. Plot colliders, joint rigs and props
// with independent motion stay separate. Transforms/colors are uploaded once.
export const SceneryBatch = memo(function SceneryBatch({
  items, shape = 'box', args = [1, 1, 1], geometry: suppliedGeometry,
  material: suppliedMaterial, roughness = 1, flatShading = false,
  basic = false, opacity = 1, castShadow = false, receiveShadow = true,
  name = 'scenery-batch',
}) {
  const resources = useWorldResources()
  const geometry = suppliedGeometry || resources.geometry(shape, args)
  const material = suppliedMaterial || resources.material({
    color: '#ffffff', ...(basic ? {} : { roughness, flatShading }),
    transparent: opacity < 1, opacity, depthWrite: opacity === 1,
  }, basic ? 'basic' : 'standard')
  const mesh = useMemo(() => {
    const result = new InstancedMesh(geometry, material, items.length)
    result.instanceMatrix.setUsage(StaticDrawUsage)
    result.raycast = noRaycast
    return result
  }, [geometry, material, items.length])

  useLayoutEffect(() => {
    const transform = new Object3D()
    const color = new Color()
    items.forEach((item, index) => {
      transform.position.fromArray(item.position || [0, 0, 0])
      transform.rotation.set(...(item.rotation || [0, 0, 0]))
      if (Array.isArray(item.scale)) transform.scale.fromArray(item.scale)
      else transform.scale.setScalar(item.scale ?? 1)
      transform.updateMatrix()
      mesh.setMatrixAt(index, item.matrix || transform.matrix)
      mesh.setColorAt(index, color.set(item.color || '#ffffff'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    // Shader wind moves only the blade tips; keep frustum bounds conservative.
    if (mesh.boundingSphere) mesh.boundingSphere.radius += .08
  }, [items, mesh])
  useEffect(() => () => mesh.dispose(), [mesh])
  return <primitive object={mesh} name={name} castShadow={castShadow}
    receiveShadow={receiveShadow} dispose={null} />
})

export const GrassPatch = memo(function GrassPatch({ items, name = 'grass-patch' }) {
  const resources = useWorldResources()
  return <SceneryBatch items={items} geometry={resources.grassGeometry()}
    material={resources.grassMaterial()} name={name} receiveShadow />
})
