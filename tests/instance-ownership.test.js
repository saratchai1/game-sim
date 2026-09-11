import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { InstancedMesh } from 'three'
import { applyProps } from '@react-three/fiber'
import { createWorldResources } from '../src/world-resources.js'

test('batch count-change cleanup preserves InstancedMesh.dispose and borrowed geometry', () => {
  const source = readFileSync(new URL('../src/SceneryBatch.jsx', import.meta.url), 'utf8')
  const primitive = source.match(/return <primitive[\s\S]*?\/>/)[0]
  assert.doesNotMatch(primitive, /dispose=/, 'primitive props must not overwrite its owned disposal method')
  const resources = createWorldResources()
  const geometry = resources.geometry('box', [1,1,1]), material = resources.material({ color: 'white' })
  let disposed = 0, geometryDisposals = 0
  geometry.addEventListener('dispose', () => geometryDisposals++)
  for (const count of [9,7,3,8]) {
    const mesh = new InstancedMesh(geometry, material, count)
    applyProps(mesh, { name: 'scenery-batch', castShadow: false, receiveShadow: true })
    mesh.addEventListener('dispose', () => disposed++)
    assert.equal(typeof mesh.dispose, 'function')
    mesh.dispose()
  }
  assert.equal(disposed, 4)
  assert.equal(geometryDisposals, 0, 'batch disposal must not dispose borrowed geometry')
  resources.dispose()
  assert.equal(geometryDisposals, 1)
})
