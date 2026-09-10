from pathlib import Path

path = Path('src/MangroveWorld3DNatural.jsx')
code = path.read_text()

old = '''  return (
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
'''

new = '''  return (
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

if old not in code:
    raise SystemExit('Expected WaterChannel render block not found')

code = code.replace(old, new, 1)
path.write_text(code)
