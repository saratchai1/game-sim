from pathlib import Path

app_path = Path('src/App.jsx')
world_path = Path('src/MangroveWorld3DNatural.jsx')
app = app_path.read_text()
world = world_path.read_text()

app_old = '''        day={game.day}
        upgrades={game.upgrades}
'''
app_new = '''        day={game.day}
        eventType={game.event?.id || null}
        upgrades={game.upgrades}
'''
if app_old not in app:
    raise SystemExit('World prop anchor not found in App.jsx')
app = app.replace(app_old, app_new, 1)

if 'function Water({ day }) {' not in world:
    raise SystemExit('Water signature not found')
world = world.replace('function Water({ day }) {', 'function Water({ day, eventType }) {', 1)

water_offset_old = '''  const tideOffset = [-0.08, -0.01, 0.11, 0.01][(Math.max(1, day) - 1) % 4]

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = -0.58 + tideOffset + Math.sin(state.clock.elapsedTime * 0.55) * 0.022
    }
  })
'''
water_offset_new = '''  const tideOffset = [-0.08, -0.01, 0.11, 0.01][(Math.max(1, day) - 1) % 4]
  const eventOffset = eventType === 'kingtide' ? 0.16 : 0
  const stormChop = eventType === 'storm' ? 0.045 : 0.022

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = -0.58 + tideOffset + eventOffset
        + Math.sin(state.clock.elapsedTime * (eventType === 'storm' ? 1.2 : 0.55)) * stormChop
    }
  })
'''
if water_offset_old not in world:
    raise SystemExit('Water offset block not found')
world = world.replace(water_offset_old, water_offset_new, 1)

cloud_signature_old = 'function Clouds() {'
cloud_signature_new = 'function Clouds({ storm = false }) {'
if cloud_signature_old not in world:
    raise SystemExit('Cloud signature not found')
world = world.replace(cloud_signature_old, cloud_signature_new, 1)

cloud_material_old = '<meshStandardMaterial color="#ffffff" roughness={0.96} transparent opacity={0.92} />'
cloud_material_new = '''<meshStandardMaterial
                  color={storm ? '#a8bcc4' : '#ffffff'}
                  roughness={0.96}
                  transparent
                  opacity={storm ? 0.98 : 0.92}
                />'''
if cloud_material_old not in world:
    raise SystemExit('Cloud material not found')
world = world.replace(cloud_material_old, cloud_material_new, 1)

