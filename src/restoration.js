// Deterministic, game-day rules. Rewards and deadlines survive reloads.
import { fieldwork } from './coast-progression.js'

export const freshExpedition = () => ({
  crewDay: 0, used: [], contract: null, completed: 0, streak: 0, bestStreak: 0,
  offerDay: 0, protectionDay: 0, cleanDay: 0, lastOutcome: null,
  counters: { clean: 0, care: 0, patrol: 0, survey: 0 }, achievements: [],
})
const alive = (g) => g.plots.filter((p) => p.species && !p.dead)
const cap = (v) => Math.min(100, Math.max(0, v))
const EVENT_ORDER = ['storm', 'wildlife', 'trash', 'kingtide', 'fishers', 'grant']
export function forecastFor(day) {
  const nextEventDay = (Math.floor(day / 5) + 1) * 5
  return {
    tide: ['น้ำลง', 'น้ำขึ้น', 'น้ำสูง', 'น้ำลด'][(day - 1) % 4],
    tideOffset: [-0.1, 0, 0.14, 0.03][(day - 1) % 4],
    golden: day % 6 >= 3,
    eventDay: nextEventDay,
    eventId: EVENT_ORDER[(Math.floor(nextEventDay / 5) - 1) % EVENT_ORDER.length],
    todayEvent: day % 5 === 0 ? EVENT_ORDER[(Math.floor(day / 5) - 1) % EVENT_ORDER.length] : null,
  }
}
export function habitatFor(g) {
  const trees = alive(g)
  const mature = trees.filter((p) => p.age >= 6).length
  const diversity = new Set(trees.map((p) => p.species)).size
  const health = trees.length ? trees.reduce((n, p) => n + p.health, 0) / trees.length : 0
  const score = Math.min(100, Math.round(trees.length / 16 * 35 + mature / 16 * 30 + diversity / 3 * 15 + health / 100 * 10 + Math.min(100, g.biodiversity) / 100 * 10))
  const stage = score >= 80 ? 3 : score >= 55 ? 2 : score >= 25 ? 1 : 0
  const stages = ['ชายฝั่งรอการฟื้นฟู', 'รากเริ่มตั้งตัว', 'แหล่งอนุบาลสัตว์น้ำ', 'อ่าวที่กลับมามีชีวิต']
  return { score, stage, name: stages[stage], next: [25, 55, 80, 100][stage], mature, living: trees.length, diversity, health }
}
export const CREW = {
  clean: { name: 'เก็บขยะ', cost: 0, hint: '+45 ● · สุขภาพทุกต้น +2', unlock: 'เริ่มได้ทันที' },
  care: { name: 'ดูแลต้นอ่อน', cost: 25, hint: 'ฟื้นสุขภาพ 3 ต้นที่อ่อนแอ +14', unlock: 'มีต้นไม้ 1 ต้น' },
  patrol: { name: 'เตรียมแนวป้องกัน', cost: 35, hint: 'ลดความเสียหายมรสุม/น้ำหนุน 8 · ใช้ได้ถึงเหตุการณ์ถัดไป', unlock: 'ต้นไม้รอด 3 ต้น' },
  survey: { name: 'สำรวจถิ่นอาศัย', cost: 20, hint: 'Biodiversity +3 · Community +1 · +20 XP', unlock: 'ต้นโตเต็มที่ 3 ต้น' },
}
export function crewLeft(g) {
  return g.expedition.crewDay === g.day ? Math.max(0, 2 - g.expedition.used.length) : 2
}
export function crewRule(g, key) {
  const spec = CREW[key]
  if (!spec) return { ok: false, reason: 'ไม่พบงาน' }
  const h = habitatFor(g)
  const unlocked = key === 'clean' || key === 'care' && h.living > 0 || key === 'patrol' && h.living >= 3 || key === 'survey' && h.mature >= 3
  let reason = !unlocked ? `ปลดล็อกเมื่อ${spec.unlock}` : ''
  if (!reason && g.event) reason = 'ตัดสินใจเหตุการณ์ก่อน'
  if (!reason && (g.expedition.crewDay === g.day && g.expedition.used.includes(key) || key === 'clean' && g.journey.fieldworkDay === g.day)) reason = 'ทำแล้ววันนี้'
  if (!reason && !crewLeft(g)) reason = 'ทีมครบ 2 งานแล้ว · พักและเริ่มวันใหม่'
  if (!reason && g.coins < spec.cost) reason = `ต้องมี ${spec.cost} เหรียญ`
  if (!reason && key === 'care' && !alive(g).some((p) => p.health < 100)) reason = 'ทุกต้นสุขภาพเต็มแล้ว'
  const nextHazard = forecastFor(g.day).eventId
  if (!reason && key === 'patrol' && !['storm', 'kingtide'].includes(nextHazard)) reason = 'รอบถัดไปไม่มีมรสุมหรือน้ำหนุน'
  if (!reason && key === 'patrol' && g.expedition.protectionDay === forecastFor(g.day).eventDay) reason = 'เตรียมรับเหตุการณ์ถัดไปแล้ว'
  return { ...spec, unlocked, ok: !reason, reason }
}
export function crewAction(g, key) {
  const rule = crewRule(g, key)
  if (!rule.ok) return g
  let next = { ...g, coins: g.coins - rule.cost }
  if (key === 'clean') next = fieldwork(next)
  if (key === 'care') {
    const ids = alive(g).filter((p) => p.health < 100).sort((a, b) => a.health - b.health || a.id - b.id).slice(0, 3).map((p) => p.id)
    next.plots = g.plots.map((p) => ids.includes(p.id) ? { ...p, health: cap(p.health + 14) } : p)
  }
  if (key === 'survey') { next.biodiversity = cap(g.biodiversity + 3); next.community = cap(g.community + 1) }
  if (key !== 'clean') next.journey = { ...g.journey, xp: g.journey.xp + (key === 'survey' ? 20 : 12) }
  next.expedition = { ...g.expedition, crewDay: g.day,
    used: [...(g.expedition.crewDay === g.day ? g.expedition.used : []), key],
    cleanDay: key === 'clean' ? g.day : g.expedition.cleanDay,
    protectionDay: key === 'patrol' ? forecastFor(g.day).eventDay : g.expedition.protectionDay,
    counters: { ...g.expedition.counters, [key]: g.expedition.counters[key] + 1 },
  }
  return settleRestoration(next)
}

