// QA only. Patch a detached copy of the locked baseline, never main or production.
// Exposes the SAME on-demand counters, without changing rendering or simulation.
import fs from 'node:fs/promises'
import path from 'node:path'
const root = process.argv[2]
if (!root) throw new Error('Provide the detached baseline directory')
const file = path.join(root, 'src/MangroveWorld3DNatural.jsx')
let source = await fs.readFile(file, 'utf8')
const start = source.indexOf('function WorldDiagnostics(')
const end = source.indexOf('\nfunction ', start + 1)
if (start < 0 || end < 0) throw new Error('Expected locked baseline diagnostics were not found')
source = "import { installWorldDiagnostics } from './world-diagnostics.js'\n" + source.slice(0, start) + `function WorldDiagnostics() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('qa')) return
    return installWorldDiagnostics({ gl, scene, camera, plotPositions: PLOT_POSITIONS,
      frames: { samples: [] }, resources: { stats: () => null }, quality: { tier: 'baseline' } })
  }, [gl, scene, camera])
  return null
}
` + source.slice(end)
source = source.replace('{import.meta.env.DEV && <WorldDiagnostics />}', '{(import.meta.env.DEV || import.meta.env.VITE_WORLD_QA === \'1\') && <WorldDiagnostics />}')
// Names only, to count existing actors that were not named by the old diagnostics.
source = source.replace('<group ref={drone}', '<group name="coast-drone" ref={drone}')
source = source.replace('<group ref={group} scale={0.7}>', '<group name={`coast-bird-${seed}`} ref={group} scale={0.7}>')
await fs.writeFile(file, source)
await fs.copyFile(new URL('../src/world-diagnostics.js', import.meta.url), path.join(root, 'src/world-diagnostics.js'))
console.log('Instrumented baseline counters and actor names only:', root)
