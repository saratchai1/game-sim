// Deterministic action-game rules; no renderer, DOM or farm-save dependencies.
export const SAVE_KEY = 'mangrove-ranger-action-v1'
export const SPECIES = [
  { id: 'rhizophora', name: 'โกงกาง', color: '#72c86d', habitat: 'เลนริมคลอง' },
  { id: 'avicennia', name: 'แสม', color: '#c4d887', habitat: 'ที่ดอนชายเลน' },
  { id: 'sonneratia', name: 'ลำพู', color: '#edc494', habitat: 'ริมน้ำกร่อย' },
]
export const CAMP = { x: 0, z: 12 }
export const STATION = { x: 3.8, z: 12 }
export const CACHES = [{ id: 'camp-cache', x: -2.2, z: 10.4 }, { id: 'field-cache', x: -10, z: -25 }]
export const SITES = [
  { id: 'p1', x: -2.6, z: 5, species: 0, name: 'รากแรก' },
  { id: 'p2', x: 5, z: -2, species: 1, name: 'แนวขยะทะเล', debris: 't1' },
  { id: 'p3', x: -7, z: -10, species: 0, name: 'แอ่งเลนลึก' },
  { id: 'p4', x: 4, z: -22, species: 2, name: 'อีกฝั่งของคลอง', debris: 't2' },
  { id: 'p5', x: -5, z: -30, species: 1, name: 'แนวกันลม', debris: 't3' },
  { id: 'p6', x: 7, z: -38, species: 2, name: 'ป่าที่กลับมา' },
]
export const TRASH = [{ id: 't1', x: 5.7, z: -1.6 }, { id: 't2', x: 4.8, z: -21.7 }, { id: 't3', x: -4.2, z: -29.8 }]
export const LOGS = [{ x: 0, z: -6, half: 3.3, radius: 0.43 }, { x: 1.5, z: -27, half: 3.6, radius: 0.4 }]
export const MUD = { x: -6, z: -9, radius: 3.4 }
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
export function random(seed) {
  let n = seed >>> 0
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296 }
}
export function terrainHeight(x, z) {
  const ripple = 0.1 * Math.sin(x * 0.28) * Math.cos(z * 0.21)
  const east = clamp((x - 13) / 9)
  const creek = Math.exp(-Math.pow((z + 18) / 1.7, 4)) * (1 - clamp((-x - 12) / 5))
  return 0.85 + ripple - east * 3.2 - creek * 1.35
}
export function floorHeight(x, z) {
  const base = terrainHeight(x, z)
  if (Math.abs(x + 10) < 1.25 && z > -24 && z < -12) {
    const ramp = Math.min(clamp((z + 24) / 2), clamp((-12 - z) / 2))
    return base + (1.45 - base) * ramp
  }
  return base
}
export function tide(time) { return 0.18 + 0.62 * (0.5 - 0.5 * Math.cos(time * Math.PI * 2 / 96)) }
export function isStorm(time) { return time % 160 >= 105 && time % 160 < 131 }
export function inShelter(p) { return distance(p, CAMP) < 5.4 || distance(p, CACHES[1]) < 3.3 }
export const FOREST = (() => {
  const rng = random(90318), result = []
  for (let i = 0; i < 260; i++) {
    const x = -29 + rng() * 44, z = -44 + rng() * 66
    if (Math.abs(x) < 4.6 || (Math.abs(z + 18) < 4) || distance({ x, z }, CAMP) < 7) continue
    if ([...SITES, ...CACHES, STATION].some(p => distance(p, { x, z }) < 3.4)) continue
    if (Math.abs(x + 10) < 2.2 && z < -11 && z > -26) continue
    result.push({ x, z, scale: 0.8 + rng() * 0.8, phase: rng() * 6.28, kind: i % 3, radius: 0.38 })
  }
  return result
})()
export function createState() {
  return { version: 1, time: 0, player: { x: 0, z: 12, y: floorHeight(0, 12), vy: 0, heading: 0, health: 100, stamina: 100, moving: false, grounded: true },
    selected: 0, seeds: [0, 0, 0], sites: SITES.map(p => ({ id: p.id, plantedAt: null, sampled: false, health: 100 })),
    cleaned: [], samples: 0, credits: 0, verified: false, rescues: 0, progress: 0, actionId: null, latch: false, jumpLatch: false,
    message: 'รับกล้าไม้จากลังทางซ้าย กด E ค้างเพื่อหยิบ', messageTime: 7 }
}
export function announce(s, text) { s.message = text; s.messageTime = 5 }
export function metrics(s) {
  const planted = s.sites.filter(p => p.plantedAt !== null).length
  return { planted, cleaned: s.cleaned.length, samples: s.samples,
    biodiversity: Math.min(100, 12 + planted * 8 + s.cleaned.length * 9),
    community: 10 + s.cleaned.length * 15 + (s.verified ? 20 : 0), resilience: planted * 14 }
}
export function nearestAction(s) {
  const candidates = []
  for (const cache of CACHES) candidates.push({ ...cache, kind: 'supply', title: 'รับกล้าไม้ 3 ชนิด / ฟื้นกำลัง', duration: 0.65 })
  for (const trash of TRASH) if (!s.cleaned.includes(trash.id)) candidates.push({ ...trash, kind: 'clean', title: 'เก็บอวนและขยะทะเล', duration: 1.15 })
  SITES.forEach((site, i) => {
    const plot = s.sites[i]
    if (plot.plantedAt === null) {
      const blocked = site.debris && !s.cleaned.includes(site.debris) ? 'เก็บขยะที่อยู่ข้างจุดปลูกก่อน'
        : s.selected !== site.species ? `เลือก ${site.species + 1} · ${SPECIES[site.species].name} ให้เหมาะกับพื้นที่`
        : !s.seeds[s.selected] ? 'กล้าไม้หมด — รับเพิ่มที่ลังเสบียง'
        : tide(s.time) - floorHeight(site.x, site.z) > 0.55 ? 'น้ำสูงเกินไป รอให้น้ำลงก่อนปลูก' : null
      candidates.push({ ...site, kind: 'plant', title: `ปลูก${SPECIES[site.species].name} · ${site.name}`, duration: 1.35, blocked })
    } else if (!plot.sampled) {
      candidates.push({ ...site, kind: 'sample', title: 'เก็บหลักฐานการเติบโต', duration: 0.95,
        blocked: s.time - plot.plantedAt < 22 ? `ต้นกำลังตั้งตัว รออีก ${Math.ceil(22 - (s.time - plot.plantedAt))} วินาที` : null })
    }
  })
  const m = metrics(s)
  candidates.push({ ...STATION, id: 'station', kind: 'verify', title: 'ส่งหลักฐาน MRV / จบภารกิจ', duration: 1.5,
    blocked: s.verified ? 'ส่งรายงานแล้ว — เดินสำรวจต่อได้'
      : m.planted < 6 || m.cleaned < 3 || m.samples < 3 ? `ต้องปลูก 6 จุด เก็บขยะ 3 กอง และหลักฐาน 3 จุด (${m.planted}/6 · ${m.cleaned}/3 · ${m.samples}/3)` : null })
  return candidates.filter(t => distance(t, s.player) < 2.15)
    .sort((a, b) => ((a.blocked ? 3 : 0) + distance(a, s.player)) - ((b.blocked ? 3 : 0) + distance(b, s.player)))[0] || null
}
export function objective(s) {
  const m = metrics(s)
  if (s.verified) return { title: 'ชายฝั่งกลับมามีชีวิต', detail: 'ภารกิจสำเร็จ · สำรวจป่าต่อได้', target: STATION }
  if (!s.seeds.some(Boolean) && m.planted < 6) return { title: 'รับกล้าไม้จากเรือนเพาะชำ', detail: 'เดินไปที่ลังสีเหลือง แล้วกด E ค้าง', target: CACHES.reduce((a,b) => distance(a,s.player) < distance(b,s.player) ? a : b) }
  const next = SITES.find((p, i) => s.sites[i].plantedAt === null)
  if (next) return { title: `ฟื้นฟูป่า ${m.planted}/6 จุด`, detail: `${next.name} · ใช้${SPECIES[next.species].name}`, target: next }
  if (m.cleaned < 3) return { title: 'เก็บขยะให้ครบ 3 กอง', detail: 'คืนพื้นที่ให้สัตว์น้ำ', target: TRASH.find(t => !s.cleaned.includes(t.id)) }
  if (m.samples < 3) return { title: `เก็บหลักฐาน ${m.samples}/3 จุด`, detail: 'กลับไปหาต้นที่ตั้งตัวแล้ว กด E ค้าง', target: SITES[s.sites.findIndex(p => !p.sampled)] }
  return { title: 'กลับฐาน ส่งรายงาน MRV', detail: 'การปลูกอย่างเดียว ยังไม่ใช่เครดิตที่ตรวจแล้ว', target: STATION }
}
export function perform(s, target) {
  // Recheck at completion; a stale UI target cannot spend resources remotely.
  const live = nearestAction(s)
  if (!live || live.id !== target.id || live.kind !== target.kind || live.blocked) return false
  if (live.kind === 'supply') { s.seeds = [3, 3, 3]; s.player.health = 100; s.player.stamina = 100; announce(s, 'พร้อมลุย · กล้าไม้เต็มกระเป๋าและฟื้นกำลังแล้ว') }
  if (live.kind === 'clean') { s.cleaned.push(live.id); announce(s, 'เก็บขยะแล้ว · คืนพื้นที่อนุบาลสัตว์น้ำ +9 ธรรมชาติ') }
  if (live.kind === 'plant') {
    const i = SITES.findIndex(p => p.id === live.id)
    s.seeds[s.selected]--; s.sites[i].plantedAt = s.time
    announce(s, `ปลูก${SPECIES[s.selected].name}แล้ว · กลับมาเก็บหลักฐานเมื่อเติบโต`)
  }
  if (live.kind === 'sample') { s.sites[SITES.findIndex(p => p.id === live.id)].sampled = true; s.samples++; announce(s, `บันทึกหลักฐาน ${s.samples}/3 · ยังต้องนำกลับไปตรวจที่ฐาน`) }
  if (live.kind === 'verify') { s.verified = true; s.credits = 6; announce(s, 'ภารกิจสำเร็จ · ได้รับเครดิตจำลอง 6 หน่วย พร้อมผลประโยชน์ต่อธรรมชาติและชุมชน') }
  return true
}
function blocked(x, z, feet) {
  if (FOREST.some(t => Math.hypot(x - t.x, z - t.z) < t.radius + 0.3)) return true
  return LOGS.some(log => {
    const dx = Math.max(Math.abs(x - log.x) - log.half, 0)
    return Math.hypot(dx, z - log.z) < log.radius + 0.26 && feet < terrainHeight(log.x, log.z) + log.radius * 1.85
  })
}
export function rescue(s) {
  Object.assign(s.player, { x: CAMP.x, z: CAMP.z, y: floorHeight(CAMP.x, CAMP.z), vy: 0, health: 100, stamina: 100, grounded: true, moving: false })
  s.rescues++; s.progress = 0; s.actionId = null
  announce(s, 'ทีมชุมชนช่วยกลับฐาน · งานฟื้นฟูและหลักฐานยังอยู่ครบ')
}
export function step(s, input = {}, dt = 1 / 60, yaw = 0) {
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05)
  if (!dt || input.paused) return
  s.time += dt; s.messageTime = Math.max(0, s.messageTime - dt)
  const p = s.player, floor = floorHeight(p.x, p.z)
  let sx = clamp(input.x || 0, -1, 1), sz = clamp(input.z || 0, -1, 1)
  const mag = Math.hypot(sx, sz)
  if (mag > 1) { sx /= mag; sz /= mag }
  const moving = mag > 0.12
  const mud = distance(p, MUD) < MUD.radius
  const depth = Math.max(0, tide(s.time) - floor)
  const sprint = input.sprint && moving && p.stamina > 5 && depth < 0.3 && !mud
  const speed = (sprint ? 6 : 3.2) * (mud ? 0.42 : 1) * (depth > 0.25 ? 0.5 : 1)
  if (input.jump && !s.jumpLatch && p.grounded && p.stamina >= 12) { p.vy = 6.5; p.grounded = false; p.stamina -= 12 }
  s.jumpLatch = Boolean(input.jump)
  p.vy -= 19 * dt; p.y += p.vy * dt
  if (moving) {
    const vx = (sx * Math.cos(yaw) + sz * Math.sin(yaw)) * speed
    const vz = (sx * Math.sin(yaw) - sz * Math.cos(yaw)) * speed
    const nx = clamp(p.x + vx * dt, -30, 28), nz = clamp(p.z + vz * dt, -44, 24)
    if (!blocked(nx, p.z, p.y)) p.x = nx
    if (!blocked(p.x, nz, p.y)) p.z = nz
    p.heading = Math.atan2(-vx, -vz)
  }
  const newFloor = floorHeight(p.x, p.z)
  if (p.y <= newFloor) { p.y = newFloor; p.vy = 0; p.grounded = true }
  p.moving = moving; p.sprinting = Boolean(sprint)
  p.stamina = clamp(p.stamina + dt * (sprint ? -17 : moving && mud ? -7 : depth > 0.75 ? -9 : 13), 0, 100)
  const sheltered = inShelter(p), storm = isStorm(s.time)
  if (storm && !sheltered) p.stamina = Math.max(0, p.stamina - dt * 8)
  if (depth > 1.35 || (depth > 0.7 && p.stamina < 1) || (storm && !sheltered && p.stamina < 1)) p.health -= dt * 9
  if (sheltered && !moving) p.health = Math.min(100, p.health + dt * 15)
  if (p.health <= 0 || p.y < -3) { rescue(s); return }
  const target = nearestAction(s)
  if (!input.interact) { s.progress = 0; s.actionId = null; s.latch = false }
  else if (!s.latch && target && !target.blocked && !moving && p.grounded) {
    const key = `${target.kind}:${target.id}`
    if (s.actionId !== key) { s.progress = 0; s.actionId = key }
    s.progress += dt / target.duration
    if (s.progress >= 1) { perform(s, target); s.progress = 0; s.latch = true }
  } else if (!s.latch) { s.progress = 0; s.actionId = null }
  p.hazard = depth > 0.7 ? 'น้ำลึก · กลับที่ดอนหรือใช้สะพาน' : mud ? 'โคลนลึก · เดินช้าและเสียกำลัง' : storm && !sheltered ? 'พายุเข้า · หาที่กำบัง' : null
}
export function serialize(s) {
  return JSON.stringify({ version: 1, time: s.time, player: s.player, selected: s.selected, seeds: s.seeds, sites: s.sites, cleaned: s.cleaned, samples: s.samples, verified: s.verified, credits: s.credits, rescues: s.rescues })
}
export function restore(raw) {
  const fresh = createState()
  try {
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || !Array.isArray(saved.sites) || saved.sites.length !== 6) return fresh
    const finite = (v, fallback, a, b) => Number.isFinite(v) ? clamp(v, a, b) : fallback
    fresh.time = finite(saved.time, 0, 0, 1e8)
    fresh.selected = Math.floor(finite(saved.selected, 0, 0, 2))
    fresh.seeds = [0,1,2].map(i => Math.floor(finite(saved.seeds?.[i], 0, 0, 3)))
    fresh.sites = SITES.map((site, i) => ({ id: site.id,
      plantedAt: saved.sites[i]?.id === site.id && Number.isFinite(saved.sites[i].plantedAt) ? finite(saved.sites[i].plantedAt, null, 0, fresh.time) : null,
      sampled: saved.sites[i]?.sampled === true && Number.isFinite(saved.sites[i]?.plantedAt), health: 100 }))
    fresh.cleaned = TRASH.filter(t => Array.isArray(saved.cleaned) && saved.cleaned.includes(t.id)).map(t => t.id)
    fresh.samples = fresh.sites.filter(p => p.sampled).length
    fresh.verified = saved.verified === true && fresh.sites.every(p => p.plantedAt !== null) && fresh.cleaned.length === 3 && fresh.samples >= 3
    fresh.credits = fresh.verified ? 6 : 0
    fresh.rescues = Math.floor(finite(saved.rescues, 0, 0, 9999))
    fresh.player.x = finite(saved.player?.x, 0, -30, 28)
    fresh.player.z = finite(saved.player?.z, 12, -44, 24)
    fresh.player.y = floorHeight(fresh.player.x, fresh.player.z)
    fresh.player.health = finite(saved.player?.health, 100, 10, 100)
    fresh.player.stamina = finite(saved.player?.stamina, 100, 0, 100)
    announce(fresh, 'กลับสู่ภารกิจเดิม · ความคืบหน้าถูกเก็บแยกจากเกมฟาร์ม')
    return fresh
  } catch { return fresh }
}
