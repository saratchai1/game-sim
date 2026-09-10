export const SAVE_KEY = 'mangrove-bay-3d-save-v1'

export const SPECIES = {
  rhizophora: {
    id: 'rhizophora',
    name: 'โกงกางใบใหญ่',
    short: 'โกงกาง',
    latin: 'Rhizophora mucronata',
    cost: 64,
    carbon: 1.55,
    biodiversity: 0.95,
    tides: ['กลาง'],
    soils: ['เลน', 'ตะกอน'],
    trait: 'คาร์บอนสูง · รากค้ำจุนชายฝั่ง',
    leaf: '#278a4c',
    leafDark: '#12653b',
    trunk: '#754225',
    accent: '#9bd63f',
    canopy: [1.08, 0.88, 1.02],
  },
  avicennia: {
    id: 'avicennia',
    name: 'แสมขาว',
    short: 'แสม',
    latin: 'Avicennia alba',
    cost: 50,
    carbon: 1.18,
    biodiversity: 1.25,
    tides: ['กลาง', 'สูง'],
    soils: ['ตะกอน', 'ดินเลน'],
    trait: 'ตั้งตัวไว · ฟื้นพื้นที่เปิด',
    leaf: '#64ad58',
    leafDark: '#367f49',
    trunk: '#8c765e',
    accent: '#d2ef77',
    canopy: [1.16, 0.72, 1.04],
  },
  sonneratia: {
    id: 'sonneratia',
    name: 'ลำพู',
    short: 'ลำพู',
    latin: 'Sonneratia caseolaris',
    cost: 58,
    carbon: 1.28,
    biodiversity: 1.58,
    tides: ['ต่ำ', 'กลาง'],
    soils: ['เลน', 'ตะกอน'],
    trait: 'ถิ่นอาศัยสัตว์น้ำ · Biodiversity สูง',
    leaf: '#3d9f55',
    leafDark: '#1c7443',
    trunk: '#8a5233',
    accent: '#f0c94f',
    canopy: [1.28, 0.82, 1.18],
  },
}

export const PLOT_BLUEPRINT = [
  { id: 1, position: [-5.25, 0, 2.65], tide: 'ต่ำ', soil: 'เลน' },
  { id: 2, position: [-2.05, 0, 2.85], tide: 'ต่ำ', soil: 'เลน' },
  { id: 3, position: [1.15, 0, 2.62], tide: 'ต่ำ', soil: 'ตะกอน' },
  { id: 4, position: [4.25, 0, 2.82], tide: 'ต่ำ', soil: 'ทราย' },
  { id: 5, position: [-4.65, 0, 1.05], tide: 'กลาง', soil: 'เลน' },
  { id: 6, position: [-1.48, 0, 1.12], tide: 'กลาง', soil: 'เลน' },
  { id: 7, position: [1.65, 0, 0.95], tide: 'กลาง', soil: 'ตะกอน' },
  { id: 8, position: [4.72, 0, 1.18], tide: 'กลาง', soil: 'ทราย' },
  { id: 9, position: [-5.05, 0, -0.62], tide: 'กลาง', soil: 'ตะกอน' },
  { id: 10, position: [-1.88, 0, -0.52], tide: 'กลาง', soil: 'ดินเลน' },
  { id: 11, position: [1.28, 0, -0.7], tide: 'สูง', soil: 'ตะกอน' },
  { id: 12, position: [4.42, 0, -0.48], tide: 'สูง', soil: 'ดินเลน' },
  { id: 13, position: [-4.45, 0, -2.22], tide: 'สูง', soil: 'ดินเลน' },
  { id: 14, position: [-1.12, 0, -2.18], tide: 'สูง', soil: 'ตะกอน' },
  { id: 15, position: [2.12, 0, -2.34], tide: 'สูง', soil: 'ทราย' },
  { id: 16, position: [5.02, 0, -2.06], tide: 'สูง', soil: 'ดินเลน' },
]

