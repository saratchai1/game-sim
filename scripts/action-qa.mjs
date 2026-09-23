import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createState, SITES, STATION, floorHeight, SAVE_KEY } from '../src/action/simulation.js'
const base = process.env.QA_URL || 'http://127.0.0.1:4173'
const output = 'action-artifacts'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless:true, args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'] })
const errors=[], report={}
let activePage
function developed() {
  const s=createState();s.time=65;s.seeds=[1,1,1];s.cleaned=['t1','t2','t3'];s.sites.forEach(p=>{p.plantedAt=0});s.player.x=0;s.player.z=-2;s.player.y=floorHeight(0,-2);return s
}
async function pageFor(viewport, mobile=false, fixture=null, standalone=false) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile})
  if(fixture) await context.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:fixture})
  const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message))
  await page.goto(standalone ? pathToFileURL(resolve(output,'Mangrove-Ranger.html')).href : `${base}/action/`,{waitUntil:'networkidle'})
  await page.waitForSelector('#ranger-world canvas[data-ready="true"]',{timeout:60000})
  await page.click('#start');await page.waitForTimeout(1200)
  return {context,page}
}
async function hold(page,key,fn) {
  await page.keyboard.down(key)
  try{await page.waitForFunction(fn,SAVE_KEY,{timeout:45000})}finally{await page.keyboard.up(key)}
}
async function moveIntoSupplyRange(page) {
  await page.keyboard.down('a')
  try {
    await page.waitForFunction(()=>!document.querySelector('#prompt').hidden && document.querySelector('#prompt-title').textContent.includes('รับกล้าไม้'),null,{timeout:45000})
  } finally { await page.keyboard.up('a') }
}
async function touchJoystick(page,context) {
  const stick=await page.locator('#joystick').boundingBox()
  assert.ok(stick,'Touch joystick must be visible')
  const cdp=await context.newCDPSession(page)
  const x=stick.x+stick.width/2,y=stick.y+stick.height/2
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22,y,id:1}]})
  await page.waitForTimeout(250)
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await cdp.detach()
}
try {
  const desktop=await pageFor({width:1440,height:900})
  await desktop.page.screenshot({path:`${output}/action-desktop.png`})
  // Wait for actual proximity instead of assuming 500ms yields a fixed distance on software WebGL.
  await moveIntoSupplyRange(desktop.page)
  await hold(desktop.page,'e',key=>JSON.parse(localStorage.getItem(key)).seeds[0]===3)
  const saved=await desktop.page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)
  assert.ok(saved.player.x<-.5,'WASD movement must change the player position')
  report.movementAndSupply={passed:true,x:saved.player.x,seeds:saved.seeds}
  const fixture=createState();fixture.seeds=[3,3,3];Object.assign(fixture.player,{x:SITES[0].x,z:SITES[0].z,y:floorHeight(SITES[0].x,SITES[0].z)})
  await desktop.page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:fixture})
  await desktop.page.reload({waitUntil:'networkidle'});await desktop.page.waitForSelector('canvas[data-ready="true"]');await desktop.page.click('#start')
  await hold(desktop.page,'e',key=>JSON.parse(localStorage.getItem(key)).sites[0].plantedAt!==null)
  assert.equal(await desktop.page.evaluate(key=>JSON.parse(localStorage.getItem(key)).seeds[0],SAVE_KEY),2)
  report.holdToPlant=true
  await desktop.page.click('#pause');const oldTime=await desktop.page.evaluate(key=>JSON.parse(localStorage.getItem(key)).time,SAVE_KEY)
  await desktop.page.waitForTimeout(1000);assert.equal(await desktop.page.evaluate(key=>JSON.parse(localStorage.getItem(key)).time,SAVE_KEY),oldTime)
  report.pause=true
  await desktop.context.close()
  for(const [name,viewport,mobile,fixture] of [
    ['action-developed',{width:1440,height:900},false,developed()],
    ['action-mobile',{width:390,height:844},true,null],
    ['action-landscape',{width:844,height:390},true,developed()],
  ]) {
    const{context,page}=await pageFor(viewport,mobile,fixture)
    if(mobile){const b=await page.locator('#touch-e').boundingBox();assert.ok(b&&b.width>=44&&b.x+b.width<=viewport.width,'Touch action must remain on-screen');await touchJoystick(page,context)}
    await page.screenshot({path:`${output}/${name}.png`});report[name]=true;await context.close()
  }
  const complete=developed();complete.samples=3;complete.sites.slice(0,3).forEach(p=>{p.sampled=true});Object.assign(complete.player,{x:STATION.x,z:STATION.z,y:floorHeight(STATION.x,STATION.z)})
  const{context,page}=await pageFor({width:1440,height:900},false,complete)
  await hold(page,'e',key=>JSON.parse(localStorage.getItem(key)).verified===true)
  await page.waitForSelector('#completion:not([hidden])');await page.screenshot({path:`${output}/action-completion.png`})
  report.verificationAndCompletion=true
  const farm=await context.request.get(`${base}/`);assert.equal(farm.status(),200);assert.match(await farm.text(),/id="root"/);report.farmEntryPreserved=true
  await context.close()
  const offline=await pageFor({width:1280,height:800},false,null,true)
  await moveIntoSupplyRange(offline.page)
  await hold(offline.page,'e',key=>JSON.parse(localStorage.getItem(key)).seeds[0]===3)
  report.standaloneFilePlays=true
  await offline.page.screenshot({path:`${output}/action-standalone.png`});await offline.context.close()
  assert.deepEqual(errors,[],'No browser runtime exceptions')
  report.runtimeErrors=errors;report.passed=true
} catch(error) {
  report.passed=false;report.error=error.stack;report.runtimeErrors=errors
  if(activePage&&!activePage.isClosed()) {
    await activePage.screenshot({path:`${output}/action-failure.png`}).catch(()=>{})
    report.failureState=await activePage.evaluate(key=>({save:localStorage.getItem(key),text:document.body.innerText}),SAVE_KEY).catch(()=>null)
  }
  throw error
} finally {await fs.writeFile(`${output}/qa-report.json`,JSON.stringify(report,null,2));await browser.close()}
