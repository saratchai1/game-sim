import { useMemo } from 'react'
import * as THREE from 'three'
import { workerRaycast } from './workerVariants.js'
// Shared low-resolution primitive geometries/materials across every joint and prop.
const shapes={
  box:new THREE.BoxGeometry(1,1,1), sphere:new THREE.SphereGeometry(.5,10,7),
  tube:new THREE.CylinderGeometry(.42,.5,1,8), cone:new THREE.ConeGeometry(.5,1,8),
  ring:new THREE.TorusGeometry(.5,.06,5,12),
}
const materials=new Map()
export default function WorkerShape({ shape='box', color, position, scale, rotation, name, children }) {
  const material=useMemo(()=>{
    if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.84,flatShading:true}))
    return materials.get(color)
  },[color])
  return <mesh name={name} geometry={shapes[shape]} material={material} dispose={null} raycast={workerRaycast} position={position} scale={scale} rotation={rotation} castShadow>{children}</mesh>
}