export const EVENTS = [
  {
    id: 'storm',
    icon: '☂',
    category: 'WEATHER',
    title: 'มรสุมกำลังเข้า',
    text: 'คลื่นแรงจะกระทบต้นกล้าและต้นอ่อน โดยเฉพาะแปลงที่ระบบรากยังไม่ตั้งตัว',
    choices: [
      { key: 'protect', label: 'เสริมแนวป้องกัน', hint: 'ใช้ 120 เหรียญ · ลดความเสียหาย', cost: 120 },
      { key: 'risk', label: 'รับความเสี่ยง', hint: 'ไม่เสียเงิน · ต้นอ่อนเสียสุขภาพ', cost: 0 },
    ],
  },
  {
    id: 'trash',
    icon: '♻',
    category: 'COAST',
    title: 'ขยะทะเลพัดเข้าพื้นที่',
    text: 'ขยะติดตามแนวรากและร่องน้ำ หากปล่อยไว้อาจลดคุณภาพถิ่นอาศัย',
    choices: [
      { key: 'clean', label: 'จ้างชุมชนเก็บขยะ', hint: 'ใช้ 75 เหรียญ · Nature + Community', cost: 75 },
      { key: 'leave', label: 'จัดการภายหลัง', hint: 'Biodiversity ลดลง', cost: 0 },
    ],
  },
  {
    id: 'nursery',
    icon: '⌂',
    category: 'COMMUNITY',
    title: 'ชุมชนเสนอขยายเรือนเพาะชำ',
    text: 'การลงทุนร่วมกันจะลดต้นทุนต้นกล้าและสร้างงานในพื้นที่อย่างต่อเนื่อง',
    choices: [
      { key: 'invest', label: 'ร่วมลงทุน Nursery', hint: 'ใช้ 150 เหรียญ · Nursery +1', cost: 150 },
      { key: 'later', label: 'ไว้รอบหน้า', hint: 'ไม่มีผล', cost: 0 },
    ],
  },
  {
    id: 'wildlife',
    icon: '✦',
    category: 'BIODIVERSITY',
    title: 'ปูและปลาเริ่มกลับมา',
    text: 'บริเวณรากไม้เริ่มกลายเป็นแหล่งหลบภัยและพื้นที่อนุบาลสัตว์น้ำ',
    choices: [
      { key: 'record', label: 'บันทึกการสำรวจ', hint: 'Biodiversity +7', cost: 0 },
    ],
  },
  {
    id: 'fisher',
    icon: '⚓',
    category: 'LIVELIHOOD',
    title: 'กลุ่มประมงขอทำเขตอนุบาล',
    text: 'ชุมชนเสนอแบ่งพื้นที่น้ำตื้นเป็นเขตอนุบาลสัตว์น้ำและติดตามผลร่วมกัน',
    choices: [
      { key: 'support', label: 'สนับสนุนอุปกรณ์', hint: 'ใช้ 95 เหรียญ · Community + Coastal', cost: 95 },
      { key: 'observe', label: 'เริ่มแบบอาสาสมัคร', hint: 'Community +2', cost: 0 },
    ],
  },
  {
    id: 'erosion',
    icon: '≈',
    category: 'COASTAL RISK',
    title: 'แนวตลิ่งเริ่มถูกกัดเซาะ',
    text: 'กระแสน้ำเปลี่ยนทิศและพาตะกอนออกจากด้านหน้าพื้นที่ฟื้นฟู',
    choices: [
      { key: 'barrier', label: 'ทำแนวชะลอคลื่น', hint: 'ใช้ 135 เหรียญ · Coastal +8', cost: 135 },
      { key: 'monitor', label: 'ติดตามต่ออีกระยะ', hint: 'Coastal -4', cost: 0 },
    ],
  },
]

export const UPGRADE_DEFS = {
  nursery: {
    name: 'Community Nursery',
    icon: '⌂',
    description: 'ลดค่าต้นกล้า 7 เหรียญต่อระดับ',
    costs: [150, 240, 360],
  },
  drone: {
    name: 'Drone MRV Lab',
    icon: '◇',
    description: 'ลดค่าตรวจ MRV และเพิ่ม verification factor',
    costs: [190, 300, 440],
  },
  community: {
    name: 'Local Steward Team',
    icon: '●',
    description: 'เพิ่มรายได้รายวันและผลลัพธ์จากกิจกรรมชุมชน',
    costs: [170, 270, 400],
  },
}

export const CHAPTERS = [
  {
    id: 0,
    title: 'ตั้งราก',
    text: 'ปลูกต้นไม้ให้รอดอย่างน้อย 4 ต้น',
    reward: 130,
    progress: (game, derived) => Math.min(derived.living / 4, 1),
    complete: (game, derived) => derived.living >= 4,
  },
  {
    id: 1,
    title: 'ป่ากำลังกลับมา',
    text: 'มีต้นโตเต็มที่ 3 ต้น และ Biodiversity 24+',
    reward: 180,
    progress: (game, derived) => Math.min((derived.mature / 3 + game.biodiversity / 24) / 2, 1),
    complete: (game, derived) => derived.mature >= 3 && game.biodiversity >= 24,
  },
  {
    id: 2,
    title: 'พิสูจน์ผลลัพธ์',
    text: 'สะสม Verified Carbon 10 tCO₂e และ Community 25+',
    reward: 240,
    progress: (game) => Math.min((game.stats.verified / 10 + game.community / 25) / 2, 1),
    complete: (game) => game.stats.verified >= 10 && game.community >= 25,
  },
  {
    id: 3,
    title: 'Living Coast',
    text: 'สร้างโครงการสมดุลจนผ่านมาตรฐาน Living Coast',
    reward: 500,
    progress: (game, derived) => derived.campaignProgress,
    complete: (game, derived) => derived.campaignComplete,
  },
]

