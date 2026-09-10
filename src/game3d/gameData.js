export const SAVE_KEY = 'mangrove-blue-carbon-save-v3'
export const LEGACY_SAVE_KEYS = [
  'mangrove-blue-carbon-save-v2',
  'mangrove-blue-carbon-save-v1',
]
export const TUTORIAL_KEY = 'mangrove-blue-carbon-3d-tutorial-seen'

export const SPECIES = {
  rhizophora: {
    name: 'โกงกางใบใหญ่',
    short: 'โกงกาง',
    latin: 'Rhizophora mucronata',
    icon: '🌱',
    cost: 65,
    carbon: 1.55,
    biodiversity: 1,
    tides: ['กลาง'],
    soils: ['เลน', 'ตะกอน'],
    note: 'คาร์บอนสูงและมีรากค้ำจุนเด่น เหมาะกับโซนน้ำกลาง',
    colors: {
      trunk: '#8f4f2c',
      leaf: '#2f9a52',
      leafDark: '#18753d',
      accent: '#f0d47c',
    },
  },
  avicennia: {
    name: 'แสมขาว',
    short: 'แสม',
    latin: 'Avicennia alba',
    icon: '🌿',
    cost: 50,
    carbon: 1.2,
    biodiversity: 1.2,
    tides: ['กลาง', 'สูง'],
    soils: ['ตะกอน', 'ดินเลน'],
    note: 'ตั้งตัวไว ทรงพุ่มโปร่ง เหมาะกับโซนกลางถึงสูง',
    colors: {
      trunk: '#9a7754',
      leaf: '#76c95e',
      leafDark: '#4aa549',
      accent: '#d8ef9d',
    },
  },
  sonneratia: {
    name: 'ลำพู',
    short: 'ลำพู',
    latin: 'Sonneratia caseolaris',
    icon: '☘️',
    cost: 58,
    carbon: 1.3,
    biodiversity: 1.55,
    tides: ['ต่ำ', 'กลาง'],
    soils: ['เลน', 'ตะกอน'],
    note: 'ทรงพุ่มกว้าง ให้แต้มระบบนิเวศสูง เหมาะกับริมน้ำ',
    colors: {
      trunk: '#85553d',
      leaf: '#46b268',
      leafDark: '#248e53',
      accent: '#ffd2d8',
    },
  },
}

const PLOT_CONDITIONS = [
  ['ต่ำ', 'เลน'], ['ต่ำ', 'เลน'], ['ต่ำ', 'ตะกอน'], ['ต่ำ', 'ทราย'],
  ['กลาง', 'เลน'], ['กลาง', 'เลน'], ['กลาง', 'ตะกอน'], ['กลาง', 'ทราย'],
  ['กลาง', 'ตะกอน'], ['กลาง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ดินเลน'],
  ['สูง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ทราย'], ['สูง', 'ดินเลน'],
]

export const PLOT_LAYOUT = [
  [-7.2, -5.8], [-2.7, -6.2], [1.8, -6], [6.2, -5.4],
  [-8, -1.9], [-3.25, -2.2], [1.45, -2], [6.35, -1.45],
  [-7.45, 2.25], [-2.65, 2], [2.25, 2.2], [7.05, 2.7],
  [-6.25, 6.2], [-1.3, 6], [3.55, 6.25], [8.05, 6.6],
]

export const BASE_PLOTS = PLOT_CONDITIONS.map(([tide, soil], index) => ({
  id: index + 1,
  tide,
  soil,
  species: null,
  age: 0,
  health: 100,
  dead: false,
}))