const CONTRACTS = {
  roots: { title: 'รากใหม่ที่เหมาะกับพื้นที่', text: 'ปลูก Fit 2/2 เพิ่ม 2 ครั้ง', metric: 'perfect', goal: 2, coins: 95, xp: 35 },
  cleanup: { title: 'คืนชายฝั่งสะอาด', text: 'ส่งทีมเก็บขยะ 2 วัน', metric: 'clean', goal: 2, coins: 75, xp: 30 },
  habitat: { title: 'สำรวจบ้านของสัตว์น้ำ', text: 'ส่งทีมสำรวจถิ่นอาศัย 2 วัน', metric: 'survey', goal: 2, coins: 130, xp: 45 },
  carbon: { title: 'พิสูจน์คุณค่าของป่า', text: 'ออกเครดิต MRV เพิ่ม 8 tCO₂e', metric: 'verified', goal: 8, coins: 160, xp: 50 },
}
const metricValue = (g, metric) => metric === 'perfect' ? g.journey.perfect : metric === 'verified' ? g.stats.verified : g.expedition.counters[metric]
export function contractOffers(g) {
  // Two meaningful alternatives; never offer planting to a full forest.
  const types = ['cleanup']
  if (g.plots.filter((p) => !p.species && (p.soil !== 'ทราย' || p.prepared)).length >= 2) types.push('roots')
  if (habitatFor(g).mature >= 3) types.push('habitat')
  if (alive(g).length >= 3) types.push('carbon')
  const offset = (g.day - 1 + g.expedition.completed) % types.length
  return [types[offset], types[(offset + 1) % types.length]].filter((id, i, a) => a.indexOf(id) === i).map((id) => ({ id, ...CONTRACTS[id] }))
}
export function acceptContract(g, id) {
  if (g.event || g.expedition.contract || g.expedition.offerDay === g.day || !contractOffers(g).some((o) => o.id === id)) return g
  const spec = CONTRACTS[id]
  return { ...g, expedition: { ...g.expedition, offerDay: g.day, lastOutcome: null,
    contract: { id, start: metricValue(g, spec.metric), acceptedDay: g.day, deadline: g.day + 2 } } }
}
export function contractProgress(g) {
  const c = g.expedition.contract
  if (!c || !CONTRACTS[c.id]) return null
  const spec = CONTRACTS[c.id]
  const value = Math.max(0, Math.min(spec.goal, metricValue(g, spec.metric) - c.start))
  const bonus = Math.min(45, g.expedition.streak * 15)
  return { ...spec, ...c, value, ready: value >= spec.goal && g.day <= c.deadline, daysLeft: Math.max(0, c.deadline - g.day + 1), bonus }
}
export function claimContract(g) {
  const c = contractProgress(g)
  if (g.event || !c?.ready) return g
  return settleRestoration({ ...g, coins: g.coins + c.coins + c.bonus, journey: { ...g.journey, xp: g.journey.xp + c.xp }, expedition: {
    ...g.expedition, contract: null, completed: g.expedition.completed + 1, streak: g.expedition.streak + 1,
    bestStreak: Math.max(g.expedition.bestStreak, g.expedition.streak + 1),
    lastOutcome: { type: 'complete', title: c.title, day: g.day, coins: c.coins + c.bonus },
  } })
}
export const ACHIEVEMENTS = [
  { id: 'roots', name: 'รากแห่งความหวัง', text: 'ป่ามีชีวิต 6 ต้น', xp: 25, test: (g) => alive(g).length >= 6 },
  { id: 'guardian', name: 'ทีมฟื้นฟูมืออาชีพ', text: 'ส่งมอบงานฟื้นฟู 3 งาน', xp: 50, test: (g) => g.expedition.completed >= 3 },
  { id: 'diverse', name: 'บ้านของทุกชีวิต', text: 'ต้นโตเต็มที่ครบ 3 สายพันธุ์', xp: 60, test: (g) => new Set(alive(g).filter((p) => p.age >= 6).map((p) => p.species)).size >= 3 },
  { id: 'bay', name: 'อ่าวมีชีวิต', text: 'ฟื้นตัวของพื้นที่ 80%', xp: 90, test: (g) => habitatFor(g).score >= 80 },
]
export function settleRestoration(g) {
  const earned = ACHIEVEMENTS.filter((a) => !g.expedition.achievements.includes(a.id) && a.test(g))
  if (!earned.length) return g
  return { ...g, journey: { ...g.journey, xp: g.journey.xp + earned.reduce((sum, a) => sum + a.xp, 0) },
    expedition: { ...g.expedition, achievements: [...g.expedition.achievements, ...earned.map((a) => a.id)] } }
}
export function closeRestorationDay(g) {
  const expired = g.expedition.contract && g.day > g.expedition.contract.deadline
  const next = expired ? { ...g, expedition: { ...g.expedition, contract: null, streak: 0,
    lastOutcome: { type: 'expired', title: CONTRACTS[g.expedition.contract.id].title, day: g.day } } } : g
  return settleRestoration(next)
}
export function prepareSoil(g, id) {
  const plot = g.plots.find((p) => p.id === id)
  if (g.event || !plot || plot.species || plot.soil !== 'ทราย' || plot.prepared || g.coins < 40) return g
  return { ...g, coins: g.coins - 40, plots: g.plots.map((p) => p.id === id ? { ...p, prepared: true } : p) }
}
export function stormDamage(g, paid, base = 15) {
  const prepared = g.expedition.protectionDay === g.day ? 8 : 0
  const matureRoots = alive(g).filter((p) => p.species === 'rhizophora' && p.age >= 6).length
  return Math.max(0, (paid ? 3 : base) - prepared - Math.min(4, matureRoots))
}
export function restoreExpedition(parsed, day) {
  const next = freshExpedition()
  const integer = (v, max = 1e7) => Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0
  if (!parsed || typeof parsed !== 'object') return next
  for (const key of ['crewDay', 'offerDay', 'cleanDay']) next[key] = integer(parsed[key], day)
  next.protectionDay = integer(parsed.protectionDay, day + 5)
  for (const key of ['completed', 'streak', 'bestStreak']) next[key] = integer(parsed[key])
  next.used = Array.isArray(parsed.used) ? [...new Set(parsed.used.filter((k) => CREW[k]))].slice(0, 2) : []
  for (const key of Object.keys(next.counters)) next.counters[key] = integer(parsed.counters?.[key])
  next.achievements = ACHIEVEMENTS.filter((a) => Array.isArray(parsed.achievements) && parsed.achievements.includes(a.id)).map((a) => a.id)
  const c = parsed.contract
  if (c && CONTRACTS[c.id] && Number.isFinite(c.start) && c.start >= 0 && Number.isInteger(c.acceptedDay) && c.acceptedDay >= 1 && c.acceptedDay <= day && c.deadline === c.acceptedDay + 2) {
    if (c.deadline >= day) next.contract = { id: c.id, start: c.start, acceptedDay: c.acceptedDay, deadline: c.deadline }
    else next.streak = 0
  }
  const outcome = parsed.lastOutcome
  if (outcome && ['complete', 'expired'].includes(outcome.type) && typeof outcome.title === 'string') next.lastOutcome = { type: outcome.type, title: outcome.title.slice(0, 90), day: integer(outcome.day, day), coins: integer(outcome.coins) }
  return next
}
