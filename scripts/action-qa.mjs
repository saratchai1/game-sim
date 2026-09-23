import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createState, SITES, STATION, floorHeight, SAVE_KEY } from '../src/action/simulation.js'
const base = process.env.QA_URL || 'http://127.0.0.1:4173'
const output = 'action-artifacts'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless:true, args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'] })
const errors=[], report={}
function developed() {
 const s=createState();s.time=65;s.seeds=[1,1,1];s.cleaned=['t1','t2','t3'];s.sites.forEach(p=>{p.plantedAt=0});s.player.x=0;s.player.z=-2;s.player.y=floorHeight(0,-2);return s
}
async function pageFor(viewport, mobile=false, fixture=null) {
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile})
 if(fixture) await context.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:fixture})
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${base}/action/`,{waitUntil:'networkidle'})
 await page.waitForSelector('#ranger-world canvas[data-ready="true"]',{timeout:60000})
 await page.click('#start');await page.waitForTimeout(800)
 return {context,page}
}
async function hold(page,key,fn) {
 await page.keyboard.down(key)
 try{await page.waitForFunction(fn,SAVE_KEY,{timeout:15000})}finally{await page.keyboard.up(key)}
}
try {
 const desktop=await pageFor({width:1440,height:900})
 await desktop.page.screenshot({path:`${output}/action-desktop.png`})
 await desktop.page.keyboard.down('a');await desktop.page.waitForTimeout(500);await desktop.page.keyboard.up('a')
 await hold(desktop.page,'e',key=>JSON.parse(localStorage.getItem(key)).seeds[0]===3)
 const saved=await desktop.page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)
 assert.ok(saved.player.x<-.5,'WASD movement must change the player position')
 report.movementAndSupply=true
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
  if(mobile){const b=await page.locator('#touch-e').boundingBox();assert.ok(b&&b.width>=44&&b.x+b.width<=viewport.width,'Touch action must remain on-screen');const stick=await page.locator('#joystick').boundingBox();await page.dispatchEvent('#joystick','pointerdown',{pointerId:1,clientX:stick.x+stick.width/2,clientY:stick.y+stick.height/2,pointerType:'touch',bubbles:true});await page.dispatchEvent('#joystick','pointerup',{pointerId:1,pointerType:'touch',bubbles:true})}
  await page.screenshot({path:`${output}/${name}.png`});report[name]=true;await context.close()
 }
 const complete=developed();complete.samples=3;complete.sites.slice(0,3).forEach(p=>{p.sampled=true});Object.assign(complete.player,{x:STATION.x,z:STATION.z,y:floorHeight(STATION.x,STATION.z)})
 const{context,page}=await pageFor({width:1440,height:900},false,complete)
 await hold(page,'e',key=>JSON.parse(localStorage.getItem(key)).verified===true)
 await page.waitForSelector('#completion:not([hidden])');await page.screenshot({path:`${output}/action-completion.png`})
 report.verificationAndCompletion=true
 const farm=await context.request.get(`${base}/`);assert.equal(farm.status(),200);assert.match(await farm.text(),/id="root"/);report.farmEntryPreserved=true
 await context.close()
 assert.deepEqual(errors,[],'No browser runtime exceptions')
 report.runtimeErrors=errors;report.passed=true
} catch(error) {report.passed=false;report.error=error.stack;report.runtimeErrors=errors;throw error}
finally{await fs.writeFile(`${output}/qa-report.json`,JSON.stringify(report,null,2));await browser.close()}