export const createInitialGame = () => ({
  version: 3,
  day: 1,
  coins: 820,
  estimatedCarbon: 0,
  credits: 0,
  biodiversity: 9,
  community: 11,
  coastal: 8,
  marketPrice: 82,
  marketHistory: [76, 79, 78, 81, 82],
  selectedSpecies: 'rhizophora',
  weather: 'sunny',
  plots: PLOT_BLUEPRINT.map((plot) => ({
    id: plot.id,
    species: null,
    age: 0,
    health: 100,
    dead: false,
  })),
  event: null,
  upgrades: { nursery: 0, drone: 0, community: 0 },
  claimedChapters: [],
  completed: false,
  sandbox: false,
  stats: { planted: 0, dead: 0, verified: 0, sold: 0, cared: 0 },
  log: [
    { day: 1, icon: '⌖', text: 'รับมอบพื้นที่ชายฝั่งเสื่อมโทรม เริ่มสำรวจดินและระดับน้ำ' },
  ],
})

export function loadGame() {
  if (typeof window === 'undefined') return createInitialGame()
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return createInitialGame()
    const saved = JSON.parse(raw)
    const initial = createInitialGame()
    const savedPlots = new Map((saved.plots || []).map((plot) => [plot.id, plot]))
    return {
      ...initial,
      ...saved,
      version: 3,
      upgrades: { ...initial.upgrades, ...(saved.upgrades || {}) },
      stats: { ...initial.stats, ...(saved.stats || {}) },
      claimedChapters: Array.isArray(saved.claimedChapters) ? saved.claimedChapters : [],
      marketHistory: Array.isArray(saved.marketHistory) && saved.marketHistory.length
        ? saved.marketHistory.slice(-12)
        : initial.marketHistory,
      plots: PLOT_BLUEPRINT.map((blueprint) => ({
        ...initial.plots.find((plot) => plot.id === blueprint.id),
        ...(savedPlots.get(blueprint.id) || {}),
      })),
    }
  } catch {
    return createInitialGame()
  }
}

export function saveGame(game) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(game))
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function getPlotBlueprint(plotId) {
  return PLOT_BLUEPRINT.find((plot) => plot.id === plotId)
}

export function suitability(plotId, speciesId) {
  const plot = getPlotBlueprint(plotId)
  const species = SPECIES[speciesId]
  if (!plot || !species) return 0
  return Number(species.tides.includes(plot.tide)) + Number(species.soils.includes(plot.soil))
}

export function plantingCost(game, speciesId) {
  const base = SPECIES[speciesId]?.cost || 0
  return Math.max(28, base - (game.upgrades?.nursery || 0) * 7)
}

export function verificationCost(game) {
  return Math.max(65, 125 - (game.upgrades?.drone || 0) * 18)
}

export function stageFor(plot) {
  if (!plot?.species) return 'empty'
  if (plot.dead) return 'dead'
  if (plot.age < 2) return 'seedling'
  if (plot.age < 6) return 'young'
  return 'mature'
}

export function stageLabel(plot) {
  return {
    empty: 'แปลงว่าง',
    seedling: 'ต้นกล้า',
    young: 'ต้นอ่อน',
    mature: 'โตเต็มที่',
    dead: 'ไม่รอด',
  }[stageFor(plot)]
}

export function tidePhase(day) {
  return ['น้ำลง', 'น้ำกำลังขึ้น', 'น้ำขึ้น', 'น้ำกำลังลง'][(day - 1) % 4]
}

export function weatherForDay(day) {
  return ['sunny', 'sunny', 'breeze', 'sunny', 'rain', 'sunny'][(day - 1) % 6]
}

export function survivalRate(game) {
  if (!game.stats.planted) return 100
  return clamp(Math.round(((game.stats.planted - game.stats.dead) / game.stats.planted) * 100))
}

export function impactScore(game) {
  return clamp(Math.round(
    game.biodiversity * 0.38 + game.community * 0.34 + game.coastal * 0.28,
  ))
}

export function deriveGame(game) {
  const living = game.plots.filter((plot) => plot.species && !plot.dead).length
  const mature = game.plots.filter((plot) => plot.species && !plot.dead && plot.age >= 6).length
  const survival = survivalRate(game)
  const requirements = [
    { key: 'living', label: 'ต้นไม้รอด', value: living, target: 12 },
    { key: 'mature', label: 'ต้นโตเต็มที่', value: mature, target: 8 },
    { key: 'verified', label: 'Verified Carbon', value: game.stats.verified, target: 25, decimals: 1 },
    { key: 'biodiversity', label: 'Biodiversity', value: game.biodiversity, target: 45 },
    { key: 'community', label: 'Community', value: game.community, target: 35 },
    { key: 'coastal', label: 'Coastal resilience', value: game.coastal, target: 35 },
    { key: 'survival', label: 'Survival rate', value: survival, target: 70, suffix: '%' },
  ]
  const campaignComplete = requirements.every((item) => item.value >= item.target)
  const campaignProgress = requirements.reduce(
    (sum, item) => sum + Math.min(item.value / item.target, 1),
    0,
  ) / requirements.length
  return {
    living,
    mature,
    survival,
    impact: impactScore(game),
    requirements,
    campaignComplete,
    campaignProgress,
  }
}

export function projectGrade(game, derived = deriveGame(game)) {
  const score = derived.impact * 0.55 + derived.survival * 0.2 + Math.min(game.stats.verified / 25, 1) * 25
  if (score >= 86) return 'A'
  if (score >= 72) return 'B'
  return 'C'
}