components = r'''
function RainField() {
  const group = useRef()
  const drops = useMemo(() => (
    Array.from({ length: 72 }, (_, index) => ({
      x: -18 + pseudo(index * 4.7 + 3) * 36,
      y: 1.5 + pseudo(index * 7.3 + 8) * 12,
      z: -13 + pseudo(index * 9.1 + 11) * 28,
      length: 0.24 + pseudo(index * 2.3 + 17) * 0.34,
      speed: 5.5 + pseudo(index * 3.8 + 23) * 3.8,
    }))
  ), [])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.children.forEach((drop, index) => {
      drop.position.y -= delta * drop.userData.speed
      drop.position.x += delta * 0.65
      if (drop.position.y < -0.4) {
        const source = drops[index]
        drop.position.set(source.x - 2.5, 11.5 + pseudo(index * 6.2) * 3.5, source.z)
      }
    })
  })

  return (
    <group ref={group}>
      {drops.map((drop, index) => (
        <mesh
          key={index}
          position={[drop.x, drop.y, drop.z]}
          rotation={[0, 0, -0.18]}
          userData={{ speed: drop.speed }}
        >
          <boxGeometry args={[0.018, drop.length, 0.018]} />
          <meshBasicMaterial color="#d9f5ff" transparent opacity={0.58} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function FloatingTrash() {
  const pieces = useMemo(() => (
    Array.from({ length: 14 }, (_, index) => ({
      x: -12 + pseudo(index * 5.2 + 1) * 24,
      z: -11 + pseudo(index * 8.4 + 5) * 8,
      rotation: pseudo(index * 7.8 + 3) * Math.PI,
      color: ['#e9f2e9', '#ef8a6c', '#f4d35e', '#72bfd4'][index % 4],
      scale: 0.65 + pseudo(index * 3.3) * 0.6,
    }))
  ), [])

  return (
    <group>
      {pieces.map((piece, index) => (
        <Float key={index} speed={0.8 + (index % 3) * 0.2} rotationIntensity={0.28} floatIntensity={0.12}>
          <mesh
            position={[piece.x, -0.43, piece.z]}
            rotation={[0.3, piece.rotation, 0.2]}
            scale={piece.scale}
          >
            {index % 3 === 0
              ? <cylinderGeometry args={[0.055, 0.075, 0.32, 7]} />
              : <boxGeometry args={[0.18, 0.045, 0.12]} />}
            <meshStandardMaterial color={piece.color} roughness={0.72} transparent opacity={0.9} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function KingTideFoam() {
  const rings = useMemo(() => (
    Array.from({ length: 18 }, (_, index) => ({
      x: -13 + pseudo(index * 4.1 + 2) * 26,
      z: -10.5 + pseudo(index * 7.4 + 9) * 5,
      scale: 0.45 + pseudo(index * 2.7 + 6) * 0.8,
      rotation: pseudo(index * 3.5 + 12) * Math.PI,
    }))
  ), [])

  return (
    <group>
      {rings.map((ring, index) => (
        <Float key={index} speed={0.8 + (index % 4) * 0.1} rotationIntensity={0} floatIntensity={0.12}>
          <mesh
            position={[ring.x, -0.22, ring.z]}
            rotation={[-Math.PI / 2, 0, ring.rotation]}
            scale={[ring.scale * 1.7, ring.scale, 1]}
          >
            <torusGeometry args={[0.34, 0.025, 6, 24, Math.PI * 1.45]} />
            <meshBasicMaterial color="#e8fdff" transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function EventAtmosphere({ eventType }) {
  if (!eventType) return null

  return (
    <group>
      {eventType === 'storm' && <RainField />}
      {eventType === 'trash' && <FloatingTrash />}
      {eventType === 'kingtide' && <KingTideFoam />}
      {eventType === 'wildlife' && (
        <group>
          <Bird seed={5.4} />
          <Bird seed={7.1} />
          <Crab position={[-5.4, 0.47, -7.5]} seed={8} />
          <Crab position={[4.2, 0.47, -6.8]} seed={9} />
        </group>
      )}
      {eventType === 'fishers' && (
        <group>
          <Fish position={[-6.2, -0.42, -10.2]} color="#ffd166" seed={9.1} />
          <Fish position={[1.1, -0.44, -9.8]} color="#8ee0dd" seed={10.4} />
          <Fish position={[7.4, -0.43, -8.7]} color="#ff8f70" seed={11.7} />
        </group>
      )}
      {eventType === 'grant' && (
        <Sparkles
          count={46}
          scale={[7, 5, 5]}
          size={2.1}
          speed={0.7}
          color="#fff078"
          opacity={0.72}
          position={[6.5, 3.2, 9.8]}
        />
      )}
    </group>
  )
}

'''
camera_anchor = 'function CameraRig({ selectedPlot }) {'
if camera_anchor not in world:
    raise SystemExit('CameraRig anchor not found')
world = world.replace(camera_anchor, components + camera_anchor, 1)

scene_signature_old = 'function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades, day }) {'
scene_signature_new = 'function WorldScene({ plots, selectedPlot, activeSpecies, onPlotClick, upgrades, day, eventType }) {'
if scene_signature_old not in world:
    raise SystemExit('WorldScene signature not found')
world = world.replace(scene_signature_old, scene_signature_new, 1)

sky_old = """  const skyColor = day % 7 === 0 ? '#79ccef' : '#83d7f7'

  return (
"""
sky_new = """  const storm = eventType === 'storm'
  const skyColor = storm
    ? '#6f99a6'
    : eventType === 'kingtide'
      ? '#70c6e8'
      : day % 7 === 0
        ? '#79ccef'
        : '#83d7f7'

  return (
"""
if sky_old not in world:
    raise SystemExit('Sky color block not found')
world = world.replace(sky_old, sky_new, 1)

lighting_replacements = {
    '<ambientLight intensity={1.05} />': '<ambientLight intensity={storm ? 0.62 : 1.05} />',
    "<hemisphereLight args={['#f3fbff', '#695139', 2.15]} />": "<hemisphereLight args={[storm ? '#bbd4dc' : '#f3fbff', '#695139', storm ? 1.45 : 2.15]} />",
    '        intensity={3.45}': '        intensity={storm ? 1.75 : 3.45}',
    '      <Water day={day} />': '      <Water day={day} eventType={eventType} />',
    '      <Clouds />': '      <EventAtmosphere eventType={eventType} />\n      <Clouds storm={storm} />',
}
for source, target in lighting_replacements.items():
    if source not in world:
        raise SystemExit(f'Scene anchor not found: {source}')
    world = world.replace(source, target, 1)

required = [
    'eventType={game.event?.id || null}',
    'function RainField()',
    'function EventAtmosphere({ eventType })',
    '<Water day={day} eventType={eventType} />',
    '<Clouds storm={storm} />',
]
combined = app + world
missing = [item for item in required if item not in combined]
if missing:
    raise SystemExit(f'Missing event-atmosphere changes: {missing}')

app_path.write_text(app)
world_path.write_text(world)
