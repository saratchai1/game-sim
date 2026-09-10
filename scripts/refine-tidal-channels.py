from pathlib import Path

path = Path('src/MangroveWorld3DNatural.jsx')
code = path.read_text()

old = '''  return (
    <group>
      <mesh
        geometry={geometry}
        scale={[1.2, 0.05, 1.2]}
        position={[0, 0.46, 0]}
        renderOrder={2}
        receiveShadow
      >
        <meshStandardMaterial
          color="#5d4939"
          roughness={1}
          transparent
          opacity={0.72}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[1, 0.035, 1]}
        position={[0, 0.505, 0]}
        renderOrder={3}
      >
        <meshStandardMaterial
          color="#39c4dc"
          emissive="#0c657c"
          emissiveIntensity={0.18}
          roughness={0.16}
          transparent
          opacity={0.96}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[0.78, 0.012, 0.78]}
        position={[0, 0.535, 0]}
        renderOrder={4}
      >
        <meshBasicMaterial
          color="#d8fbff"
          transparent
          opacity={0.32}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-6}
        />
      </mesh>
    </group>
  )
'''

new = '''  return (
    <group>
      <mesh
        geometry={geometry}
        scale={[1.12, 0.022, 1.12]}
        position={[0, 0.448, 0]}
        renderOrder={2}
      >
        <meshStandardMaterial
          color="#6b5542"
          roughness={1}
          transparent
          opacity={0.46}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[1, 0.018, 1]}
        position={[0, 0.472, 0]}
        renderOrder={3}
      >
        <meshStandardMaterial
          color="#52bfd1"
          emissive="#0e6475"
          emissiveIntensity={0.08}
          roughness={0.22}
          transparent
          opacity={0.88}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-3}
        />
      </mesh>
      <mesh
        geometry={geometry}
        scale={[0.7, 0.006, 0.7]}
        position={[0, 0.486, 0]}
        renderOrder={4}
      >
        <meshBasicMaterial
          color="#e1fbff"
          transparent
          opacity={0.18}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-5}
        />
      </mesh>
    </group>
  )
'''

if old not in code:
    raise SystemExit('Raised channel block not found')
code = code.replace(old, new, 1)

replacements = {
    '<WaterChannel points={channelA} radius={0.48} />': '<WaterChannel points={channelA} radius={0.34} />',
    '<WaterChannel points={channelB} radius={0.42} />': '<WaterChannel points={channelB} radius={0.3} />',
    '<WaterChannel points={channelC} radius={0.46} />': '<WaterChannel points={channelC} radius={0.33} />',
}
for source, target in replacements.items():
    if source not in code:
        raise SystemExit(f'Channel call not found: {source}')
    code = code.replace(source, target, 1)

path.write_text(code)
