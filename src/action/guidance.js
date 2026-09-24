// Read-only expedition guidance. Never spends seedlings, grants credits, or
// changes saves; all interactions still go through simulation.step/perform.
import { SITES, SPECIES, TRASH, CACHES, STATION, CAMP, LOGS, MUD, distance, metrics, isStorm, inShelter, tide } from './simulation.js'

const nearest = (points, player) => points.reduce((a, b) => distance(a, player) <= distance(b, player) ? a : b)
export function relativeBearing(player, target, yaw = 0) {
  const angle = Math.atan2(target.x - player.x, player.z - target.z) - yaw
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}
export function compassHeading(yaw = 0) {
  const degrees = ((yaw * 180 / Math.PI) % 360 + 360) % 360
  return { degrees, label: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8] }
}
// Advisory bridge legs, not autopilot/pathfinding. Trunks/trees remain obstacles.
export function bridgeLeg(player, target) {
  if (player.x < -16.5) return null // dry western overland route
  if (target.z < -20 && player.z > -21.8) {
    if (player.z > -13.8 && distance(player, { x: -10, z: -12.5 }) > 1.25)
      return { x: -10, z: -12.5, name: 'ทางขึ้นสะพาน', id: 'bridge-south' }
    return { x: -10, z: -23, name: 'ข้ามสะพานไปอีกฝั่ง', id: 'bridge-north' }
  }
  if (target.z > -16 && player.z < -14.2) {
    if (player.z < -22.2 && distance(player, { x: -10, z: -23 }) > 1.25)
      return { x: -10, z: -23, name: 'ทางขึ้นสะพานกลับฐาน', id: 'bridge-north' }
    return { x: -10, z: -12.5, name: 'ข้ามสะพานกลับฝั่งฐาน', id: 'bridge-south' }
  }
  return null
}
export function expeditionGuidance(s, yaw = 0) {
  const m = metrics(s)
  let goal, phase, title, detail, label, waiting = 0
  const next = SITES.find((_, i) => s.sites[i].plantedAt === null)
  if (s.verified) {
    phase = 'complete'; goal = STATION; title = 'ชายฝั่งกลับมามีชีวิต'; detail = 'ภารกิจสำเร็จ · เดินสำรวจหรือแต่งตัวต่อได้'; label = 'ฐาน MRV'
  } else if (next && !s.seeds[next.species]) {
    phase = 'supply'; goal = nearest(CACHES, s.player); title = 'เติมกล้าไม้ก่อนออกลุย'
    detail = `ต้องใช้${SPECIES[next.species].name} · รับกล้า 3 ชนิดและฟื้นกำลังที่ลัง`; label = 'ลังกล้าไม้'
  } else if (next?.debris && !s.cleaned.includes(next.debris)) {
    phase = 'restore'; goal = TRASH.find(t => t.id === next.debris); title = `เปิดพื้นที่ปลูก ${m.planted}/6 จุด`
    detail = `เก็บอวนข้างจุด “${next.name}” ก่อนปลูก${SPECIES[next.species].name}`; label = 'กองขยะที่ต้องเก็บ'
  } else if (next) {
    phase = 'restore'; goal = next; title = `ฟื้นฟูป่า ${m.planted}/6 จุด`
    detail = `${next.name} · เลือก ${next.species + 1} ${SPECIES[next.species].name} แล้วกด E ค้าง`; label = next.name
  } else if (m.cleaned < 3) {
    phase = 'restore'; goal = nearest(TRASH.filter(t => !s.cleaned.includes(t.id)), s.player)
    title = 'คืนชายฝั่งให้สัตว์น้ำ'; detail = `เก็บอวนและพลาสติกอีก ${3 - m.cleaned} กอง`; label = 'ขยะทะเล'
  } else if (m.samples < 3) {
    phase = 'evidence'
    const pending = SITES.filter((_, i) => !s.sites[i].sampled && s.sites[i].plantedAt !== null)
    const ready = pending.filter(site => s.time - s.sites[SITES.indexOf(site)].plantedAt >= 22)
    goal = nearest(ready.length ? ready : pending, s.player)
    waiting = Math.max(0, Math.ceil(22 - (s.time - s.sites[SITES.indexOf(goal)].plantedAt)))
    title = `เก็บหลักฐาน ${m.samples}/3 จุด`
    detail = waiting ? `ต้นกำลังตั้งตัว · พร้อมเก็บอีก ${waiting} วินาทีในเกม` : 'ต้นนี้พร้อมสำรวจ · เดินเข้าใกล้และกด E ค้าง'
    label = `หลักฐาน · ${goal.name}`
  } else {
    phase = 'verify'; goal = STATION; title = 'กลับฐาน ส่งรายงาน MRV'
    detail = 'หลักฐานครบแล้ว · ยืนยันที่เครื่อง MRV เพื่อรับเครดิตจำลอง'; label = 'เครื่อง MRV ที่ฐาน'
  }
  const leg = phase === 'complete' ? null : bridgeLeg(s.player, goal)
  const target = leg || goal
  return { phase, title, detail, goal, target, label: leg?.name || label,
    viaBridge: Boolean(leg), waiting, distance: distance(s.player, target),
    bearing: relativeBearing(s.player, target, yaw) }
}
export function fieldAdvice(s, yaw = 0) {
  const p = s.player, phase = s.time % 160, sheltered = inShelter(p)
  const nextStorm = Math.ceil((105 - phase + 160) % 160)
  if (p.hazard?.startsWith('น้ำ')) return { kind: 'danger', title: 'น้ำลึก — กลับที่ดอน', detail: 'มุ่งสะพานฝั่งตะวันตก อย่าเร่งฝืนว่าย' }
  if (isStorm(s.time)) return { kind: sheltered ? 'safe' : 'danger', title: sheltered ? 'อยู่ในที่กำบังแล้ว' : 'พายุเข้า — หาที่กำบัง',
    detail: `พายุจบอีก ${Math.ceil(131 - phase)} วินาทีในเกม${sheltered ? ' · หยุดพักฟื้นสุขภาพ' : ' · ฐานหรือจุดพักหลังสะพาน'}` }
  if (p.stamina < 20) return { kind: 'warning', title: 'กำลังใกล้หมด', detail: 'หยุดวิ่ง พักบนที่ดอน หรือเติมกำลังที่ลังกล้า' }
  if (nextStorm <= 15) return { kind: 'warning', title: `พายุกำลังเข้าใน ${nextStorm} วินาที`, detail: 'เตรียมหาที่กำบังที่ฐานหรือจุดพักหลังสะพาน' }
  if (distance(p, MUD) < MUD.radius + 1) return { kind: 'warning', title: 'เขตโคลนลึก', detail: 'เดินช้าและเสียกำลัง · เลาะขอบแอ่งได้' }
  for (const log of LOGS) {
    const target = { x: Math.max(log.x - log.half, Math.min(log.x + log.half, p.x)), z: log.z }
    if (distance(p, target) < 4 && Math.cos(relativeBearing(p, target, yaw)) > 0.25)
      return { kind: 'obstacle', title: 'ซากไม้ขวางทาง', detail: 'SPACE / ปุ่ม ↑ กระโดด หรือเดินอ้อมปลายท่อน' }
  }
  if (Math.abs(p.z + 18) < 5 && p.x > -8.5) return { kind: 'warning', title: 'คลองน้ำขึ้นลง', detail: 'ใช้สะพานยกระดับฝั่งตะวันตกเพื่อข้ามอย่างปลอดภัย' }
  const level = tide(s.time), rising = tide(s.time + 1) > level
  return { kind: 'calm', title: level > .6 ? 'น้ำขึ้นสูง' : level < .32 ? 'น้ำลง' : rising ? 'น้ำกำลังขึ้น' : 'น้ำกำลังลง',
    detail: 'ลูกศรสีทองชี้เป้าหมายถัดไป · Q คืนมุมกล้อง' }
}
