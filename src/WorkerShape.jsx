import { memo, useLayoutEffect, useRef } from 'react'
import { useWorldResources } from './WorldResources.jsx'
import { workerRaycast } from './workerVariants.js'

const shapes = {
  box: ['box', [1, 1, 1]], sphere: ['sphere', [.5, 14, 10]],
  tube: ['cylinder', [.42, .5, 1, 10]], cone: ['cone', [.5, 1, 10]],
  ring: ['torus', [.5, .06, 8, 16]],
}
export default memo(function WorkerShape({ shape = 'box', color, position, scale, rotation, name, children, castShadow }) {
  const resources = useWorldResources(), mesh = useRef()
  const [kind, args] = shapes[shape]
  const size = Array.isArray(scale) ? Math.max(...scale) : scale ?? 1
  useLayoutEffect(() => { mesh.current?.updateMatrix() }, [position, scale, rotation])
  return <mesh ref={mesh} name={name} geometry={resources.geometry(kind, args)}
    material={resources.material({ color, roughness: .72, flatShading: false })}
    dispose={null} raycast={workerRaycast} position={position} scale={scale} rotation={rotation}
    matrixAutoUpdate={false} castShadow={castShadow ?? size >= .18}>{children}</mesh>
})
