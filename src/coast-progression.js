// Pure progression rules. All deadlines use game days, never real-world time.
export const freshJourney = () => ({ xp: 0, combo: 0, bestCombo: 0, perfect: 0, mission: 0, fieldworkDay: 0, deliveryDay: 0, discovered: [], sandbox: false })
export const RANKS = [
  { xp: 0, name: 'นักปลูกมือใหม่' }, { xp: 100, name: 'ผู้ดูแลชายฝั่ง' },
  { xp: 260, name: 'นักฟื้นฟูระบบนิเวศ' }, { xp: 520, name: 'ผู้พิทักษ์ป่าชายเลน' },
  { xp: 900, name: 'ตำนานแห่งอ่าว' },
]

export function rankFor(xp) {
  const index = RANKS.findLastIndex((rank) => xp >= rank.xp)
  const rank = RANKS[Math.max(0, index)]
  const next = RANKS[index + 1]
  return { ...rank, level: index + 1, next, progress: next ? Math.min(100, (xp - rank.xp) / (next.xp - rank.xp) * 100) : 100 }
}

const living = (game) => game.plots.filter((p) => p.species && !p.dead)
const mature = (game) => living(game).filter((p) => p.age >= 6)
export const WILDLIFE = [
  { id: 'crab', icon: '🦀', name: 'ปูก้ามดาบ', hint: 'ต้นไม้รอด 3 ต้น', test: (g) => living(g).length >= 3, reward: 35 },
  { id: 'fish', icon: '🐟', name: 'ฝูงปลาวัยอ่อน', hint: 'ต้นไม้รอด 4 ต้น', test: (g) => living(g).length >= 4, reward: 45 },
  { id: 'bird', icon: '🕊', name: 'นกชายเลน', hint: 'ต้นโตเต็มที่ 3 ต้น', test: (g) => mature(g).length >= 3, reward: 65 },
  { id: 'firefly', icon: '✦', name: 'หิ่งห้อยลำพู', hint: 'ลำพูโตเต็มที่ 2 ต้น + Biodiversity 30', test: (g) => mature(g).filter((p) => p.species === 'sonneratia').length >= 2 && g.biodiversity >= 30, reward: 90 },
]

const MISSIONS = [
  { name: 'รากแรกของอ่าว', description: 'ปลูกให้เหมาะทั้งน้ำและดิน 3 ครั้ง (Fit 2/2)', goal: 3, value: (g) => g.journey.perfect, coins: 100, xp: 35 },
  { name: 'ป่าที่หลากหลาย', description: 'มีต้นไม้ที่ยังมีชีวิตครบ 3 สายพันธุ์', goal: 3, value: (g) => new Set(living(g).map((p) => p.species)).size, coins: 120, xp: 45 },
  { name: 'บ้านหลังใหม่ของสัตว์', description: 'ดูแลต้นไม้จนโตเต็มที่ 3 ต้น (อายุ 6 วัน)', goal: 3, value: (g) => mature(g).length, coins: 160, xp: 55 },
  { name: 'คุณค่าที่พิสูจน์ได้', description: 'ออกเครดิตผ่าน MRV สะสม 10 tCO₂e', goal: 10, value: (g) => g.stats.verified, coins: 180, xp: 65 },
  { name: 'เติบโตไปด้วยกัน', description: 'อัปเกรดสิ่งปลูกสร้างรวม 2 ระดับ', goal: 2, value: (g) => Object.values(g.upgrades).reduce((a, b) => a + b, 0), coins: 200, xp: 75 },
  { name: 'อ่าวกลับมามีชีวิต', description: 'มีต้นไม้ที่ยังมีชีวิตอย่างน้อย 12 ต้น', goal: 12, value: (g) => living(g).length, coins: 260, xp: 100 },
]

export function missionFor(game) {
  const mission = MISSIONS[game.journey.mission]
  if (mission) {
    const value = Math.min(mission.goal, mission.value(game))
    return { ...mission, value, ready: value >= mission.goal, recurring: false }
  }
  const goal = Math.min(20, 5 + (game.journey.mission - MISSIONS.length) * 2)
  return { name: 'คำสั่งซื้อจากชุมชน', description: `ส่งมอบ ${goal} เครดิต รับราคาพิเศษ 110% · วันละ 1 ครั้ง`, goal,
    value: Math.min(goal, game.credits), coins: Math.round(goal * game.marketPrice * 1.1), xp: 45, recurring: true,
    ready: game.credits >= goal && game.journey.deliveryDay !== game.day }
}

export function claimMission(game) {
  if (game.event) return game
  const mission = missionFor(game)
  if (!mission.ready) return game
  return { ...game, coins: game.coins + mission.coins,
    credits: mission.recurring ? Math.max(0, game.credits - mission.goal) : game.credits,
    stats: { ...game.stats, sold: game.stats.sold + (mission.recurring ? mission.goal : 0) },
    journey: { ...game.journey, xp: game.journey.xp + mission.xp, mission: game.journey.mission + 1,
      deliveryDay: mission.recurring ? game.day : game.journey.deliveryDay } }
}

