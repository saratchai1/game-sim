export const VILLAGE_PHASE_SECONDS = 10

export const villageResidents = [
  {
    id:'som', name:'สม', role:'ชาวประมง',
    skin:'#a96f4e', hair:'#2f2a25', shirt:'#5d95a5', pants:'#405663', accent:'#e7d19a', hat:'cap',
    home:[8.8,.5,8.7],
    route:[
      { point:[9.1,.5,6.9], activity:'nets', label:'เช็กอวนก่อนออกเรือ' },
      { point:[7.1,.5,7.7], activity:'carry', label:'ยกตะกร้าปลาเข้าฝั่ง' },
      { point:[4.9,.5,8.1], activity:'chat-market', label:'ปลาตอนเช้าสดมาก' },
      { point:[9.2,.5,8.4], activity:'rest', label:null },
    ],
  },
  {
    id:'noi', name:'น้อย', role:'แม่ค้าชุมชน',
    skin:'#c58e67', hair:'#49342e', shirt:'#d98f55', pants:'#6f5a45', accent:'#f4e2b8', hat:'straw',
    home:[3.6,.5,9.4],
    route:[
      { point:[4.2,.5,8.5], activity:'market', label:'จัดร้านให้พร้อมนะ' },
      { point:[5.0,.5,8.2], activity:'market', label:'วันนี้มีของจากชุมชนเยอะเลย' },
      { point:[4.8,.5,8.1], activity:'chat-market', label:'เดี๋ยวช่วยชั่งให้' },
      { point:[3.7,.5,9.25], activity:'sweep', label:null },
    ],
  },
  {
    id:'dao', name:'ดาว', role:'อาสาสมัครเยาวชน',
    skin:'#d2a17c', hair:'#3a2e2a', shirt:'#8b6bb1', pants:'#4e5f62', accent:'#e9d7f5', hat:'bucket',
    home:[-11.2,.5,8.1],
    route:[
      { point:[-8.8,.5,7.3], activity:'water', label:'ช่วยรดกล้าให้โตไวๆ' },
      { point:[-7.2,.5,7.45], activity:'chat-nursery', label:'แปลงนี้เริ่มฟื้นแล้วนะ' },
      { point:[-4.8,.5,7.7], activity:'carry', label:null },
      { point:[-10.6,.5,8.0], activity:'wave', label:'สู้ๆ ทีมฟื้นฟู!' },
    ],
  },
  {
    id:'chai', name:'ชัย', role:'ช่างเรือ',
    skin:'#9c684d', hair:'#282725', shirt:'#5f8060', pants:'#4a5058', accent:'#d9c88e', hat:'cap',
    home:[10.2,.5,7.4],
    route:[
      { point:[10.3,.5,6.0], activity:'repair', label:'ขันน็อตเรืออีกนิด' },
      { point:[8.7,.5,6.5], activity:'repair', label:null },
      { point:[7.2,.5,7.6], activity:'dock-chat', label:'น้ำขึ้นพอดี เดี๋ยวเรือออกง่าย' },
      { point:[10.0,.5,7.35], activity:'rest', label:null },
    ],
  },
  {
    id:'mee', name:'มี', role:'ผู้ดูแลเรือนเพาะ',
    skin:'#b97d5d', hair:'#45332c', shirt:'#78a365', pants:'#52614a', accent:'#eef0bc', hat:'straw',
    home:[-9.5,.5,8.7],
    route:[
      { point:[-8.3,.5,7.55], activity:'nursery', label:'คัดกล้าแข็งแรงไว้ก่อน' },
      { point:[-7.25,.5,7.42], activity:'chat-nursery', label:'เดี๋ยวฉันเตรียมกล้าเพิ่ม' },
      { point:[-8.4,.5,7.9], activity:'nursery', label:null },
      { point:[-9.4,.5,8.65], activity:'rest', label:null },
    ],
  },
]

const actionReactions = {
  plant:{ ids:['mee','dao','noi'], speaker:'mee', text:'ปลูกเพิ่มแล้ว เยี่ยมเลย!', mood:'cheer' },
  care:{ ids:['mee','dao'], speaker:'dao', text:'ต้นไม้แข็งแรงขึ้นแน่', mood:'cheer' },
  maintenance:{ ids:['mee','dao'], speaker:'dao', text:'ต้นไม้แข็งแรงขึ้นแน่', mood:'cheer' },
  clean:{ ids:['som','noi','dao'], speaker:'som', text:'ชายฝั่งสะอาดขึ้นแล้ว', mood:'cheer' },
  cleanup:{ ids:['som','noi','dao'], speaker:'som', text:'ชายฝั่งสะอาดขึ้นแล้ว', mood:'cheer' },
  clear:{ ids:['som','dao'], speaker:'dao', text:'ทางโล่งขึ้น ทำงานง่ายเลย', mood:'cheer' },
  survey:{ ids:['dao','som'], speaker:'dao', text:'เจอสัตว์อะไรใหม่ไหม?', mood:'curious' },
  patrol:{ ids:['som','chai'], speaker:'chai', text:'เดี๋ยวช่วยดูแนวชายฝั่ง', mood:'ready' },
  mrv:{ ids:['dao','chai','noi'], speaker:'noi', text:'ข้อมูลพร้อมแล้ว ไปต่อได้!', mood:'cheer' },
}

export function villagePhase(elapsedSeconds) {
  return Math.floor(Math.max(0, elapsedSeconds) / VILLAGE_PHASE_SECONDS) % 4
}

export function villagePlan(residentId, elapsedSeconds, storm=false) {
  const resident=villageResidents.find((item)=>item.id===residentId)
  if(!resident) return null
  if(storm) return { point:resident.home, activity:'shelter', label:'พายุมา เก็บของเข้าที่ก่อน!' }
  return resident.route[villagePhase(elapsedSeconds)]
}

export function villageReaction(action,residentId) {
  if(!action?.type) return null
  const reaction=actionReactions[action.type]
  if(!reaction || !reaction.ids.includes(residentId)) return null
  return { text:reaction.text, mood:reaction.mood, speak:reaction.speaker===residentId }
}

export function socialPairs(elapsedSeconds) {
  const phase=villagePhase(elapsedSeconds)
  if(phase===1) return [['dao','mee']]
  if(phase===2) return [['som','noi']]
  return []
}

export function villageBoundsOk(point) {
  return Array.isArray(point) && point.length===3 && point[0]>=-14 && point[0]<=14 && point[2]>=5 && point[2]<=11
}
