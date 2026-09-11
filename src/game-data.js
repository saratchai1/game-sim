import { freshJourney } from './coast-progression.js'
import { freshExpedition } from './restoration.js'

export const SPECIES = {
  rhizophora: {
    name: 'โกงกางใบใหญ่',
    short: 'โกงกาง',
    latin: 'Rhizophora mucronata',
    cost: 70,
    carbon: 1.65,
    biodiversity: 0.85,
    tides: ['กลาง'],
    soils: ['เลน', 'ตะกอน'],
    icon: 'R',
    tint: '#35a84f',
    description: 'คาร์บอนสูง รากค้ำยันเด่น เหมาะกับโซนน้ำกลาง',
  },
  avicennia: {
    name: 'แสมขาว',
    short: 'แสม',
    latin: 'Avicennia alba',
    cost: 54,
    carbon: 1.2,
    biodiversity: 1.15,
    tides: ['กลาง', 'สูง'],
    soils: ['ตะกอน', 'ดินเลน'],
    icon: 'A',
    tint: '#79bd59',
    description: 'ตั้งตัวไว ทนน้ำสูง และช่วยเพิ่มความหลากหลาย',
  },
  sonneratia: {
    name: 'ลำพู',
    short: 'ลำพู',
    latin: 'Sonneratia caseolaris',
    cost: 62,
    carbon: 1.35,
    biodiversity: 1.55,
    tides: ['ต่ำ', 'กลาง'],
    soils: ['เลน', 'ตะกอน'],
    icon: 'S',
    tint: '#45b77a',
    description: 'เรือนยอดกว้าง ให้แต้มระบบนิเวศสูงในพื้นที่ริมน้ำ',
  },
}

const PLOT_CONDITIONS = [
  ['ต่ำ', 'เลน'], ['ต่ำ', 'เลน'], ['ต่ำ', 'ตะกอน'], ['ต่ำ', 'ทราย'],
  ['กลาง', 'เลน'], ['กลาง', 'เลน'], ['กลาง', 'ตะกอน'], ['กลาง', 'ทราย'],
  ['กลาง', 'ตะกอน'], ['กลาง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ดินเลน'],
  ['สูง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ทราย'], ['สูง', 'ดินเลน'],
]

export const EVENTS = [
  {
    id: 'storm',
    icon: '☁',
    label: 'WEATHER EVENT',
    title: 'มรสุมกำลังเข้า',
    text: 'คลื่นแรงจะกระทบต้นกล้าและต้นอ่อนในพื้นที่ คุณจะรับมืออย่างไร?',
    choices: [
      { key: 'protect', label: 'เสริมแนวป้องกัน', hint: '120 เหรียญ · ลดความเสียหาย', cost: 120 },
      { key: 'risk', label: 'รับความเสี่ยง', hint: 'ฟรี · ต้นอ่อนเสียสุขภาพ', cost: 0 },
    ],
  },
  {
    id: 'trash',
    icon: '♻',
    label: 'COASTAL EVENT',
    title: 'ขยะทะเลพัดเข้าพื้นที่',
    text: 'ขยะติดตามแนวราก หากปล่อยไว้นานจะกระทบสัตว์น้ำและคุณภาพพื้นที่',
    choices: [
      { key: 'clean', label: 'จ้างชุมชนเก็บขยะ', hint: '80 เหรียญ · Nature + Community', cost: 80 },
      { key: 'leave', label: 'ไว้ก่อน', hint: 'ฟรี · Biodiversity ลดลง', cost: 0 },
    ],
  },
  {
    id: 'fishers',
    icon: '⚓',
    label: 'COMMUNITY EVENT',
    title: 'กลุ่มประมงเสนอความร่วมมือ',
    text: 'ชาวบ้านต้องการช่วยเฝ้าระวังพื้นที่ แลกกับกองทุนอุปกรณ์ประมงชุมชน',
    choices: [
      { key: 'partner', label: 'ตั้งทีมเฝ้าระวังร่วม', hint: '140 เหรียญ · Community +8', cost: 140 },
      { key: 'decline', label: 'ยังไม่ร่วมโครงการ', hint: 'รับรายได้ 70 · Community -2', cost: 0 },
    ],
  },
  {
    id: 'kingtide',
    icon: '≈',
    label: 'TIDE EVENT',
    title: 'น้ำทะเลหนุนสูงผิดปกติ',
    text: 'น้ำสูงกำลังทดสอบความแข็งแรงของพื้นที่ฟื้นฟู โดยเฉพาะต้นอายุน้อย',
    choices: [
      { key: 'reinforce', label: 'เสริมแนวธรรมชาติ', hint: '160 เหรียญ · Coastal +10', cost: 160 },
      { key: 'observe', label: 'ติดตามสถานการณ์', hint: 'ฟรี · สุขภาพต้นอ่อนลดลง', cost: 0 },
    ],
  },
  {
    id: 'wildlife',
    icon: '◇',
    label: 'BIODIVERSITY EVENT',
    title: 'พบสัตว์น้ำกลับเข้าพื้นที่',
    text: 'มีรายงานปู ปลา และนกชายเลนเพิ่มขึ้น ควรสำรวจอย่างเป็นระบบหรือไม่?',
    choices: [
      { key: 'survey', label: 'ทำ Biodiversity Survey', hint: '50 เหรียญ · Biodiversity +8', cost: 50 },
      { key: 'record', label: 'บันทึกเบื้องต้น', hint: 'ฟรี · Biodiversity +2', cost: 0 },
    ],
  },
  {
    id: 'grant',
    icon: '✦',
    label: 'PROJECT EVENT',
    title: 'ได้รับข้อเสนอทุนฟื้นฟูชายฝั่ง',
    text: 'ผู้สนับสนุนพร้อมเพิ่มงบ แต่ต้องแสดงประโยชน์ต่อชุมชนอย่างชัดเจน',
    choices: [
      { key: 'accept', label: 'รับทุนแบบมีส่วนร่วม', hint: '+240 เหรียญ · Community +4', cost: 0 },
      { key: 'independent', label: 'ดำเนินงานเอง', hint: 'Impact +2', cost: 0 },
    ],
  },
]