export function rewardPlant(game, fit) {
  const combo = fit === 2 ? Math.min(5, game.journey.combo + 1) : 0
  const bonus = combo * 4
  return { ...game, coins: game.coins + bonus, journey: { ...game.journey,
    xp: game.journey.xp + 8 + fit * 4, combo, bestCombo: Math.max(combo, game.journey.bestCombo),
    perfect: game.journey.perfect + Number(fit === 2) } }
}

export function fieldwork(game) {
  if (game.event || game.journey.fieldworkDay === game.day) return game
  return { ...game, coins: game.coins + 45, biodiversity: Math.min(100, game.biodiversity + 0.5),
    community: Math.min(100, game.community + 0.6),
    plots: game.plots.map((p) => p.species && !p.dead ? { ...p, health: Math.min(100, p.health + 2) } : p),
    journey: { ...game.journey, xp: game.journey.xp + 12, fieldworkDay: game.day } }
}

export function discoverWildlife(game) {
  const found = WILDLIFE.filter((animal) => !game.journey.discovered.includes(animal.id) && animal.test(game))
  if (!found.length) return game
  return { ...game, coins: game.coins + found.reduce((total, animal) => total + animal.reward, 0),
    journey: { ...game.journey, xp: game.journey.xp + found.length * 25,
      discovered: [...game.journey.discovered, ...found.map((animal) => animal.id)] } }
}

// A diverse forest improves daily carbon production; the bonus is visible in the HUD.
export function diversityBonus(game) {
  return new Set(living(game).map((p) => p.species)).size === 3 ? 1.15 : 1
}

export function reconcileDeaths(before, after) {
  const plots = after.plots.map((p) => p.species && !p.dead && p.health <= 5 ? { ...p, dead: true } : p)
  const newDeaths = plots.filter((p, i) => p.dead && !before.plots[i].dead).length
  return { ...after, plots, stats: { ...after.stats, dead: before.stats.dead + newDeaths } }
}

// Keep v2 saves and migrate only new fields; damaged values cannot crash the HUD.
export function restoreGame(parsed, initial) {
  if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.plots) || parsed.plots.length !== initial.plots.length) return initial
  const next = { ...initial }
  for (const key of ['day', 'coins', 'gems', 'estimatedCarbon', 'credits', 'biodiversity', 'community', 'coastal', 'marketPrice']) {
    if (Number.isFinite(parsed[key]) && parsed[key] >= (key === 'day' ? 1 : 0)) next[key] = parsed[key]
  }
  next.day = Math.floor(next.day)
  for (const key of ['biodiversity', 'community', 'coastal']) next[key] = Math.min(100, next[key])
  next.plots = initial.plots.map((base, index) => {
    const p = parsed.plots[index]
    if (!p || p.id !== base.id) return base
    const species = ['rhizophora', 'avicennia', 'sonneratia'].includes(p.species) ? p.species : null
    return { ...base, species, age: Number.isFinite(p.age) ? Math.max(0, p.age) : 0,
      health: Number.isFinite(p.health) ? Math.max(0, Math.min(100, p.health)) : 100, dead: Boolean(species && (p.dead || p.health <= 5)) }
  })
  if (['rhizophora', 'avicennia', 'sonneratia'].includes(parsed.activeSpecies)) next.activeSpecies = parsed.activeSpecies
  for (const group of ['stats', 'upgrades']) {
    next[group] = { ...initial[group] }
    for (const key of Object.keys(initial[group])) if (Number.isFinite(parsed[group]?.[key])) next[group][key] = Math.max(0, parsed[group][key])
  }
  for (const key of Object.keys(next.upgrades)) next.upgrades[key] = Math.min(3, Math.floor(next.upgrades[key]))
  next.claimedChapters = [...new Set((Array.isArray(parsed.claimedChapters) ? parsed.claimedChapters : []).filter((x) => Number.isInteger(x) && x >= 0 && x < 4))]
  next.log = Array.isArray(parsed.log) ? parsed.log.filter((x) => x && typeof x.text === 'string' && Number.isFinite(x.day)).slice(0, 8) : initial.log
  next.journey = freshJourney()
  for (const key of ['xp', 'combo', 'bestCombo', 'perfect', 'mission', 'fieldworkDay', 'deliveryDay']) {
    if (Number.isFinite(parsed.journey?.[key])) next.journey[key] = Math.max(0, Math.floor(parsed.journey[key]))
  }
  next.journey.combo = Math.min(5, next.journey.combo)
  next.journey.bestCombo = Math.min(5, next.journey.bestCombo)
  next.journey.discovered = WILDLIFE.filter((x) => parsed.journey?.discovered?.includes?.(x.id)).map((x) => x.id)
  if (!parsed.journey) {
    const rules = { rhizophora: [['กลาง'], ['เลน', 'ตะกอน']], avicennia: [['กลาง', 'สูง'], ['ตะกอน', 'ดินเลน']], sonneratia: [['ต่ำ', 'กลาง'], ['เลน', 'ตะกอน']] }
    next.journey.perfect = next.plots.filter((p) => p.species && rules[p.species][0].includes(p.tide) && rules[p.species][1].includes(p.soil)).length
  }
  next.journey.sandbox = parsed.journey?.sandbox === true
  // Rehydrate event content from trusted definitions in App, rather than save text.
  next.event = parsed.event?.id ? { id: parsed.event.id } : null
  return next
}
