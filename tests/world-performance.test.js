import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorldResources } from '../src/world-resources.js'
import { renderingProfile, nextQuality } from '../src/render-quality.js'
import { workerPose, smoothPose, POSE_KEYS } from '../src/WorkerAnimationPose.js'

test('identical geometry and material requests reuse immutable GPU resources', () => {
  const r = createWorldResources()
  assert.equal(r.geometry('box', [1, 1, 1]), r.geometry('box', [1, 1, 1]))
  assert.notEqual(r.geometry('box', [1, 1, 1]), r.geometry('box', [2, 1, 1]))
  assert.equal(r.material({ color: '#aabbcc', roughness: .7 }), r.material({ roughness: .7, color: '#aabbcc' }))
  assert.notEqual(r.material({ color: '#aabbcc' }), r.material({ color: '#aabbcc' }, 'basic'))
  assert.throws(() => r.geometry('unknown', []), /Unknown/)
  r.dispose()
})
test('resource owners are isolated across scene mounts', () => {
  const a = createWorldResources(), b = createWorldResources()
  assert.notEqual(a.geometry('box', [1,1,1]), b.geometry('box', [1,1,1]))
  a.dispose()
  assert.equal(b.stats().geometries, 1)
  b.dispose()
})
test('shared resources dispose once on final release, and caches clear', () => {
  const r = createWorldResources()
  let geometries = 0, materials = 0
  r.geometry('box', [1,1,1]).addEventListener('dispose', () => geometries++)
  r.material({ color: 'white' }).addEventListener('dispose', () => materials++)
  r.geometry('box', [1,1,1]); r.material({ color: 'white' })
  r.dispose(); r.dispose()
  assert.deepEqual([geometries, materials], [1,1])
  assert.deepEqual(r.stats(), { geometries: 0, materials: 0 })
})
test('grass keeps five blades but one shared geometry and one wind uniform', () => {
  const r = createWorldResources(), tuft = r.grassGeometry()
  const blade = r.geometry('cone', [.045,.34,4])
  assert.equal(tuft.index.count, blade.index.count * 5)
  assert.equal(tuft, r.grassGeometry())
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>' }
  r.grassMaterial().onBeforeCompile(shader)
  assert.equal(shader.uniforms.uWorldWind, r.windTime)
  assert.match(shader.vertexShader, /USE_INSTANCING/)
  r.windTime.value = 9
  assert.equal(shader.uniforms.uWorldWind.value, 9)
  assert.equal(r.grassMaterial(), r.grassMaterial())
  r.dispose()
})
test('device quality caps Retina rendering without changing shadow resolution', () => {
  assert.equal(renderingProfile({ width: 1440, dpr: 2 }).maxDpr, 1.5)
  assert.equal(renderingProfile({ width: 1024, dpr: 2, coarse: true }).maxDpr, 1.35)
  assert.equal(renderingProfile({ width: 768, dpr: 2, coarse: true }).tier, 'tablet')
  assert.equal(renderingProfile({ width: 390, dpr: 3, coarse: true }).maxDpr, 1.25)
  assert.equal(renderingProfile({ width: 1440, dpr: 2, memory: 4 }).maxDpr, 1.25)
  assert.equal(renderingProfile().shadowSize, 1024)
  assert.equal(renderingProfile({ dpr: NaN }).maxDpr, 1)
})
test('adaptive DPR has bounded, asymmetric hysteresis instead of frame-by-frame state changes', () => {
  const profile = renderingProfile({ width: 390, dpr: 3 })
  const counters = { slow: 0, fast: 0 }
  let dpr = profile.maxDpr
  assert.equal(nextQuality(dpr, 40, profile, counters), dpr)
  dpr = nextQuality(dpr, 40, profile, counters)
  assert.equal(dpr, 1.15)
  for (let i = 0; i < 50; i++) dpr = nextQuality(dpr, 40, profile, counters)
  assert.equal(dpr, profile.minDpr)
  for (let i = 0; i < 50; i++) dpr = nextQuality(dpr, 16, profile, counters)
  assert.equal(dpr, profile.maxDpr)
  assert.equal(nextQuality(dpr, NaN, profile, counters), dpr)
})
test('reusable worker pose buffers preserve all animation states and clear prior poses', () => {
  const output = workerPose('plant', 1)
  for (const state of ['idle','walk','plant','cleanup','inspect','maintain','mrv','idle']) {
    assert.equal(workerPose(state, 2, output), output)
    assert.deepEqual(output, workerPose(state, 2))
    assert.deepEqual(Object.keys(output).sort(), [...POSE_KEYS].sort())
  }
  const current = workerPose('idle', 0)
  assert.equal(smoothPose(current, output, 0), current)
  assert.ok(Object.values(smoothPose(current, output, 5)).every(Number.isFinite))
})
