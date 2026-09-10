from pathlib import Path

path = Path('src/MangroveWorld3DNatural.jsx')
code = path.read_text()

stage_anchor = """  const stageScale = plot.age < 1 ? 0.35 : plot.age < 3 ? 0.58 : plot.age < 6 ? 0.82 : 1
  const healthScale = 0.8 + (Math.max(plot.health, 10) / 100) * 0.2
"""
stage_replacement = """  const stageScale = plot.age < 1 ? 0.35 : plot.age < 3 ? 0.58 : plot.age < 6 ? 0.82 : 1
  const growthScale = useRef(plot.age === 0 ? 0.12 : stageScale)
  const healthScale = 0.8 + (Math.max(plot.health, 10) / 100) * 0.2
"""
if stage_anchor not in code:
    raise SystemExit('Tree stage anchor not found')
code = code.replace(stage_anchor, stage_replacement, 1)

frame_old = """  useFrame((state) => {
    if (!group.current || plot.dead) return
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.85 + seed) * 0.018
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.66 + seed) * 0.011
  })
"""
frame_new = """  useFrame((state, delta) => {
    if (!group.current || plot.dead) return
    growthScale.current = THREE.MathUtils.damp(growthScale.current, stageScale, 5.8, delta)
    group.current.scale.setScalar(growthScale.current)
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.85 + seed) * 0.018
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.66 + seed) * 0.011
  })
"""
if frame_old not in code:
    raise SystemExit('Tree animation block not found')
code = code.replace(frame_old, frame_new, 1)

scale_old = """      rotation={[0, pseudo(seed) * Math.PI * 2, 0]}
      scale={stageScale}
"""
scale_new = """      rotation={[0, pseudo(seed) * Math.PI * 2, 0]}
      scale={growthScale.current}
"""
if scale_old not in code:
    raise SystemExit('Tree scale prop not found')
code = code.replace(scale_old, scale_new, 1)

carbon_component = r'''
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

'''
dead_anchor = 'function DeadTree() {'
if dead_anchor not in code:
    raise SystemExit('DeadTree anchor not found')
code = code.replace(dead_anchor, carbon_component + dead_anchor, 1)

flower_block = """      {plot.age >= 5 && plot.species === 'sonneratia' && (
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
"""
flower_replacement = flower_block + """
      {plot.age >= 6 && plot.health >= 70 && <BlueCarbonOrb seed={seed} />}
"""
if flower_block not in code:
    raise SystemExit('Sonneratia flower block not found')
code = code.replace(flower_block, flower_replacement, 1)

channel_old = """  return (
    <mesh geometry={geometry} scale={[1, 0.12, 1]} position={[0, 0.22, 0]} receiveShadow>
      <meshStandardMaterial color="#45b5cc" roughness={0.24} transparent opacity={0.9} />
    </mesh>
  )
"""
channel_new = """  return (
    <group>
      <mesh geometry={geometry} scale={[1.08, 0.22, 1.08]} position={[0, 0.29, 0]} receiveShadow>
        <meshStandardMaterial color="#66503e" roughness={1} />
      </mesh>
      <mesh geometry={geometry} scale={[1, 0.09, 1]} position={[0, 0.38, 0]} receiveShadow>
        <meshStandardMaterial color="#3fb9d2" roughness={0.2} transparent opacity={0.94} />
      </mesh>
      <mesh geometry={geometry} scale={[0.93, 0.025, 0.93]} position={[0, 0.425, 0]}>
        <meshBasicMaterial color="#b9f4fb" transparent opacity={0.24} depthWrite={false} />
      </mesh>
    </group>
  )
"""
if channel_old not in code:
    raise SystemExit('WaterChannel render block not found')
code = code.replace(channel_old, channel_new, 1)

zoom_old = """    const responsiveZoom = size.width < 600
      ? 22
      : size.width < 900
        ? 30
"""
zoom_new = """    const responsiveZoom = size.width < 600
      ? 26
      : size.width < 900
        ? 32
"""
if zoom_old not in code:
    raise SystemExit('Responsive camera zoom block not found')
code = code.replace(zoom_old, zoom_new, 1)

required = [
    'function BlueCarbonOrb',
    'growthScale.current = THREE.MathUtils.damp',
    '<mesh geometry={geometry} scale={[1, 0.09, 1]} position={[0, 0.38, 0]}',
    '? 26',
]
missing = [item for item in required if item not in code]
if missing:
    raise SystemExit(f'Missing depth-pass changes: {missing}')

path.write_text(code)
