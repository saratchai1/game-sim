import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createState, SAVE_KEY, SITES, floorHeight } from '../src/action/simulation.js'

const base=process.env.QA_URL||'http://127.0.0.1:4173'
const output='action-artifacts';await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']})
const runtimeErrors=[],checks=[]
async function open(viewport,mobile=false,fixture=null){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile})
  if(fixture)await context.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:fixture})
  const page=await context.newPage();page.on('pageerror',e=>runtimeErrors.push(e.message))
  await page.goto(`${base}/action/`,{waitUntil:'networkidle'})
  await page.waitForSelector('#ranger-world canvas[data-ready="true"]',{timeout:60000})
  await page.click('#start');await page.waitForFunction(()=>!document.querySelector('#camera-recenter')?.disabled)
  await page.waitForTimeout(250)
  return {page,context}
}
async function assertButton(page,mobile=false,context=null){
  const button=page.locator('#camera-recenter'),rect=await button.boundingBox(),viewport=page.viewportSize()
  assert.ok(rect&&rect.height>=44&&rect.width>=44,'recenter touch target at least 44px')
  assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=viewport.width&&rect.y+rect.height<=viewport.height,'recenter stays in viewport')
  const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('#camera-recenter')?.id,{x:rect.x+rect.width/2,y:rect.y+rect.height/2})
  assert.equal(hit,'camera-recenter','button is not covered by another overlay')
  if(mobile){
    const cdp=await context.newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2,id:1}]})
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  }else await button.click()
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#ranger-world').dataset.cameraYaw))<.01)
}
try{
  {
    const {page,context}=await open({width:1440,height:900})
    assert.equal(await page.locator('#ranger-world').getAttribute('data-guide-phase'),'supply')
    assert.match(await page.locator('.route-hint').innerText(),/ลังกล้าไม้/)
    await page.mouse.move(700,510);await page.mouse.down();await page.mouse.move(815,510,{steps:8});await page.mouse.up()
    await page.waitForFunction(()=>Number(document.querySelector('#ranger-world').dataset.cameraYaw)>.2)
    await page.keyboard.press('q')
    await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#ranger-world').dataset.cameraYaw))<.01)
    await assertButton(page)
    await page.screenshot({path:`${output}/guide-desktop.png`})
    checks.push('desktop direction + mouse look + Q recenter + reachable button')
    await context.close()
  }
  {
    const s=createState();s.seeds=[3,3,3];s.time=96;s.cleaned=['t1'];s.sites.slice(0,3).forEach(p=>p.plantedAt=0)
    Object.assign(s.player,{x:0,z:-10,y:floorHeight(0,-10)})
    const {page,context}=await open({width:1440,height:900},false,s)
    assert.equal(await page.locator('#ranger-world').getAttribute('data-guide-route'),'bridge')
    assert.equal(await page.locator('#ranger-world').getAttribute('data-guide-target'),'t2')
    assert.match(await page.locator('.route-hint').innerText(),/สะพาน/)
    assert.match(await page.locator('.field-advice').innerText(),/พายุกำลังเข้า/)
    await page.click('#pause');const before=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)
    await page.keyboard.press('q');await page.waitForTimeout(250)
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY),before,'presentation does not mutate paused saves')
    await page.click('#resume');await page.screenshot({path:`${output}/guide-bridge-warning.png`})
    checks.push('blocked-site cleanup guidance + safe bridge waypoint + pre-storm countdown + paused save isolation')
    await context.close()
  }
  for(const [name,viewport] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]] ){
    const s=createState();s.seeds=[1,1,1];s.cleaned=['t1','t2','t3'];s.sites.forEach(p=>p.plantedAt=0);s.time=65
    Object.assign(s.player,{x:0,z:-2,y:floorHeight(0,-2)})
    const {page,context}=await open(viewport,true,s)
    assert.equal(await page.locator('#ranger-world').getAttribute('data-guide-phase'),'evidence')
    assert.equal(await page.locator('#ranger-world').getAttribute('data-guide-target'),SITES[1].id)
    await assertButton(page,true,context)
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
    assert.equal(overflow,false,'phone UI has no horizontal page overflow')
    for(const selector of ['#joystick','#touch-e','#touch-jump']){
      const r=await page.locator(selector).boundingBox();assert.ok(r,'touch control remains visible')
      const top=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.joystick,.touch-button')?.id,{x:r.x+r.width/2,y:r.y+r.height/2})
      assert.equal(top,selector.slice(1),'guide never covers movement/action controls')
    }
    await page.screenshot({path:`${output}/guide-${name}.png`})
    checks.push(`${name}: ready evidence target + real touch recenter + clear movement controls`)
    await context.close()
  }
  assert.deepEqual(runtimeErrors,[])
  await fs.writeFile(`${output}/guide-qa.json`,JSON.stringify({passed:true,checks,runtimeErrors},null,2))
}catch(error){
  await fs.writeFile(`${output}/guide-qa.json`,JSON.stringify({passed:false,checks,runtimeErrors,error:String(error)},null,2));throw error
}finally{await browser.close()}
