import test from 'node:test'
import assert from 'node:assert/strict'
import { APPEARANCE_KEY, SLOTS, CATALOG, DEFAULT_APPEARANCE, PRESETS, normalizeAppearance, loadAppearance, loadSavedLooks, saveAppearance, appearanceSignature, applyPreset } from '../src/action/appearance.js'
import { RangerAvatar } from '../src/action/character.js'
import { createState, serialize, SAVE_KEY } from '../src/action/simulation.js'
import * as THREE from 'three'
function store(){const map=new Map();return{map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}}
test('cosmetic catalog contains 27 unique items across eight independent slots',()=>{
 assert.equal(SLOTS.length,8);assert.equal(Object.values(CATALOG).flat().length,27)
 for(const {id} of SLOTS){assert.equal(new Set(CATALOG[id].map(i=>i.id)).size,CATALOG[id].length);assert.ok(CATALOG[id].some(i=>i.id===DEFAULT_APPEARANCE[id]))}
})
test('malformed appearance and cross-slot items fall back without arbitrary fields',()=>{
 const a=normalizeAppearance({head:'scanner',skin:'<script>',feet:undefined,back:'rescue',extra:'secret',palette:NaN})
 assert.equal(a.head,DEFAULT_APPEARANCE.head);assert.equal(a.back,'rescue');assert.equal(a.palette,'fern');assert.ok(!('extra'in a));assert.deepEqual(normalizeAppearance(null),DEFAULT_APPEARANCE)
 assert.deepEqual(normalizeAppearance([]),DEFAULT_APPEARANCE)
})
test('equipment and three custom looks persist with exact read-back; progress keys untouched',()=>{
 const s=store(),g=createState();s.setItem(SAVE_KEY,serialize(g));s.setItem('mangrove-bay-3d-save-v2','farm fixture')
 assert.equal(saveAppearance(PRESETS[1].outfit,[PRESETS[0].outfit,null,PRESETS[2].outfit],s),true)
 assert.deepEqual(loadAppearance(s),PRESETS[1].outfit);assert.deepEqual(loadSavedLooks(s),[PRESETS[0].outfit,null,PRESETS[2].outfit]);assert.equal(s.getItem(SAVE_KEY),serialize(g));assert.equal(s.getItem('mangrove-bay-3d-save-v2'),'farm fixture')
})
test('denied storage and silent write failure are reported, not claimed as successful saves',()=>{
 assert.equal(saveAppearance(DEFAULT_APPEARANCE,[],{setItem(){throw Error('quota')},getItem:()=>null}),false)
 assert.equal(saveAppearance(DEFAULT_APPEARANCE,[],{setItem(){},getItem:()=>null}),false)
 assert.deepEqual(loadAppearance({getItem(){throw Error('blocked')}}),DEFAULT_APPEARANCE)
 const s=store();s.setItem(APPEARANCE_KEY,'{bad');assert.deepEqual(loadSavedLooks(s),[null,null,null])
})
test('presets preserve skin, hairstyle and hair color while changing equipment',()=>{
 const a=normalizeAppearance({...DEFAULT_APPEARANCE,skin:'deep',hair:'tied',hairColor:'silver'})
 const changed=applyPreset(PRESETS[1],a);assert.equal(changed.skin,'deep');assert.equal(changed.hair,'tied');assert.equal(changed.hairColor,'silver');assert.equal(changed.head,'helmet');assert.equal(a.head,'ranger')
})
test('appearance signatures are stable and normalized',()=>{
 assert.equal(appearanceSignature(null),appearanceSignature(DEFAULT_APPEARANCE));assert.notEqual(appearanceSignature(PRESETS[1].outfit),appearanceSignature(DEFAULT_APPEARANCE))
})
test('every item builds a finite articulated 3D avatar with a bounded mesh/triangle budget',()=>{
 for(const slot of SLOTS)for(const item of CATALOG[slot.id]){
  const avatar=new RangerAvatar({...DEFAULT_APPEARANCE,[slot.id]:item.id});let meshes=0,triangles=0
  avatar.root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count||p.count)/3;for(const value of p.array)assert.ok(Number.isFinite(value))})
  assert.ok(meshes<95,`mesh budget: ${slot.id}/${item.id}: ${meshes}`);assert.ok(triangles<90000,`triangle budget: ${triangles}`)
  assert.ok(avatar.joints.head&&avatar.joints.elbow1&&avatar.joints['knee-1']);assert.equal(avatar.eyeGroups.length,2)
  avatar.update(1/60,4,{moving:true,grounded:true});avatar.root.updateMatrixWorld(true)
  const bounds=new THREE.Box3().setFromObject(avatar.root);assert.ok(bounds.max.y>1.7&&bounds.max.y<2.7);avatar.dispose()
 }
})
test('same catalog selections change actual geometry, not only UI labels',()=>{
 const signatures=[]
 for(const preset of PRESETS){const a=new RangerAvatar(preset.outfit);let n=0;a.root.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count});signatures.push(n);a.dispose()}
 assert.equal(new Set(signatures).size,PRESETS.length)
})
test('idle, walk, jump and work animate real limb joints without recreating mesh resources',()=>{
 const a=new RangerAvatar(DEFAULT_APPEARANCE),size=a.resources.size
 a.update(.1,1,{moving:true,grounded:true});const x=a.joints.arm1.rotation.x
 a.update(.1,1,{moving:false,grounded:false},.5);assert.notEqual(a.joints.arm1.rotation.x,x);assert.ok(a.joints.knee1.rotation.x<0);assert.equal(a.resources.size,size);a.dispose()
})
test('each character resource is disposed once, and a new avatar has independent ownership',()=>{
 const a=new RangerAvatar(DEFAULT_APPEARANCE),b=new RangerAvatar(DEFAULT_APPEARANCE),counts=new Map()
 for(const resource of a.resources){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));assert.ok(!b.resources.has(resource))}
 a.dispose();a.dispose();assert.ok([...counts.values()].every(n=>n===1));assert.equal(a.resources.size,0);assert.ok(b.resources.size>0);b.dispose()
})
