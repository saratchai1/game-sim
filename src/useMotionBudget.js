import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

// Locomotion/assignments keep running. Only invisible or distant joint poses skip
// work; an actor can still walk back into view. No mounts, LOD popping, or React state.
export function useMotionBudget(root, phase = 0) {
  const camera = useThree((state) => state.camera)
  return useMemo(() => {
    const point = new Vector3()
    let nextCheck = phase * .047, visible = true, accumulated = 0
    return (elapsed, delta) => {
      accumulated = Math.min(.1, accumulated + delta)
      if (elapsed >= nextCheck && root.current) {
        nextCheck = elapsed + .35
        root.current.getWorldPosition(point).project(camera)
        visible = point.x > -1.25 && point.x < 1.25 && point.y > -1.25 && point.y < 1.25 && point.z > -1 && point.z < 1
      }
      if (!visible || (camera.zoom < 24 && accumulated < 1 / 30)) return 0
      const step = accumulated; accumulated = 0
      return step
    }
  }, [camera, root, phase])
}
