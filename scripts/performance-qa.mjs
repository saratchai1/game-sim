import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = path.resolve(process.env.PERF_ROOT || '.')
const output = process.env.PERF_OUTPUT || 'performance-artifacts/after'
const label = process.env.PERF_LABEL || 'after'
const { createInitialGame } = await import(pathToFileURL(path.join(root, 'src/game-data.js')))
const initial = createInitialGame()
const restored = { ...initial, day:24, coins:1800, biodiversity:75, community:55, coastal:65,
  journey:{...initial.journey,sandbox:true}, upgrades:{nursery:2,mrv:2,community:2},
  plots:initial.plots.map((p,i)=>({...p,species:p.tide==='สูง'?'avicennia':i%2?'rhizophora':'sonneratia',age:8,health:95,dead:false})),
  stats:{...initial.stats,planted:16} }
const saveKey = 'mangrove-bay-3d-save-v2'
const viewports = [ {width:1440,height:900,dpr:1,touch:false}, {width:1024,height:768,dpr:2,touch:true},
  {width:768,height:1024,dpr:2,touch:true}, {width:390,height:844,dpr:3,touch:true} ]
await fs.mkdir(output, { recursive:true })
const server = await preview({ root, configFile:false, preview:{host:'127.0.0.1',port:5177,strictPort:true}, logLevel:'error' })
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const errors = []
const report = { label, renderer:'Chromium / ANGLE SwiftShader (software, NOT physical device FPS)', runs:[], checks:[], errors }
async function open(size, game, delayScene=false) {
  const context = await browser.newContext({ viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr,hasTouch:size.touch,isMobile:size.touch })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(({saveKey,game})=>{localStorage.setItem(saveKey,JSON.stringify(game));localStorage.setItem('mangrove-bay-3d-help-seen','1')},{saveKey,game})
  let release
  if(delayScene) {
    const held = new Promise(resolve=>{release=resolve})
    await page.route('**/assets/MangroveWorld3DNatural-*.js', async route=>{await held;await route.continue()})
  }
  await page.goto('http://127.0.0.1:5177/?qa=1',{waitUntil:'domcontentloaded'})
  await page.locator('.top-hud').waitFor()
  const uiMs=await page.evaluate(()=>performance.now())
  return {page,context,uiMs,release}
}
async function ready(page) {
  await page.waitForFunction(()=>window.__coastDiagnostics?.().calls>0, null, {timeout:120000})
  if(label==='after') await page.locator('.world-loading').waitFor({state:'detached'})
  return page.evaluate(()=>performance.getEntriesByName('coast-world-ready')[0]?.startTime || performance.now())
}
const click = (locator,touch) => touch?locator.tap():locator.click()
async function cameraGesture(page,context,size) {
  const point=await page.evaluate(()=>{
    for(const y of [.4,.5,.3,.6])for(const x of [.55,.65,.45,.75]){
      const px=innerWidth*x,py=innerHeight*y
      if(document.elementFromPoint(px,py)?.tagName==='CANVAS')return{x:px,y:py}
    }
    throw new Error('No unobstructed canvas for gesture')
  })
  const before=await page.evaluate(()=>window.__coastDiagnostics().camera)
  if(size.touch){
    const cdp=await context.newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]})
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+i*6,y:point.y+i*2,id:1}]});await page.waitForTimeout(30)}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    await cdp.detach()
  } else {
    await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+60,point.y+20,{steps:8});await page.mouse.up()
  }
  await page.waitForTimeout(500)
  const after=await page.evaluate(()=>window.__coastDiagnostics().camera)
  assert.notDeepEqual(after,before,'camera must react to drag/touch')
  await click(page.getByRole('button',{name:'คืนมุมกล้อง',exact:true}),size.touch)
}
try {
  if(label==='after') {
    const {page,context,release}=await open(viewports[3],initial,true)
    await page.locator('.world-loading').waitFor()
    await click(page.getByRole('button',{name:'เปิดแผนภาคสนาม',exact:true}),true)
    assert.ok(await page.locator('.game-modal').isVisible(),'UI usable before scene download')
    await page.screenshot({path:`${output}/loading-ui-before-three.png`})
    await click(page.getByRole('button',{name:'ปิดแผนภาคสนาม',exact:true}),true)
    release();await ready(page);await context.close()
    report.checks.push('UI opens and accepts touch while scene JS is held; loading state clears after first frame')
  }
  for(const size of viewports) for(const [fixture,game] of Object.entries({initial,restored})) {
    const {page,context,uiMs}=await open(size,game)
    const worldMs=await ready(page)
    await page.waitForTimeout(4000)
    const timing=await page.evaluate(()=>new Promise(resolve=>{
      const samples=[];let last=performance.now(),start=last
      function tick(now){samples.push(now-last);last=now;if(now-start<2000)return requestAnimationFrame(tick)
        samples.sort((a,b)=>a-b);const mean=samples.reduce((a,b)=>a+b,0)/samples.length
        resolve({mean,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],fps:1000/mean,count:samples.length})}
      requestAnimationFrame(tick)
    }))
    const snapshot=await page.evaluate(()=>window.__coastDiagnostics())
    assert.equal(snapshot.actorCounts.crew,3)
    assert.equal(snapshot.actorCounts.villagers,5)
    assert.ok(snapshot.calls>0 && snapshot.triangles>0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow')
    await page.screenshot({path:`${output}/${fixture}-${size.width}x${size.height}.png`})
    const startActors=snapshot.actors
    await cameraGesture(page,context,size)
    const endActors=await page.evaluate(()=>window.__coastDiagnostics().actors)
    for(const actor of startActors.filter(a=>a.name.startsWith('crew-')||a.name==='coast-boat'))assert.notDeepEqual(endActors.find(a=>a.name===actor.name).position,actor.position,'actors still move')
    const beforeGame=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey)
    const began=Date.now()
    await click(page.getByRole('button',{name:'เปิดแผนภาคสนาม',exact:true}),size.touch)
    const modal=page.locator('.game-modal')
    await modal.waitFor()
    const uiResponseMs=Date.now()-began
    const scroll=await modal.evaluate(el=>{const max=el.scrollHeight-el.clientHeight;el.scrollTop=max;return {max,actual:el.scrollTop}})
    assert.ok(scroll.max<=1||scroll.actual>0,'planning content must scroll')
    await click(page.getByRole('button',{name:'ปิดแผนภาคสนาม',exact:true}),size.touch)
    await click(page.getByRole('button',{name:'เปิดแผนที่แปลง',exact:true}),size.touch)
    await click(page.locator('.plot-picker button').first(),size.touch)
    await page.locator('.selected-plot-card').waitFor()
    const afterGame=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey)
    assert.deepEqual(afterGame,beforeGame,'view/camera/touch selection must not mutate saved gameplay')
    await click(page.getByRole('button',{name:'ปิดรายละเอียด',exact:true}),size.touch)
    report.runs.push({fixture,viewport:size,uiMs,worldMs,uiResponseMs,frameTiming:timing,...snapshot})
    console.log(`${label} ${fixture} ${size.width}x${size.height}: calls=${snapshot.calls} triangles=${snapshot.triangles} heap=${snapshot.heapUsedBytes} fps(software)=${timing.fps.toFixed(1)}`)
    await context.close()
  }
  report.checks.push('all four viewports: drag/touch camera, reset, scrollable planning, selection, save unchanged, all existing crew/NPCs, live motion')
  assert.deepEqual(errors,[],'browser errors')
} finally {
  await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2))
  await browser.close()
  await new Promise(resolve=>server.httpServer.close(resolve))
}
