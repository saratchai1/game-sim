import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const root=process.argv[2]||'performance-artifacts'
const read=async file=>JSON.parse(await fs.readFile(`${root}/${file}`,'utf8'))
const before=await read('before/report.json'),after=await read('after/report.json')
const oldBundle=await read('bundle-before.json'),newBundle=await read('bundle-after.json')
assert.equal(before.runs.length,8);assert.equal(after.runs.length,8)
assert.ok(newBundle.initialBytes<oldBundle.initialBytes*.4,'initial JS must drop substantially')
const rows=after.runs.map((a,i)=>{
  const b=before.runs[i]
  assert.equal(a.fixture,b.fixture);assert.deepEqual(a.viewport,b.viewport)
  assert.deepEqual(a.actorCounts,b.actorCounts,'no loss of existing actors')
  assert.ok(a.calls<b.calls*.85,'at least 15% fewer calls in every measured view')
  return {fixture:a.fixture,viewport:`${a.viewport.width}x${a.viewport.height}`,
    calls:[b.calls,a.calls],triangles:[b.triangles,a.triangles],geometries:[b.geometries,a.geometries],
    heapMiB:[b.heapUsedBytes,a.heapUsedBytes].map(n=>n?+(n/1048576).toFixed(1):null),
    softwareFps:[b.frameTiming.fps,a.frameTiming.fps].map(n=>+n.toFixed(1)),dpr:[b.dpr,a.dpr],actors:a.actorCounts}
})
const result={initialBytes:[oldBundle.initialBytes,newBundle.initialBytes],initialGzipBytes:[oldBundle.initialGzipBytes,newBundle.initialGzipBytes],totalBytes:[oldBundle.totalBytes,newBundle.totalBytes],rows}
await fs.writeFile(`${root}/comparison.json`,JSON.stringify(result,null,2))
console.log(JSON.stringify(result,null,2))
