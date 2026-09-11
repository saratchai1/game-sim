import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
// CI installs Playwright without saving it as an app dependency.
const { chromium } = await import(process.env.QA_PLAYWRIGHT_MODULE || 'playwright')
const outputDir = process.env.QA_OUTPUT || 'visual-qa'
const saveKey = 'mangrove-bay-3d-save-v2'
let server
if (process.env.QA_LOCAL_SERVER === '1') {
  const { createServer } = await import('vite')
  server = await createServer({ server: { host: '127.0.0.1', port: 5173 }, logLevel: 'error' })
  await server.listen()
}
await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  ...(process.env.QA_BROWSER_PATH ? { executablePath: process.env.QA_BROWSER_PATH } : {}),
  args: ['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const errors = []
const report = { viewports: [], checks: [], errors }
const check = (name) => { report.checks.push(name); console.log(`PASS ${name}`) }
const state = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey)
async function open(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errors.push(e.stack || e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.addInitScript(() => localStorage.setItem('mangrove-bay-3d-help-seen','1'))
  await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:5173'}/?qa=1`)
  await page.waitForFunction(() => window.__coastDiagnostics?.().actors.length >= 4)
  await page.evaluate(() => document.fonts.ready)
  return page
}
async function shot(page,name) {
  await page.screenshot({ path: `${outputDir}/${name}.png` })
}
async function layout(page) {
  return page.evaluate(() => {
    const inspect = (selector) => {
      const e = document.querySelector(selector), r=e.getBoundingClientRect()
      return { selector, x:r.x, y:r.y, width:r.width, height:r.height, visible:getComputedStyle(e).display !== 'none' }
    }
    return { viewport: { width:innerWidth, height:innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth,
      elements:['.top-hud','.left-stack','.plant-dock','.utility-rail','.notice-toast'].map(inspect) }
  })
}
async function endDay(page) {
  await page.getByRole('button',{name:'จบวันนี้',exact:true}).click()
  await page.getByRole('button',{name:/ยืนยันจบวัน/}).click()
  const g=await state(page)
  if(g.event) {
    await page.locator('.choice-list button:not(:disabled)').last().click()
    assert.equal((await state(page)).event,null)
  }
}
async function selectPlot(page,id) {
  await page.getByRole('button',{name:'เปิดแผนที่แปลง',exact:true}).click()
  await page.locator('.plot-picker button').nth(id-1).click()
}
try {
  const page=await open({width:1440,height:900})
  await shot(page,'desktop-initial')
  const before = await page.evaluate(()=>window.__coastDiagnostics())
  await page.waitForTimeout(1500)
  const after = await page.evaluate(()=>window.__coastDiagnostics())
  for(const actor of before.actors.filter(a=>a.name.startsWith('crew-')||a.name==='coast-boat')) {
    assert.notDeepEqual(after.actors.find(a=>a.name===actor.name).position,actor.position,`${actor.name} must move`)
  }
  report.render = { calls:after.calls, triangles:after.triangles, actorCount:after.actors.length }
  check('three articulated characters and the boat move in the live scene')
  await page.getByRole('button',{name:'เปิดแผนภาคสนาม',exact:true}).click()
  await shot(page,'desktop-planning')
  await page.locator('.contract-offers button').filter({hasText:'รากใหม่'}).click()
  await page.locator('[data-crew="clean"]').click()
  assert.equal((await state(page)).expedition.counters.clean,1)
  assert.equal(await page.locator('[data-crew="clean"]').isDisabled(),true)
  await page.getByRole('button',{name:'ปิดแผนภาคสนาม',exact:true}).click()
  check('accepting a contract and doing fieldwork persists and blocks double rewards')

  // Real canvas raycasting selects an empty plot without spending coins.
  const projected=(await page.evaluate(()=>window.__coastDiagnostics())).plots.find(p=>p.id===5)
  const beforeSelect=await state(page)
  await page.mouse.click(projected.x,projected.y)
  await page.waitForSelector('.confirm-plant')
  assert.equal((await state(page)).coins,beforeSelect.coins)
  await shot(page,'desktop-plot-preview')
  await page.locator('.confirm-plant').click()
  assert.equal((await state(page)).plots[4].species,'rhizophora')
  // Plant the rest through the keyboard-accessible map.
  await page.locator('.species-tool').nth(2).click()
  await selectPlot(page,1); await page.locator('.confirm-plant').click()
  await page.locator('.species-tool').nth(1).click()
  await selectPlot(page,11); await page.locator('.confirm-plant').click()
  await page.locator('.mission-card button').click()
  await page.locator('.restoration-card .field-plan-button').click()
  assert.equal((await state(page)).expedition.completed,1)
  check('canvas preview, three species, mission reward and restoration delivery work together')
  // Selection details must remain usable at tablet width.
  await selectPlot(page,4)
  const funds=(await state(page)).coins
  await page.locator('.soil-action').click()
  assert.equal((await state(page)).coins,funds-40)
  assert.equal((await state(page)).plots[3].prepared,true)
  await page.reload();await page.waitForFunction(()=>window.__coastDiagnostics)
  assert.equal((await state(page)).plots[3].prepared,true)
  check('soil improvement and contract completion survive reload')

  for(let i=0;i<6;i++) await endDay(page)
  assert.equal((await state(page)).day,7)
  assert.equal((await state(page)).plots.filter(p=>p.species&&p.age>=6).length,3)
  await page.getByRole('button',{name:'เปิดแผนภาคสนาม',exact:true}).click()
  assert.equal(await page.locator('[data-crew="survey"]').isEnabled(),true)
  await page.locator('[data-crew="survey"]').click()
  await page.getByRole('button',{name:'ปิดแผนภาคสนาม',exact:true}).click()
  check('growth, forecast storm resolution and habitat-driven survey unlock succeed')
  await page.getByRole('button',{name:'เปิดเศรษฐกิจ',exact:true}).click()
  await page.locator('.carbon-panel .primary-game-button').click()
  const verified=await state(page)
  assert.equal(verified.estimatedCarbon,0)
  assert.ok(verified.credits>0)
  await page.locator('.market-actions button').last().click()
  assert.ok((await state(page)).coins>verified.coins)
  await page.getByRole('button',{name:'ปิดเศรษฐกิจ',exact:true}).click()
  check('earned carbon can be verified and sold through the collapsed economy panel')
  await page.getByRole('button',{name:'โหมดชมวิว',exact:true}).click()
  assert.equal(await page.locator('.game-ui').isVisible(),false)
  await shot(page,'desktop-photo')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.game-ui').isVisible(),true)
  check('photo mode hides HUD and Escape restores play')
  await shot(page,'desktop-played')

  const played=await state(page)
  for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]) {
    await page.setViewportSize(viewport)
    const l=await layout(page)
    assert.equal(l.overflow,false)
    for(const e of l.elements.filter(e=>e.visible)) {
      assert.ok(e.x>=-1 && e.y>=-1 && e.x+e.width<=viewport.width+1 && e.y+e.height<=viewport.height+1,`viewport overflow: ${e.selector} ${JSON.stringify(e)}`)
    }
    const dock=l.elements.find(e=>e.selector==='.plant-dock'), rail=l.elements.find(e=>e.selector==='.utility-rail')
    const overlap = dock.x<rail.x+rail.width && dock.x+dock.width>rail.x && dock.y<rail.y+rail.height && dock.y+dock.height>rail.y
    assert.equal(overlap,false,'toolbars must not overlap')
    await shot(page,`layout-${viewport.width}`)
    await page.getByRole('button',{name:'เปิดแผนภาคสนาม',exact:true}).click()
    await shot(page,`planning-${viewport.width}`)
    await page.getByRole('button',{name:'ปิดแผนภาคสนาม',exact:true}).click()
    await selectPlot(page,1)
    const detail=await page.locator('.selected-plot-card').boundingBox()
    assert.ok(detail.x>=0 && detail.y>=0 && detail.x+detail.width<=viewport.width+1)
    await shot(page,`selection-${viewport.width}`)
    await page.getByRole('button',{name:'ปิดรายละเอียด',exact:true}).click()
    report.viewports.push(l)
  }
  check('desktop, landscape tablet, portrait tablet and phone controls stay inside viewport without overlapping toolbars')

  // Established habitat is a documented fixture, not the source of core-loop success.
  const developed={...played,day:24,coins:1800,biodiversity:75,community:55,coastal:65,
    journey:{...played.journey,sandbox:true},upgrades:{nursery:2,mrv:2,community:2},
    plots:played.plots.map((p,i)=>({...p,species:p.tide==='สูง'?'avicennia':i%2?'rhizophora':'sonneratia',age:8,health:95,dead:false})),stats:{...played.stats,planted:16}}
  await page.evaluate(({key,g})=>localStorage.setItem(key,JSON.stringify(g)),{key:saveKey,g:developed})
  await page.setViewportSize({width:1440,height:900});await page.reload()
  await page.waitForFunction(()=>window.__coastDiagnostics?.().actors.length>4)
  await shot(page,'desktop-restored')
  const animals1=await page.evaluate(()=>window.__coastDiagnostics())
  await page.waitForTimeout(1200)
  const animals2=await page.evaluate(()=>window.__coastDiagnostics())
  for(const animal of animals1.actors.filter(a=>/coast-crab|coast-fish/.test(a.name))) assert.notDeepEqual(animals2.actors.find(a=>a.name===animal.name).position,animal.position)
  report.restoredRender={calls:animals2.calls,triangles:animals2.triangles,actorCount:animals2.actors.length}
  check('restored habitat adds wildlife whose positions animate')
  // Recorded forecast changes the scene and the actual decision.
  await page.evaluate((key)=>{const g=JSON.parse(localStorage.getItem(key));g.day=25;g.event={id:'storm'};localStorage.setItem(key,JSON.stringify(g))},saveKey)
  await page.reload();await page.waitForSelector('.event-modal')
  await shot(page,'desktop-storm')
  await page.locator('.choice-list button').last().click()
  assert.equal((await state(page)).event,null)
  check('a saved weather event rehydrates and resolves')
  assert.deepEqual(errors,[],'browser console/page errors')
  check('no browser console errors or unhandled page errors')
} finally {
  await fs.writeFile(`${outputDir}/qa-report.json`,JSON.stringify(report,null,2))
  await browser.close()
  await server?.close()
}
