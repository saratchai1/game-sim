// Cosmetic-only equipment. This storage namespace never touches expedition/farm saves.
export const APPEARANCE_KEY = 'mangrove-ranger-outfit-v1'
export const SLOTS = [
  { id: 'head', name: 'หมวก', en: 'HEADWEAR' },
  { id: 'outer', name: 'เสื้อและแจ็กเก็ต', en: 'OUTERWEAR' },
  { id: 'legs', name: 'กางเกง', en: 'TROUSERS' },
  { id: 'feet', name: 'รองเท้า', en: 'FOOTWEAR' },
  { id: 'back', name: 'กระเป๋า', en: 'BACKPACK' },
  { id: 'eyes', name: 'แว่นตา', en: 'EYEWEAR' },
  { id: 'hands', name: 'ถุงมือ', en: 'GLOVES' },
  { id: 'tool', name: 'ไอเทมติดตัว', en: 'FIELD ITEMS' },
]
const item = (id, name, label, description) => Object.freeze({ id, name, label, description })
export const CATALOG = Object.freeze({
  head: [item('ranger', 'หมวกปีกเจ้าหน้าที่', 'RANGER', 'ปีกกว้าง สายหนัง และตราใบไม้โลหะ'), item('cap', 'หมวกแก๊ปภาคสนาม', 'FIELD', 'ปีกโค้งและตะเข็บแบ่งชิ้นผ้า'), item('helmet', 'หมวกนิรภัยติดไฟ', 'RESCUE', 'เปลือกแข็ง สายรัด และไฟคาดด้านหน้า'), item('none', 'ไม่สวมหมวก', 'BASIC', 'แสดงทรงผมที่เลือกไว้')],
  outer: [item('field', 'แจ็กเก็ตลาดตระเวน', 'RANGER', 'ปกตั้ง ซิป กระเป๋าฝาปิด และตราหน่วย'), item('parka', 'เสื้อกันฝนชายฝั่ง', 'WEATHER', 'ฮู้ดพับ แถบสะท้อนแสง และชายเสื้อยาว'), item('survey', 'เสื้อกั๊กนักสำรวจ', 'SURVEY', 'เสื้อแขนสั้นซ้อนกั๊ก วิทยุและกระเป๋าเครื่องมือ')],
  legs: [item('cargo', 'กางเกงคาร์โก้', 'FIELD', 'กระเป๋าข้าง เข็มขัด และตะเข็บเดินคู่'), item('waders', 'กางเกงลุยเลน', 'COASTAL', 'ผ้าเคลือบผิวและแผ่นเสริมหน้าแข้ง'), item('trek', 'กางเกงเดินป่า', 'TRAIL', 'แผงตัดต่อสองสีและแผ่นป้องกันหัวเข่า')],
  feet: [item('trail', 'บูตเดินป่า', 'TRAIL', 'เชือกผูก ห่วงโลหะ พื้นดอกยาง และหัวรองเท้า'), item('rubber', 'บูตยางสูง', 'COASTAL', 'ทรงสูง ขอบพับ และพื้นรองเท้ากันลื่น'), item('tactical', 'บูตภาคสนาม', 'RESCUE', 'หุ้มข้อสูง เสริมส้นและขอบหัวรองเท้า')],
  back: [item('expedition', 'เป้สำรวจเต็มชุด', 'EXPEDITION', 'สายบ่า กระเป๋าข้าง ขวดน้ำ และม้วนเสื่อ'), item('daypack', 'เป้เดินป่าขนาดเล็ก', 'TRAIL', 'เป้ผ้าน้ำหนักเบา ซิปและสายสะพาย'), item('rescue', 'เป้ชุดกู้ภัย', 'RESCUE', 'กระเป๋าแข็งสีส้ม แถบขาวและช่องอุปกรณ์'), item('none', 'ไม่สะพายเป้', 'BASIC', 'แสดงรายละเอียดด้านหลังของเสื้อ')],
  eyes: [item('none', 'ไม่สวมแว่น', 'BASIC', 'แสดงดวงตาและรายละเอียดใบหน้า'), item('goggles', 'แว่นป้องกัน', 'RESCUE', 'กรอบหุ้มตา เลนส์สีอำพัน และสายรัด'), item('shades', 'แว่นนักสำรวจ', 'SURVEY', 'กรอบโลหะและเลนส์เข้ม')],
  hands: [item('bare', 'ไม่สวมถุงมือ', 'BASIC', 'มือและนิ้วแยกชิ้นตามข้อต่อ'), item('field', 'ถุงมือเปิดปลายนิ้ว', 'FIELD', 'ผ้าสีเข้ม ฝ่ามือหนังและปลายนิ้วเปิด'), item('work', 'ถุงมือทำงาน', 'RESCUE', 'หุ้มนิ้วเต็ม เสริมหลังมือ และรัดข้อมือ')],
  tool: [item('trowel', 'พลั่วปลูกป่า', 'RESTORE', 'ด้ามไม้ ห่วงจับ และใบพลั่วโลหะ'), item('scanner', 'เครื่องสำรวจพกพา', 'SURVEY', 'จอแสดงผล ปุ่มควบคุม และสายคล้อง'), item('lantern', 'ตะเกียงภาคสนาม', 'EXPEDITION', 'โครงโลหะ ครอบไฟและหูหิ้ว'), item('none', 'ไม่ถือไอเทม', 'BASIC', 'มือเปล่า เหมาะกับการชมชุด')],
})
export const PALETTES = Object.freeze([
  { id:'fern', name:'เขียวเฟิร์น', color:'#667856', dark:'#354737', trim:'#bda776' },
  { id:'sand', name:'ทรายชายฝั่ง', color:'#b5a080', dark:'#665b45', trim:'#e2d4aa' },
  { id:'ocean', name:'น้ำเงินทะเล', color:'#40748a', dark:'#223e53', trim:'#b0d6ce' },
  { id:'rust', name:'ส้มกู้ภัย', color:'#c57641', dark:'#744435', trim:'#f3d99f' },
  { id:'night', name:'ดำแกรไฟต์', color:'#3b464d', dark:'#202a30', trim:'#9aa8a4' },
  { id:'ivory', name:'ขาวงาช้าง', color:'#ded9c5', dark:'#7a887e', trim:'#dfb977' },
])
export const SKIN_TONES = Object.freeze([
  {id:'warm', name:'น้ำผึ้ง', color:'#bc8864'}, {id:'light', name:'สีอ่อน', color:'#e5b58d'},
  {id:'tan', name:'แทน', color:'#9d6a4b'}, {id:'deep', name:'สีน้ำตาลเข้ม', color:'#654531'},
  {id:'rose', name:'อมชมพู', color:'#ca987d'},
])
export const HAIR_STYLES = Object.freeze([{id:'swept',name:'ปัดข้าง'},{id:'crop',name:'สั้น'},{id:'tied',name:'รวบผม'}])
export const HAIR_COLORS = Object.freeze([{id:'espresso',name:'น้ำตาลเข้ม',color:'#302722'},{id:'black',name:'ดำ',color:'#1a2020'},{id:'copper',name:'น้ำตาลแดง',color:'#77472d'},{id:'silver',name:'เทาเงิน',color:'#9caaa5'}])
export const DEFAULT_APPEARANCE = Object.freeze({head:'ranger',outer:'field',legs:'cargo',feet:'trail',back:'expedition',eyes:'none',hands:'field',tool:'trowel',palette:'fern',skin:'warm',hair:'swept',hairColor:'espresso'})
export const PRESETS = Object.freeze([
  {id:'ranger',name:'ผู้พิทักษ์ป่า',en:'FOREST RANGER',description:'แจ็กเก็ตลาดตระเวนและเป้สำรวจครบชุด',outfit:{...DEFAULT_APPEARANCE}},
  {id:'rescue',name:'หน่วยกู้ภัยชายฝั่ง',en:'COASTAL RESCUE',description:'หมวกติดไฟ เสื้อกันฝน และเป้กู้ภัย',outfit:{...DEFAULT_APPEARANCE,head:'helmet',outer:'parka',legs:'waders',feet:'rubber',back:'rescue',eyes:'goggles',hands:'work',tool:'lantern',palette:'rust'}},
  {id:'survey',name:'นักสำรวจระบบนิเวศ',en:'FIELD RESEARCHER',description:'เสื้อกั๊ก เครื่องสำรวจ และเป้ขนาดเล็ก',outfit:{...DEFAULT_APPEARANCE,head:'cap',outer:'survey',legs:'trek',feet:'trail',back:'daypack',eyes:'shades',hands:'bare',tool:'scanner',palette:'sand'}},
  {id:'night',name:'ชุดลาดตระเวนกลางคืน',en:'NIGHT PATROL',description:'ชุดแกรไฟต์พร้อมตะเกียงและบูตภาคสนาม',outfit:{...DEFAULT_APPEARANCE,head:'none',outer:'field',legs:'trek',feet:'tactical',back:'daypack',eyes:'none',hands:'work',tool:'lantern',palette:'night'}},
])
export function normalizeAppearance(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const result = {}
  for (const {id} of SLOTS) result[id] = CATALOG[id].some(i=>i.id===raw[id]) ? raw[id] : DEFAULT_APPEARANCE[id]
  for (const [key,options] of [['palette',PALETTES],['skin',SKIN_TONES],['hair',HAIR_STYLES],['hairColor',HAIR_COLORS]]) result[key]=options.some(i=>i.id===raw[key])?raw[key]:DEFAULT_APPEARANCE[key]
  return result
}
export function appearanceSignature(value) { return JSON.stringify(normalizeAppearance(value)) }
export function loadAppearance(storage = globalThis.localStorage) {
  try { const v=JSON.parse(storage.getItem(APPEARANCE_KEY));return normalizeAppearance(v?.equipped) } catch {return normalizeAppearance(null)}
}
export function loadSavedLooks(storage = globalThis.localStorage) {
  try {const v=JSON.parse(storage.getItem(APPEARANCE_KEY));return Array.from({length:3},(_,i)=>v?.looks?.[i]?normalizeAppearance(v.looks[i]):null)} catch {return [null,null,null]}
}
export function saveAppearance(equipped, looks = [], storage = globalThis.localStorage) {
  const payload=JSON.stringify({version:1,equipped:normalizeAppearance(equipped),looks:Array.from({length:3},(_,i)=>looks[i]?normalizeAppearance(looks[i]):null)})
  try {storage.setItem(APPEARANCE_KEY,payload); if(storage.getItem(APPEARANCE_KEY)!==payload)throw new Error('read-back mismatch');return true} catch {return false}
}
export function applyPreset(preset, current) {
  // An outfit preset must not silently change the player's skin/hair identity.
  const appearance=normalizeAppearance(current)
  return normalizeAppearance({...preset.outfit,skin:appearance.skin,hair:appearance.hair,hairColor:appearance.hairColor})
}
