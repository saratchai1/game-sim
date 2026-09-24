import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { APPEARANCE_KEY, PRESETS, DEFAULT_APPEARANCE, appearanceSignature } from '../src/action/appearance.js'
import { SAVE_KEY } from '../src/action/simulation.js'
const base=process.env.QA_URL||'http://127.0.0.1:4173',out='action-artifacts'
await fs.mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']})
const errors=[],report={};let active
async function open(viewport={width:1440,height:960},mobile=false,offline=false){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();active=page
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
 await page.goto(offline?pathToFileURL(resolve(out,'Mangrove-Ranger.html')).href:`${base}/action/`,{waitUntil:'networkidle'})
 await page.waitForSelector('#ranger-world canvas[data-ready="true"]',{timeout:60000});await page.click('#start');await page.click('#pause');await page.click('#wardrobe-pause')
 await page.waitForSelector('#locker-canvas canvas');await page.waitForTimeout(1200)
 return{context,page}
}
const game=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),APPEARANCE_KEY)
const shot=(page,name)=>page.screenshot({path:`${out}/${name}.png`})
try{
 const {context,page}=await open()
 await shot(page,'wardrobe-desktop');const before=await game(page)
 await page.keyboard.down('w');await page.keyboard.down('e');await page.waitForTimeout(400);await page.keyboard.up('w');await page.keyboard.up('e')
 assert.equal((await game(page)).time,before.time);assert.equal((await game(page)).player.z,before.player.z);report.pausedDuringCustomization=true
 await page.click('[data-tab="loadouts"]');await page.click('[data-preset="rescue"]')
 await page.waitForTimeout(700);await shot(page,'wardrobe-rescue')
 await page.click('[data-angle="2.9"]');await page.waitForTimeout(400);await shot(page,'wardrobe-backpack')
 await page.click('[data-angle="-.23"]');await page.click('[data-tab="appearance"]');await page.click('[data-field="skin"][data-value="tan"]');await page.click('[data-field="hair"][data-value="tied"]')
 await page.click('[data-tab="loadouts"]');await page.click('[data-store="0"]')
 const expected={...PRESETS[1].outfit,skin:'tan',hair:'tied'}
 assert.equal(await page.locator('#locker-canvas canvas').getAttribute('data-outfit'),appearanceSignature(expected))
 await page.click('#locker-apply');assert.equal(await page.locator('#wardrobe-screen').count(),0)
 assert.equal(await page.locator('#pause-screen').isVisible(),true)
 assert.deepEqual((await saved(page)).equipped,expected);assert.deepEqual((await saved(page)).looks[0],expected)
 assert.equal(await page.locator('#ranger-world canvas').getAttribute('data-outfit'),appearanceSignature(expected))
 const after=await game(page);assert.equal(after.time,before.time);assert.deepEqual(after.seeds,before.seeds);assert.deepEqual(after.sites,before.sites);report.equipAndIsolatedReadback=true
 await page.click('#resume');await page.waitForTimeout(900);await shot(page,'wardrobe-in-game')
 // Real browser storage survives a new document; the world model matches the equipped set.
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#ranger-world canvas[data-ready="true"]',{timeout:60000});await page.click('#start');await page.keyboard.press('c')
 assert.equal(await page.locator('#locker-canvas canvas').getAttribute('data-outfit'),appearanceSignature(expected));report.reloadPersistsEquipment=true
 await page.click('[data-slot="head"]');await page.click('[data-item="none"]');await page.click('#locker-cancel')
 assert.deepEqual((await saved(page)).equipped,expected);assert.equal(await page.locator('#ranger-world canvas').getAttribute('data-outfit'),appearanceSignature(expected));report.cancelPreservesOutfit=true
 await page.keyboard.press('c');await page.click('[data-tab="loadouts"]');await page.click('[data-preset="survey"]');await page.click('[data-tab="equipment"]');await page.click('[data-slot="head"]');await page.click('[data-item="none"]')
 await page.waitForTimeout(800);await shot(page,'wardrobe-face')
 // Failed write must keep the dialog open rather than claiming persistence.
 await page.evaluate(key=>{window.__saveSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('QA storage denied');return window.__saveSet.call(this,k,v)}},APPEARANCE_KEY)
 await page.click('#locker-apply');assert.equal(await page.locator('#wardrobe-screen').isVisible(),true);assert.match(await page.locator('#locker-status').textContent(),/บันทึกไม่ได้/)
 assert.deepEqual((await saved(page)).equipped,expected)
 await page.evaluate(()=>{Storage.prototype.setItem=window.__saveSet});report.deniedSaveReported=true
 // Locker stays open across the same lifecycle events as the expedition controller.
 await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))})
 await page.waitForTimeout(250);await page.keyboard.press('Escape');assert.equal(await page.locator('#pause-screen').isVisible(),true);report.lockerLifecycle=true
 for(let i=0;i<3;i++){await page.click('#wardrobe-pause');assert.equal(await page.locator('#locker-canvas canvas').count(),1);await page.click('#locker-cancel');assert.equal(await page.locator('#locker-canvas canvas').count(),0)}
 report.repeatedOpenClose=true
 await context.close()
 for(const [name,viewport] of [['wardrobe-phone',{width:390,height:844}],['wardrobe-landscape',{width:844,height:390}]]){
  const {context,page}=await open(viewport,true)
  const cdp=await context.newCDPSession(page),r=await page.locator('#locker-apply').boundingBox()
  assert.ok(r&&r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,'Equip CTA must remain inside the viewport')
  await page.click('[data-tab="loadouts"]');await page.click('[data-preset="rescue"]');await page.waitForTimeout(500);await shot(page,name)
  // Real touch, not just a synthetic click, confirms the outfit on both layouts.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await page.waitForSelector('#wardrobe-screen',{state:'detached'})
  assert.equal((await saved(page)).equipped.head,'helmet');report[name]=true;await context.close()
 }
 const offline=await open({width:1280,height:900},false,true)
 await offline.page.click('[data-tab="loadouts"]');await offline.page.click('[data-preset="survey"]');await offline.page.click('#locker-apply')
 assert.equal((await saved(offline.page)).equipped.outer,'survey');report.standaloneWardrobe=true;await offline.context.close()
 assert.deepEqual(errors,[]);report.runtimeErrors=errors;report.passed=true
}catch(e){report.passed=false;report.error=e.stack;report.runtimeErrors=errors;if(active&&!active.isClosed())await shot(active,'wardrobe-failure').catch(()=>{});throw e}
finally{await fs.writeFile(`${out}/wardrobe-qa.json`,JSON.stringify(report,null,2));await browser.close()}