export const EVENTS = [
  {
    id: 'storm',
    eyebrow: 'WEATHER EVENT',
    title: 'มรสุมกำลังเข้า',
    text: 'คลื่นแรงอาจกระทบต้นกล้าและต้นอ่อน คุณจะจัดการอย่างไร?',
    icon: '🌧️',
    choices: [
      { key: 'protect', label: 'เสริมแนวป้องกัน', hint: '-90 เหรียญ · ลดความเสียหาย', cost: 90 },
      { key: 'risk', label: 'รับความเสี่ยง', hint: 'ฟรี · ต้นอ่อนเสียสุขภาพ', cost: 0 },
    ],
  },
  {
    id: 'trash',
    eyebrow: 'COASTAL EVENT',
    title: 'ขยะทะเลพัดเข้าแปลง',
    text: 'ขยะสะสมตามแนวราก หากปล่อยไว้อาจกระทบระบบนิเวศ',
    icon: '🧹',
    choices: [
      { key: 'clean', label: 'จ้างชุมชนเก็บขยะ', hint: '-65 เหรียญ · ธรรมชาติ + ชุมชน', cost: 65 },
      { key: 'leave', label: 'ไว้ก่อน', hint: 'ฟรี · Biodiversity ลดลง', cost: 0 },
    ],
  },
  {
    id: 'nursery',
    eyebrow: 'COMMUNITY EVENT',
    title: 'ชุมชนเสนอทำเรือนเพาะชำ',
    text: 'ลงทุนร่วมกับชุมชนเพื่อลดต้นทุนต้นกล้าในอนาคต',
    icon: '🏡',
    choices: [
      { key: 'invest', label: 'ร่วมลงทุน Nursery', hint: '-150 เหรียญ · Nursery ดีขึ้น', cost: 150 },
      { key: 'later', label: 'ไว้รอบหน้า', hint: 'ไม่มีผล', cost: 0 },
    ],
  },
  {
    id: 'wildlife',
    eyebrow: 'BIODIVERSITY EVENT',
    title: 'ปูและปลากลับเข้าพื้นที่',
    text: 'พื้นที่ฟื้นฟูเริ่มเป็นแหล่งอนุบาลสัตว์น้ำอีกครั้ง',
    icon: '🦀',
    choices: [
      { key: 'record', label: 'บันทึกการสำรวจ', hint: 'Biodiversity +6', cost: 0 },
    ],
  },
  {
    id: 'fishers',
    eyebrow: 'COMMUNITY EVENT',
    title: 'กลุ่มประมงพื้นบ้านขอร่วมวางแผน',
    text: 'ชาวบ้านเสนอเขตอนุรักษ์สัตว์น้ำวัยอ่อนรอบป่าฟื้นฟู',
    icon: '🐟',
    choices: [
      { key: 'partner', label: 'ทำข้อตกลงร่วมกัน', hint: '-55 เหรียญ · Community +8', cost: 55 },
      { key: 'decline', label: 'ยังไม่พร้อม', hint: 'Community -2', cost: 0 },
    ],
  },
  {
    id: 'erosion',
    eyebrow: 'COASTAL EVENT',
    title: 'แนวชายฝั่งเริ่มถูกกัดเซาะ',
    text: 'พื้นที่เปิดรับคลื่นมากขึ้น ควรลงทุนลดแรงคลื่นหรือเฝ้าดูต่อ',
    icon: '🌊',
    choices: [
      { key: 'barrier', label: 'ทำแนวลดแรงคลื่น', hint: '-110 เหรียญ · Resilience +9', cost: 110 },
      { key: 'observe', label: 'เฝ้าดูต่อ', hint: 'Resilience -5', cost: 0 },
    ],
  },
]

export const UPGRADES = {
  nursery: {
    icon: '🏡',
    name: 'เรือนเพาะชำชุมชน',
    short: 'Nursery',
    description: 'ลดค่าต้นกล้า 7 เหรียญต่อระดับ',
    baseCost: 150,
    step: 85,
  },
  drone: {
    icon: '🚁',
    name: 'ระบบ Drone MRV',
    short: 'Drone MRV',
    description: 'ลดค่าตรวจและเพิ่มอัตราออกเครดิต',
    baseCost: 190,
    step: 105,
  },
  community: {
    icon: '🤝',
    name: 'ทีมดูแลพื้นที่',
    short: 'Field team',
    description: 'เพิ่มผลประโยชน์ด้านชุมชนและธรรมชาติ',
    baseCost: 165,
    step: 90,
  },
}

export const CHAPTERS = [
  {
    id: 'first-roots',
    title: 'รากแรกของพื้นที่',
    goal: 'มีต้นไม้รอดอย่างน้อย 4 ต้น',
    ready: (m) => m.liveCount >= 4,
    reward: { coins: 120, biodiversity: 2, community: 2 },
  },
  {
    id: 'young-forest',
    title: 'ป่าเริ่มตั้งตัว',
    goal: 'มีต้นโตเต็มที่อย่างน้อย 4 ต้น',
    ready: (m) => m.matureCount >= 4,
    reward: { coins: 140, coastal: 4 },
  },
  {
    id: 'verified-impact',
    title: 'พิสูจน์ผลลัพธ์',
    goal: 'ออก Verified Carbon Credit สะสม 15 tCO₂e',
    ready: (m) => m.verified >= 15,
    reward: { coins: 180, community: 4 },
  },
  {
    id: 'living-coast',
    title: 'ชายฝั่งที่มีชีวิต',
    goal: 'Project Impact 50+ และมีไม้ครบ 3 ชนิด',
    ready: (m) => m.impactScore >= 50 && m.speciesCount >= 3,
    reward: { coins: 220, biodiversity: 5, coastal: 5 },
  },
]