export const UPGRADE_INFO = {
  nursery: {
    name: 'เรือนเพาะชำ',
    icon: 'N',
    description: 'ลดต้นทุนต้นกล้า 7 เหรียญต่อระดับ',
    baseCost: 240,
  },
  mrv: {
    name: 'ศูนย์ Drone MRV',
    icon: 'D',
    description: 'ลดค่าตรวจและเพิ่มอัตราการออกเครดิต',
    baseCost: 285,
  },
  community: {
    name: 'ทีมชุมชน',
    icon: 'C',
    description: 'เพิ่ม Community และรายได้จากอาชีพท้องถิ่น',
    baseCost: 225,
  },
}

export const STORY_CHAPTERS = [
  {
    title: 'เริ่มฟื้นฟูชายฝั่ง',
    text: 'ปลูกต้นไม้ให้ครบ 4 ต้น',
    test: (game) => game.stats.planted >= 4,
    reward: 120,
  },
  {
    title: 'ระบบนิเวศเริ่มตั้งตัว',
    text: 'มีต้นโตเต็มที่อย่างน้อย 3 ต้น',
    test: (game, derived) => derived.matureCount >= 3,
    reward: 180,
  },
  {
    title: 'พิสูจน์ผลลัพธ์',
    text: 'ออก Verified Carbon สะสม 10 tCO₂e',
    test: (game) => game.stats.verified >= 10,
    reward: 240,
  },
  {
    title: 'Living Coast Standard',
    text: 'ทำข้อกำหนดปลายทางให้ครบทุกข้อ',
    test: (game, derived) => derived.victory,
    reward: 500,
  },
]

const createInitialPlots = () => PLOT_CONDITIONS.map(([tide, soil], index) => ({
  id: index + 1,
  tide,
  soil,
  species: null,
  age: 0,
  health: 100,
  dead: false,
}))

export const createInitialGame = () => ({
  version: 2,
  journey: freshJourney(),
  expedition: freshExpedition(),
  day: 1,
  coins: 960,
  gems: 12,
  estimatedCarbon: 0,
  credits: 0,
  biodiversity: 10,
  community: 12,
  coastal: 10,
  marketPrice: 86,
  activeSpecies: 'rhizophora',
  plots: createInitialPlots(),
  event: null,
  upgrades: { nursery: 0, mrv: 0, community: 0 },
  stats: { planted: 0, dead: 0, verified: 0, sold: 0 },
  claimedChapters: [],
  log: [
    { day: 1, type: 'info', text: 'ได้รับพื้นที่ชายฝั่ง 16 แปลง เลือกพันธุ์ด้านล่างแล้วคลิกพื้นที่ 3D เพื่อปลูก' },
  ],
})

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function suitability(plot, speciesKey) {
  const species = SPECIES[speciesKey]
  if (!species) return 0
  return Number(species.tides.includes(plot.tide)) + Number(species.soils.includes(plot.prepared ? 'ตะกอน' : plot.soil))
}

export function getPlantCost(game, speciesKey) {
  return Math.max(30, SPECIES[speciesKey].cost - game.upgrades.nursery * 7)
}

export function getMrvCost(game) {
  return Math.max(70, 155 - game.upgrades.mrv * 25)
}