export const TUTORIAL = [
  {
    icon: '🗺️',
    title: 'หมุนและสำรวจพื้นที่ 3D',
    text: 'ลากบนพื้นที่เพื่อหมุนมุมกล้อง ใช้ล้อเมาส์หรือ pinch เพื่อซูม แล้วคลิกเกาะดินแต่ละแปลงเพื่อจัดการ',
  },
  {
    icon: '🌱',
    title: 'เลือกพันธุ์แล้วปลูก',
    text: 'เลือกโกงกาง แสม หรือลำพูจากแถบด้านล่าง จากนั้นคลิกแปลงว่าง ความเหมาะสมขึ้นกับระดับน้ำและชนิดดิน',
  },
  {
    icon: '☀️',
    title: 'ให้เวลาระบบนิเวศเดิน',
    text: 'กดจบวันนี้ให้ต้นไม้เติบโต สุขภาพเปลี่ยน สะสม Estimated Carbon และอาจเกิดเหตุการณ์ชายฝั่ง',
  },
  {
    icon: '🚁',
    title: 'ตรวจ MRV ก่อนออกเครดิต',
    text: 'Estimated Carbon ยังขายไม่ได้ ต้องส่ง Drone + Field ตรวจ จึงกลายเป็น Verified Carbon Credit',
  },
  {
    icon: '🦀',
    title: 'ชนะด้วยสมดุลทั้งพื้นที่',
    text: 'ดูแล Biodiversity, Community และ Coastal resilience ควบคู่กับ Carbon เพื่อผ่าน Living Coast Standard',
  },
]

export function createInitialGame() {
  return {
    version: 3,
    day: 1,
    coins: 980,
    estimatedCarbon: 0,
    credits: 0,
    biodiversity: 8,
    community: 10,
    coastal: 6,
    marketPrice: 82,
    lastMarketPrice: 82,
    selectedSpecies: 'rhizophora',
    plots: BASE_PLOTS.map((plot) => ({ ...plot })),
    event: null,
    upgrades: { nursery: 0, drone: 0, community: 0 },
    claimedChapters: [],
    emergencyGrantUsed: false,
    completed: false,
    stats: {
      planted: 0,
      failed: 0,
      verified: 0,
      sold: 0,
      mrvRuns: 0,
      maintenance: 0,
    },
    log: [
      { day: 1, icon: '🗺️', text: 'ได้รับพื้นที่ชายฝั่งเสื่อมโทรม 16 แปลง เริ่มโครงการฟื้นฟูได้เลย' },
    ],
  }
}

export function normalizeGame(saved) {
  const base = createInitialGame()
  if (!saved || typeof saved !== 'object') return base

  const savedPlots = Array.isArray(saved.plots) && saved.plots.length === BASE_PLOTS.length
    ? saved.plots.map((plot, index) => ({ ...BASE_PLOTS[index], ...plot }))
    : base.plots

  return {
    ...base,
    ...saved,
    version: 3,
    selectedSpecies: SPECIES[saved.selectedSpecies] ? saved.selectedSpecies : 'rhizophora',
    plots: savedPlots,
    upgrades: {
      ...base.upgrades,
      ...(saved.upgrades || {}),
      nursery: saved.upgrades?.nursery ?? saved.nurseryLevel ?? 0,
    },
    claimedChapters: Array.isArray(saved.claimedChapters) ? saved.claimedChapters : [],
    stats: {
      ...base.stats,
      ...(saved.stats || {}),
      failed: saved.stats?.failed ?? saved.stats?.dead ?? 0,
    },
    log: Array.isArray(saved.log) && saved.log.length ? saved.log : base.log,
  }
}

export function loadGame() {
  try {
    const keys = [SAVE_KEY, ...LEGACY_SAVE_KEYS]
    const raw = keys.map((key) => localStorage.getItem(key)).find(Boolean)
    return raw ? normalizeGame(JSON.parse(raw)) : createInitialGame()
  } catch {
    return createInitialGame()
  }
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function suitability(plot, speciesKey) {
  const species = SPECIES[speciesKey]
  if (!species) return 0
  return Number(species.tides.includes(plot.tide)) + Number(species.soils.includes(plot.soil))
}

export function stageFor(plot) {
  if (plot.dead) return 'dead'
  if (!plot.species) return 'empty'
  if (plot.age < 2) return 'seedling'
  if (plot.age < 5) return 'young'
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

export function getMetrics(state) {
  const livePlots = state.plots.filter((plot) => plot.species && !plot.dead)
  const matureCount = livePlots.filter((plot) => plot.age >= 5).length
  const speciesCount = new Set(livePlots.map((plot) => plot.species)).size
  const survivalRate = state.stats.planted
    ? clamp(Math.round((livePlots.length / state.stats.planted) * 100))
    : 100
  const impactScore = clamp(Math.round(
    state.biodiversity * 0.38 + state.community * 0.34 + state.coastal * 0.28,
  ))
  const levelPoints = state.stats.planted + state.stats.verified / 5 + impactScore / 10
  const level = clamp(1 + Math.floor(levelPoints / 6), 1, 10)

  return {
    livePlots,
    liveCount: livePlots.length,
    matureCount,
    speciesCount,
    survivalRate,
    impactScore,
    level,
    verified: state.stats.verified,
  }
}

export function upgradeCost(key, level) {
  const upgrade = UPGRADES[key]
  return upgrade.baseCost + upgrade.step * level
}
