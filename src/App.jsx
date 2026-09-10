import { useEffect, useMemo, useState } from 'react'

const SAVE_KEY = 'mangrove-blue-carbon-save-v2'
const LEGACY_SAVE_KEY = 'mangrove-blue-carbon-save-v1'
const TUTORIAL_KEY = 'mangrove-blue-carbon-tutorial-seen'

const SPECIES = {
  rhizophora: {
    name: 'โกงกางใบใหญ่',
    short: 'โกงกาง',
    latin: 'Rhizophora mucronata',
    icon: '🌱',
    matureIcon: '🌳',
    cost: 65,
    carbon: 1.55,
    biodiversity: 1.0,
    tides: ['กลาง'],
    soils: ['เลน', 'ตะกอน'],
    note: 'คาร์บอนสูง เหมาะกับโซนน้ำกลางและพื้นเลน',
  },
  avicennia: {
    name: 'แสมขาว',
    short: 'แสม',
    latin: 'Avicennia alba',
    icon: '🌿',
    matureIcon: '🌲',
    cost: 50,
    carbon: 1.2,
    biodiversity: 1.2,
    tides: ['กลาง', 'สูง'],
    soils: ['ตะกอน', 'ดินเลน'],
    note: 'ตั้งตัวไว เหมาะกับโซนกลางถึงสูงและช่วยเพิ่มความหลากหลาย',
  },
  sonneratia: {
    name: 'ลำพู',
    short: 'ลำพู',
    latin: 'Sonneratia caseolaris',
    icon: '☘️',
    matureIcon: '🌴',
    cost: 58,
    carbon: 1.3,
    biodiversity: 1.55,
    tides: ['ต่ำ', 'กลาง'],
    soils: ['เลน', 'ตะกอน'],
    note: 'แต้มระบบนิเวศสูง เหมาะกับพื้นที่ริมน้ำและโซนน้ำต่ำ',
  },
}

const BASE_PLOTS = [
  ['ต่ำ', 'เลน'], ['ต่ำ', 'เลน'], ['ต่ำ', 'ตะกอน'], ['ต่ำ', 'ทราย'],
  ['กลาง', 'เลน'], ['กลาง', 'เลน'], ['กลาง', 'ตะกอน'], ['กลาง', 'ทราย'],
  ['กลาง', 'ตะกอน'], ['กลาง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ดินเลน'],
  ['สูง', 'ดินเลน'], ['สูง', 'ตะกอน'], ['สูง', 'ทราย'], ['สูง', 'ดินเลน'],
].map(([tide, soil], index) => ({
  id: index + 1,
  tide,
  soil,
  species: null,
  age: 0,
  health: 100,
  dead: false,
}))

const EVENTS = [
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
    text: 'ขยะสะสมตามแนวราก หากปล่อยไว้อาจกระทบสุขภาพระบบนิเวศ',
    icon: '🧹',
    choices: [
      { key: 'clean', label: 'จ้างชุมชนเก็บขยะ', hint: '-65 เหรียญ · Nature + Community', cost: 65 },
      { key: 'leave', label: 'ไว้ก่อน', hint: 'ฟรี · Biodiversity ลดลง', cost: 0 },
    ],
  },
  {
    id: 'nursery',
    eyebrow: 'COMMUNITY EVENT',
    title: 'ชุมชนเสนอทำเรือนเพาะชำ',
    text: 'ลงทุนร่วมกับชุมชนเพื่อให้ต้นกล้าในอนาคตมีต้นทุนลดลง',
    icon: '🏡',
    choices: [
      { key: 'invest', label: 'ร่วมลงทุน Nursery', hint: '-150 เหรียญ · Nursery ดีขึ้น', cost: 150 },
      { key: 'later', label: 'ไว้รอบหน้า', hint: 'ไม่มีผล', cost: 0 },
    ],
  },
  {
    id: 'wildlife',
    eyebrow: 'BIODIVERSITY EVENT',
    title: 'พบปูและปลากลับเข้าพื้นที่',
    text: 'การฟื้นฟูเริ่มสร้างที่อยู่อาศัย ระบบนิเวศตอบสนองเชิงบวก',
    icon: '🦀',
    choices: [
      { key: 'record', label: 'บันทึกการสำรวจ', hint: 'Biodiversity +6', cost: 0 },
    ],
  },
  {
    id: 'fishers',
    eyebrow: 'COMMUNITY EVENT',
    title: 'กลุ่มประมงพื้นบ้านขอร่วมวางแผน',
    text: 'ชาวบ้านเสนอเขตอนุรักษ์สัตว์น้ำวัยอ่อนรอบแปลงฟื้นฟู',
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

const UPGRADES = {
  nursery: {
    icon: '🏡',
    name: 'เรือนเพาะชำชุมชน',
    description: 'ลดค่าต้นกล้า 7 เหรียญต่อระดับ',
    baseCost: 150,
    step: 85,
  },
  drone: {
    icon: '🚁',
    name: 'ระบบ Drone MRV',
    description: 'ลดค่าตรวจและเพิ่มอัตราออกเครดิต',
    baseCost: 190,
    step: 105,
  },
  community: {
    icon: '🤝',
    name: 'ทีมดูแลพื้นที่',
    description: 'เพิ่มผลประโยชน์ด้านชุมชนและธรรมชาติ',
    baseCost: 165,
    step: 90,
  },
}

const CHAPTERS = [
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
    goal: 'Project Impact อย่างน้อย 50 และมีไม้ครบ 3 ชนิด',
    ready: (m) => m.impactScore >= 50 && m.speciesCount >= 3,
    reward: { coins: 220, biodiversity: 5, coastal: 5 },
  },
]

const TUTORIAL = [
  {
    icon: '🌱',
    title: 'ปลูกให้ถูกพื้นที่',
    text: 'เลือกพันธุ์ไม้ด้านล่างแล้วคลิกแปลงว่าง จุด ●● หมายถึงเหมาะกับระดับน้ำและดินมากที่สุด',
  },
  {
    icon: '☀️',
    title: 'ให้เวลาเดิน',
    text: 'กด “จบวันนี้” ให้ต้นไม้เติบโต สุขภาพและอัตรารอดขึ้นกับความเหมาะสมของแปลง',
  },
  {
    icon: '🚁',
    title: 'Carbon ต้องผ่าน MRV',
    text: 'Carbon ที่ต้นไม้สะสมยังเป็น Estimated Carbon ต้องส่ง Drone + Field ตรวจจึงกลายเป็น Verified Credit ที่ขายได้',
  },
  {
    icon: '🦀',
    title: 'ไม่ได้ชนะด้วย Carbon อย่างเดียว',
    text: 'รักษา Biodiversity, Community และ Coastal resilience ให้สมดุล แล้วฟื้นฟูชายฝั่งให้ผ่านเป้าหมายโครงการ',
  },
]

function createInitialGame() {
  return {
    version: 2,
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

function normalizeGame(saved) {
  const base = createInitialGame()
  if (!saved || typeof saved !== 'object') return base

  return {
    ...base,
    ...saved,
    version: 2,
    selectedSpecies: SPECIES[saved.selectedSpecies] ? saved.selectedSpecies : 'rhizophora',
    plots: Array.isArray(saved.plots) && saved.plots.length === BASE_PLOTS.length
      ? saved.plots.map((plot, index) => ({ ...BASE_PLOTS[index], ...plot }))
      : base.plots,
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

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY)
    return raw ? normalizeGame(JSON.parse(raw)) : createInitialGame()
  } catch {
    return createInitialGame()
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function suitability(plot, speciesKey) {
  const species = SPECIES[speciesKey]
  if (!species) return 0
  return Number(species.tides.includes(plot.tide)) + Number(species.soils.includes(plot.soil))
}

function stageFor(plot) {
  if (plot.dead) return 'dead'
  if (!plot.species) return 'empty'
  if (plot.age < 2) return 'seedling'
  if (plot.age < 5) return 'young'
  return 'mature'
}

function stageLabel(plot) {
  return {
    empty: 'ว่าง',
    seedling: 'ต้นกล้า',
    young: 'ต้นอ่อน',
    mature: 'โตเต็มที่',
    dead: 'ไม่รอด',
  }[stageFor(plot)]
}

function treeIcon(plot) {
  if (!plot.species) return '＋'
  if (plot.dead) return '🥀'
  const species = SPECIES[plot.species]
  return plot.age >= 5 ? species.matureIcon : species.icon
}

function getMetrics(state) {
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
  const level = clamp(1 + Math.floor(levelPoints / 6), 1, 5)

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

function upgradeCost(key, level) {
  const upgrade = UPGRADES[key]
  return upgrade.baseCost + upgrade.step * level
}

function App() {
  const [game, setGame] = useState(loadGame)
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [notice, setNotice] = useState('เลือกพันธุ์ไม้ แล้วคลิกแปลงว่างเพื่อปลูก')
  const [tutorialStep, setTutorialStep] = useState(() => (
    localStorage.getItem(TUTORIAL_KEY) ? -1 : 0
  ))
  const [showCompletion, setShowCompletion] = useState(false)

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game])

  const metrics = getMetrics(game)
  const selectedSpecies = SPECIES[game.selectedSpecies]
  const currentPlot = game.plots.find((plot) => plot.id === selectedPlot)
  const year = Math.floor((game.day - 1) / 20) + 1
  const tidePhase = ['น้ำลง', 'น้ำกำลังขึ้น', 'น้ำขึ้น', 'น้ำกำลังลง'][(game.day - 1) % 4]
  const marketTrend = game.marketPrice - game.lastMarketPrice
  const plantingCost = (species) => Math.max(28, species.cost - game.upgrades.nursery * 7)
  const mrvCost = Math.max(65, 120 - game.upgrades.drone * 18)
  const livelihoodIncome = game.community >= 30 ? Math.floor(game.community / 20) * 5 : 0

  const completionRequirements = useMemo(() => [
    { label: 'ต้นไม้รอด', value: metrics.liveCount, target: 12, unit: 'ต้น' },
    { label: 'ต้นโตเต็มที่', value: metrics.matureCount, target: 8, unit: 'ต้น' },
    { label: 'Verified carbon สะสม', value: metrics.verified, target: 25, unit: 'tCO₂e' },
    { label: 'Biodiversity', value: game.biodiversity, target: 45, unit: '' },
    { label: 'Community', value: game.community, target: 35, unit: '' },
    { label: 'Coastal resilience', value: game.coastal, target: 35, unit: '' },
    { label: 'Survival rate', value: metrics.survivalRate, target: 70, unit: '%' },
  ], [game.biodiversity, game.coastal, game.community, metrics.liveCount, metrics.matureCount, metrics.survivalRate, metrics.verified])

  const completionReady = completionRequirements.every((item) => item.value >= item.target)

  useEffect(() => {
    if (completionReady && !game.completed) {
      setGame((current) => ({ ...current, completed: true }))
      setShowCompletion(true)
    }
  }, [completionReady, game.completed])

  const achievements = [
    { icon: '🌱', label: 'ต้นแรก', done: game.stats.planted >= 1 },
    { icon: '🌳', label: 'เรือนยอด', done: metrics.matureCount >= 6 },
    { icon: '🦀', label: '3 Species', done: metrics.speciesCount >= 3 },
    { icon: '🚁', label: 'MRV x3', done: game.stats.mrvRuns >= 3 },
    { icon: '💠', label: 'Carbon 25', done: game.stats.verified >= 25 },
    { icon: '🏆', label: 'Living Coast', done: game.completed },
  ]

  const addLog = (state, icon, text) => ({
    ...state,
    log: [{ day: state.day, icon, text }, ...state.log].slice(0, 9),
  })

  const selectSpecies = (key) => {
    const species = SPECIES[key]
    setGame((current) => ({ ...current, selectedSpecies: key }))
    setNotice(`เลือก${species.name}แล้ว — คลิกแปลงว่างเพื่อปลูก`)
  }

  const plant = (plotId) => {
    if (game.event) {
      setNotice('จัดการเหตุการณ์ที่เกิดขึ้นก่อนปลูกเพิ่ม')
      return
    }

    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot || plot.species) return current
      const species = SPECIES[current.selectedSpecies]
      const cost = Math.max(28, species.cost - current.upgrades.nursery * 7)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ ลองทำภารกิจ ขาย Carbon Credit หรือใช้ทุนฉุกเฉิน')
        return current
      }
      const fit = suitability(plot, current.selectedSpecies)
      const health = fit === 2 ? 96 : fit === 1 ? 82 : 66
      let next = {
        ...current,
        coins: current.coins - cost,
        stats: { ...current.stats, planted: current.stats.planted + 1 },
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: current.selectedSpecies, age: 0, health, dead: false }
          : item),
      }
      next = addLog(next, '🌱', `ปลูก${species.short}ในแปลง ${plotId} (${plot.tide}/${plot.soil})`)
      setNotice(`${species.name} ลงแปลง ${plotId} แล้ว · ความเหมาะสม ${fit}/2`)
      return next
    })
  }

  const maintainPlot = (plotId) => {
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot?.species || plot.dead || plot.health >= 98) return current
      if (current.coins < 35) {
        setNotice('ต้องใช้ 35 เหรียญสำหรับดูแลแปลง')
        return current
      }
      const boosted = clamp(plot.health + 18)
      let next = {
        ...current,
        coins: current.coins - 35,
        community: clamp(current.community + 0.5),
        stats: { ...current.stats, maintenance: current.stats.maintenance + 1 },
        plots: current.plots.map((item) => item.id === plotId ? { ...item, health: boosted } : item),
      }
      next = addLog(next, '🧤', `ทีมภาคสนามดูแลแปลง ${plotId} สุขภาพเพิ่มเป็น ${Math.round(boosted)}%`)
      setNotice(`ดูแลแปลง ${plotId} แล้ว · สุขภาพ +18`)
      return next
    })
  }

  const clearPlot = (plotId) => {
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot?.dead) return current
      if (current.coins < 20) {
        setNotice('ต้องใช้ 20 เหรียญเพื่อเตรียมแปลงใหม่')
        return current
      }
      let next = {
        ...current,
        coins: current.coins - 20,
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: null, age: 0, health: 100, dead: false }
          : item),
      }
      next = addLog(next, '🧹', `เตรียมแปลง ${plotId} ใหม่หลังต้นเดิมไม่รอด`)
      setNotice(`แปลง ${plotId} พร้อมปลูกใหม่แล้ว`)
      return next
    })
  }

  const nextDay = () => {
    setGame((current) => {
      if (current.event) {
        setNotice('ต้องตัดสินใจเหตุการณ์ปัจจุบันก่อนจบวัน')
        return current
      }

      let carbonGain = 0
      let bioGain = 0
      let coastalGain = 0
      let newFailures = 0
      const teamMultiplier = 1 + current.upgrades.community * 0.1

      const plots = current.plots.map((plot) => {
        if (!plot.species || plot.dead) return plot
        const species = SPECIES[plot.species]
        const fit = suitability(plot, plot.species)
        const age = plot.age + 1
        const random = Math.floor(Math.random() * 5) - 2
        const healthDelta = fit === 2 ? 2 : fit === 1 ? -1 : -5
        const health = clamp(plot.health + healthDelta + random)
        const dead = health <= 5
        if (dead) newFailures += 1

        const stageFactor = age < 2 ? 0.3 : age < 5 ? 0.65 : 1
        if (!dead) {
          carbonGain += species.carbon * stageFactor * (health / 100)
          bioGain += species.biodiversity * stageFactor * 0.22 * teamMultiplier
          coastalGain += stageFactor * 0.09 * teamMultiplier
        }
        return { ...plot, age, health, dead }
      })

      const livingSpecies = new Set(plots.filter((plot) => plot.species && !plot.dead).map((plot) => plot.species)).size
      if (livingSpecies >= 3) bioGain += 0.8

      const nextDayNumber = current.day + 1
      const shouldTriggerEvent = nextDayNumber % 4 === 0
      const event = shouldTriggerEvent ? EVENTS[Math.floor(Math.random() * EVENTS.length)] : null
      const marketDelta = Math.floor(Math.random() * 11) - 5
      const passiveIncome = current.community >= 30 ? Math.floor(current.community / 20) * 5 : 0

      let next = {
        ...current,
        day: nextDayNumber,
        coins: current.coins + passiveIncome,
        plots,
        estimatedCarbon: current.estimatedCarbon + carbonGain,
        biodiversity: clamp(current.biodiversity + bioGain),
        coastal: clamp(current.coastal + coastalGain),
        lastMarketPrice: current.marketPrice,
        marketPrice: clamp(current.marketPrice + marketDelta, 62, 120),
        event,
        stats: { ...current.stats, failed: current.stats.failed + newFailures },
      }

      next = addLog(next, '☀️', `Day ${nextDayNumber} · สะสม Estimated Carbon +${carbonGain.toFixed(1)} tCO₂e${passiveIncome ? ` · รายได้ชุมชน +${passiveIncome}` : ''}`)
      if (newFailures > 0) next = addLog(next, '🥀', `มีต้นไม้ไม่รอด ${newFailures} ต้นจากสภาพพื้นที่`)
      if (event) next = addLog(next, event.icon, `เกิดเหตุการณ์: ${event.title}`)

      setNotice(event ? 'มีเหตุการณ์ใหม่ในพื้นที่ ต้องตัดสินใจก่อนเดินหน้าต่อ' : 'ผ่านไปอีก 1 วัน ระบบนิเวศกำลังเปลี่ยนแปลง')
      return next
    })
  }

  const verifyCarbon = () => {
    setGame((current) => {
      const cost = Math.max(65, 120 - current.upgrades.drone * 18)
      if (current.estimatedCarbon < 5) {
        setNotice('ต้องมี Estimated Carbon อย่างน้อย 5 tCO₂e ก่อนส่งตรวจ MRV')
        return current
      }
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญสำหรับ Drone + Field MRV`)
        return current
      }

      const verificationFactor = Math.min(0.98, 0.88 + current.upgrades.drone * 0.025 + Math.random() * 0.045)
      const issued = current.estimatedCarbon * verificationFactor
      let next = {
        ...current,
        coins: current.coins - cost,
        estimatedCarbon: 0,
        credits: current.credits + issued,
        community: clamp(current.community + 1.5 + current.upgrades.community * 0.5),
        stats: {
          ...current.stats,
          verified: current.stats.verified + issued,
          mrvRuns: current.stats.mrvRuns + 1,
        },
      }
      next = addLog(next, '🚁', `MRV รอบที่ ${next.stats.mrvRuns} ผ่าน · ออกเครดิต ${issued.toFixed(1)} tCO₂e`)
      setNotice(`Verified ${issued.toFixed(1)} tCO₂e — เครดิตพร้อมถือหรือขาย`)
      return next
    })
  }

  const sellCredit = (amount) => {
    setGame((current) => {
      const sellable = amount === 'all' ? Math.floor(current.credits) : Math.min(amount, Math.floor(current.credits))
      if (sellable <= 0) {
        setNotice('ยังไม่มี Verified Carbon Credit เพียงพอสำหรับขาย')
        return current
      }
      const revenue = sellable * current.marketPrice
      let next = {
        ...current,
        credits: current.credits - sellable,
        coins: current.coins + revenue,
        stats: { ...current.stats, sold: current.stats.sold + sellable },
      }
      next = addLog(next, '💠', `ขาย ${sellable} Carbon Credit ที่ ${current.marketPrice} เหรียญ ได้ ${revenue} เหรียญ`)
      setNotice(`ขายเครดิตแล้ว +${revenue} เหรียญ`)
      return next
    })
  }

  const upgrade = (key) => {
    setGame((current) => {
      const level = current.upgrades[key]
      if (level >= 3) {
        setNotice(`${UPGRADES[key].name} ถึงระดับสูงสุดแล้ว`)
        return current
      }
      const cost = upgradeCost(key, level)
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญเพื่ออัปเกรด ${UPGRADES[key].name}`)
        return current
      }

      const newLevel = level + 1
      let next = {
        ...current,
        coins: current.coins - cost,
        upgrades: { ...current.upgrades, [key]: newLevel },
      }
      if (key === 'community') {
        next.community = clamp(next.community + 4)
        next.biodiversity = clamp(next.biodiversity + 1.5)
      }
      next = addLog(next, UPGRADES[key].icon, `${UPGRADES[key].name} อัปเกรดเป็น Lv.${newLevel}`)
      setNotice(`${UPGRADES[key].name} Lv.${newLevel} พร้อมใช้งาน`)
      return next
    })
  }

  const claimChapter = (chapterId) => {
    setGame((current) => {
      const chapter = CHAPTERS.find((item) => item.id === chapterId)
      const currentMetrics = getMetrics(current)
      if (!chapter || current.claimedChapters.includes(chapterId) || !chapter.ready(currentMetrics)) return current

      const reward = chapter.reward
      let next = {
        ...current,
        coins: current.coins + (reward.coins || 0),
        biodiversity: clamp(current.biodiversity + (reward.biodiversity || 0)),
        community: clamp(current.community + (reward.community || 0)),
        coastal: clamp(current.coastal + (reward.coastal || 0)),
        claimedChapters: [...current.claimedChapters, chapterId],
      }
      next = addLog(next, '🎁', `รับรางวัลบท “${chapter.title}” +${reward.coins || 0} เหรียญ`)
      setNotice(`รับรางวัล ${chapter.title} แล้ว`)
      return next
    })
  }

  const resolveEvent = (choice) => {
    setGame((current) => {
      if (!current.event) return current
      const event = current.event
      const chosen = event.choices.find((item) => item.key === choice)
      if (!chosen || current.coins < chosen.cost) {
        setNotice('เหรียญไม่พอสำหรับตัวเลือกนี้')
        return current
      }

      let next = { ...current, coins: current.coins - chosen.cost, event: null }
      let logText = ''

      if (event.id === 'storm') {
        const damage = choice === 'protect' ? 4 : 17
        let eventFailures = 0
        next.plots = current.plots.map((plot) => {
          if (!plot.species || plot.dead || plot.age >= 5) return plot
          const health = clamp(plot.health - damage)
          const dead = health <= 5
          if (dead && !plot.dead) eventFailures += 1
          return { ...plot, health, dead }
        })
        next.stats = { ...current.stats, failed: current.stats.failed + eventFailures }
        if (choice === 'protect') next.coastal = clamp(current.coastal + 3)
        logText = choice === 'protect'
          ? 'เสริมแนวป้องกันก่อนมรสุม ต้นอ่อนได้รับผลกระทบน้อยลง'
          : 'รับมรสุมโดยไม่ป้องกัน ต้นอ่อนเสียสุขภาพอย่างมาก'
      }

      if (event.id === 'trash') {
        if (choice === 'clean') {
          next.biodiversity = clamp(current.biodiversity + 5)
          next.community = clamp(current.community + 4)
          logText = 'ชุมชนช่วยกันเก็บขยะ Biodiversity +5 และ Community +4'
        } else {
          next.biodiversity = clamp(current.biodiversity - 4)
          logText = 'ขยะยังอยู่ในพื้นที่ Biodiversity -4'
        }
      }

      if (event.id === 'nursery') {
        if (choice === 'invest') {
          if (current.upgrades.nursery < 3) {
            next.upgrades = { ...current.upgrades, nursery: current.upgrades.nursery + 1 }
            next.community = clamp(current.community + 5)
            logText = `Nursery อัปเกรดเป็น Lv.${next.upgrades.nursery} และ Community +5`
          } else {
            next.community = clamp(current.community + 6)
            logText = 'Nursery เต็มระดับแล้ว เงินรอบนี้ใช้ฝึกคนในชุมชน Community +6'
          }
        } else {
          logText = 'ยังไม่ลงทุน Nursery ในรอบนี้'
        }
      }

      if (event.id === 'wildlife') {
        next.biodiversity = clamp(current.biodiversity + 6)
        logText = 'บันทึกการกลับมาของสัตว์น้ำ Biodiversity +6'
      }

      if (event.id === 'fishers') {
        if (choice === 'partner') {
          next.community = clamp(current.community + 8)
          next.biodiversity = clamp(current.biodiversity + 2)
          logText = 'ทำข้อตกลงกับกลุ่มประมง Community +8 และ Biodiversity +2'
        } else {
          next.community = clamp(current.community - 2)
          logText = 'ยังไม่ร่วมมือกับกลุ่มประมง Community -2'
        }
      }

      if (event.id === 'erosion') {
        if (choice === 'barrier') {
          next.coastal = clamp(current.coastal + 9)
          next.community = clamp(current.community + 1)
          logText = 'ทำแนวลดแรงคลื่น Coastal resilience +9'
        } else {
          next.coastal = clamp(current.coastal - 5)
          logText = 'การกัดเซาะดำเนินต่อ Coastal resilience -5'
        }
      }

      setNotice(logText)
      return addLog(next, event.icon, logText)
    })
  }

  const claimEmergencyGrant = () => {
    setGame((current) => {
      if (current.emergencyGrantUsed) return current
      let next = {
        ...current,
        coins: current.coins + 220,
        community: clamp(current.community - 2),
        emergencyGrantUsed: true,
      }
      next = addLog(next, '🛟', 'รับทุนฟื้นฟูฉุกเฉิน +220 เหรียญ เพื่อป้องกันโครงการติดทางตัน')
      setNotice('ได้รับทุนฉุกเฉิน 220 เหรียญ ใช้ให้คุ้มกับรอบฟื้นฟูถัดไป')
      return next
    })
  }

  const finishTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setTutorialStep(-1)
  }

  const resetGame = () => {
    setGame(createInitialGame())
    setSelectedPlot(null)
    setShowCompletion(false)
    setNotice('เริ่มโครงการใหม่แล้ว')
  }

  const projectGrade = metrics.impactScore >= 70 && metrics.survivalRate >= 85
    ? 'A'
    : metrics.impactScore >= 55 && metrics.survivalRate >= 75
      ? 'B'
      : 'C'

  const needsEmergencyGrant = !game.emergencyGrantUsed
    && game.coins < 55
    && game.credits < 1
    && metrics.liveCount < 2

  return (
    <div className="app complete-game">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MANGROVE BAY</strong>
            <span>BLUE CARBON RESTORATION</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="mini-stat"><span>🪙</span><b>{Math.round(game.coins)}</b></div>
          <div className="mini-stat carbon"><span>💠</span><b>{game.credits.toFixed(1)}</b><small>credits</small></div>
          <div className="level-pill"><span>LV</span><b>{metrics.level}</b></div>
          <button className="ghost-button" onClick={() => setTutorialStep(0)}>วิธีเล่น</button>
          <button className="ghost-button" onClick={resetGame}>เริ่มใหม่</button>
        </div>
      </header>

      <div className="campaign-strip">
        <div>
          <span>เป้าหมายหลัก</span>
          <b>ฟื้นฟูชายฝั่งให้ผ่าน Living Coast Standard</b>
        </div>
        <div className="campaign-progress">
          <span style={{ width: `${completionRequirements.filter((item) => item.value >= item.target).length / completionRequirements.length * 100}%` }} />
        </div>
        <strong>{completionRequirements.filter((item) => item.value >= item.target).length}/{completionRequirements.length}</strong>
      </div>

      <main className="game-layout">
        <section className="main-column">
          <div className="scene-header">
            <div>
              <p className="eyebrow">RESTORATION SITE · YEAR {year}</p>
              <h1>ฟื้นคืนผืนป่าชายเลน</h1>
              <p className="scene-subtitle">Day {game.day} · {tidePhase} · เลือกพันธุ์ให้เหมาะกับน้ำและดิน</p>
            </div>
            <div className="day-actions">
              {livelihoodIncome > 0 && <span className="income-note">ชุมชนสร้างรายได้ +{livelihoodIncome}/วัน</span>}
              <button className="next-day" onClick={nextDay} disabled={Boolean(game.event)}>
                จบวันนี้ <span>→</span>
              </button>
            </div>
          </div>

          <div className="notice-bar"><span>●</span>{notice}</div>

          <div className="world-card">
            <div className="waterline">
              <div className="sun">☀</div>
              <div className="horizon-copy">Mangrove Bay · Coastal Wetland</div>
              <div className="wildlife wildlife-a">{game.biodiversity >= 20 ? '🦀' : ''}</div>
              <div className="wildlife wildlife-b">{game.biodiversity >= 35 ? '🐟' : ''}</div>
              <div className="wildlife wildlife-c">{game.biodiversity >= 50 ? '🦆' : ''}</div>
              <div className="wave wave-a">～～～～～～～～～～～～～～</div>
              <div className="wave wave-b">～～～～～～～～～～～～～～</div>
            </div>

            <div className="site-status-row">
              <span>🌱 รอด {metrics.liveCount}/16</span>
              <span>🌳 โตเต็มที่ {metrics.matureCount}</span>
              <span>🧬 Species {metrics.speciesCount}/3</span>
              <span>❤️ Survival {metrics.survivalRate}%</span>
            </div>

            <div className="plot-grid">
              {game.plots.map((plot) => {
                const empty = !plot.species
                const fit = empty ? suitability(plot, game.selectedSpecies) : suitability(plot, plot.species)
                const stage = stageFor(plot)
                const cost = plantingCost(selectedSpecies)
                return (
                  <button
                    key={plot.id}
                    className={`plot plot-${stage} ${selectedPlot === plot.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPlot(plot.id)
                      if (empty) plant(plot.id)
                    }}
                    aria-label={`แปลง ${plot.id} ${stageLabel(plot)}`}
                  >
                    <div className="plot-meta">
                      <span>#{String(plot.id).padStart(2, '0')}</span>
                      <span className={`fit fit-${fit}`}>{'●'.repeat(fit)}{'○'.repeat(2 - fit)}</span>
                    </div>
                    <div className="tree-visual">{treeIcon(plot)}</div>
                    {empty ? (
                      <>
                        <b className="empty-label">ปลูก {selectedSpecies.short}</b>
                        <small>{cost} 🪙 · {plot.tide}/{plot.soil}</small>
                      </>
                    ) : (
                      <>
                        <b>{SPECIES[plot.species].short}</b>
                        <small>{stageLabel(plot)} · {plot.age} วัน</small>
                        <div className="health-track"><span style={{ width: `${plot.health}%` }} /></div>
                        <small className="health-label">สุขภาพ {Math.round(plot.health)}%</small>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="shore-labels">
              <span>← โซนน้ำต่ำ</span><span>โซนน้ำกลาง</span><span>โซนน้ำสูง →</span>
            </div>
          </div>

          <section className="species-panel">
            <div className="section-heading">
              <div><p className="eyebrow">COMMUNITY NURSERY · LV.{game.upgrades.nursery}</p><h2>เลือกพันธุ์ไม้</h2></div>
              <span className="legend">●● เหมาะมาก &nbsp; ●○ พอใช้ &nbsp; ○○ เสี่ยง</span>
            </div>
            <div className="species-list">
              {Object.entries(SPECIES).map(([key, species]) => (
                <button
                  key={key}
                  className={`species-card ${game.selectedSpecies === key ? 'active' : ''}`}
                  onClick={() => selectSpecies(key)}
                >
                  <span className="species-icon">{species.matureIcon}</span>
                  <span className="species-copy">
                    <b>{species.name}</b>
                    <i>{species.latin}</i>
                    <small>{species.note}</small>
                  </span>
                  <span className="species-cost">{plantingCost(species)}<small>🪙 / ต้น</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className="upgrade-section">
            <div className="section-heading">
              <div><p className="eyebrow">PROJECT UPGRADES</p><h2>พัฒนาโครงการ</h2></div>
              <span className="legend">อัปเกรดได้สูงสุด Lv.3</span>
            </div>
            <div className="upgrade-grid">
              {Object.entries(UPGRADES).map(([key, item]) => {
                const level = game.upgrades[key]
                const cost = upgradeCost(key, level)
                return (
                  <article className="upgrade-card" key={key}>
                    <div className="upgrade-icon">{item.icon}</div>
                    <div className="upgrade-copy">
                      <span>LV.{level}/3</span>
                      <b>{item.name}</b>
                      <small>{item.description}</small>
                    </div>
                    <button onClick={() => upgrade(key)} disabled={level >= 3}>
                      {level >= 3 ? 'MAX' : `${cost} 🪙`}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="achievement-section">
            <div className="section-heading compact">
              <div><p className="eyebrow">COLLECTION</p><h2>ตราความสำเร็จ</h2></div>
            </div>
            <div className="achievement-grid">
              {achievements.map((item) => (
                <div className={`achievement ${item.done ? 'done' : ''}`} key={item.label}>
                  <span>{item.icon}</span><b>{item.label}</b>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="sidebar">
          <section className="impact-card">
            <div className="impact-score">
              <div>
                <p className="eyebrow">PROJECT IMPACT</p>
                <strong>{metrics.impactScore}</strong><span>/100</span>
              </div>
              <div className="impact-badge">{metrics.impactScore >= 70 ? 'THRIVING' : metrics.impactScore >= 40 ? 'GROWING' : 'RESTORING'}</div>
            </div>
            <Metric icon="🦋" label="Biodiversity" value={game.biodiversity} />
            <Metric icon="🤝" label="Community" value={game.community} />
            <Metric icon="🌊" label="Coastal resilience" value={game.coastal} />
            <div className="survival-row"><span>Survival rate</span><b>{metrics.survivalRate}%</b></div>
          </section>

          <section className="panel mrv-panel">
            <div className="section-heading compact">
              <div><p className="eyebrow">CARBON PIPELINE</p><h2>MRV</h2></div>
              <span className="satellite">🚁</span>
            </div>
            <div className="carbon-number">
              <span>Estimated</span><strong>{game.estimatedCarbon.toFixed(1)}</strong><small>tCO₂e</small>
            </div>
            <div className="flow-line"><span className="done">ปลูก</span><i>→</i><span>ติดตาม</span><i>→</i><span>Verify</span><i>→</i><span>Credit</span></div>
            <button className="primary-button" onClick={verifyCarbon}>ส่ง Drone + Field ตรวจ MRV <span>{mrvCost} 🪙</span></button>
            <div className="mrv-meta"><span>Drone Lv.{game.upgrades.drone}</span><span>ตรวจแล้ว {game.stats.mrvRuns} รอบ</span></div>
            <p className="fine-print">ค่าคาร์บอนและ Verification เป็นค่าจำลองเพื่อ gameplay ไม่ใช่การคำนวณเครดิตจริง</p>
          </section>

          <section className="panel market-panel">
            <div className="market-head">
              <div><p className="eyebrow">CARBON MARKET</p><h2>ตลาดเครดิต</h2></div>
              <b>{game.marketPrice} 🪙 <span className={marketTrend >= 0 ? 'trend-up' : 'trend-down'}>{marketTrend >= 0 ? '▲' : '▼'}{Math.abs(marketTrend)}</span></b>
            </div>
            <div className="market-row"><span>เครดิตที่ถือ</span><strong>{game.credits.toFixed(1)} tCO₂e</strong></div>
            <div className="market-actions">
              <button className="secondary-button" onClick={() => sellCredit(1)}>ขาย 1</button>
              <button className="secondary-button" onClick={() => sellCredit('all')}>ขายทั้งหมด</button>
            </div>
          </section>

          <section className="panel mission-panel">
            <p className="eyebrow">RESTORATION STORY</p>
            <h2>บทของโครงการ</h2>
            <div className="chapter-list">
              {CHAPTERS.map((chapter) => {
                const ready = chapter.ready(metrics)
                const claimed = game.claimedChapters.includes(chapter.id)
                return (
                  <div className={`chapter-card ${claimed ? 'claimed' : ready ? 'ready' : ''}`} key={chapter.id}>
                    <div><b>{claimed ? '✓' : ready ? '!' : '○'} {chapter.title}</b><small>{chapter.goal}</small></div>
                    {ready && !claimed && <button onClick={() => claimChapter(chapter.id)}>รับรางวัล</button>}
                    {claimed && <span>รับแล้ว</span>}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel goal-panel">
            <p className="eyebrow">LIVING COAST STANDARD</p>
            <h2>เงื่อนไขจบเกม</h2>
            <div className="goal-list">
              {completionRequirements.map((item) => {
                const done = item.value >= item.target
                return (
                  <div className={done ? 'goal-done' : ''} key={item.label}>
                    <span>{done ? '✓' : '○'} {item.label}</span>
                    <b>{typeof item.value === 'number' && !Number.isInteger(item.value) ? item.value.toFixed(1) : Math.round(item.value)}/{item.target}{item.unit}</b>
                  </div>
                )
              })}
            </div>
          </section>

          {needsEmergencyGrant && (
            <section className="panel rescue-panel">
              <p className="eyebrow">PROJECT RECOVERY</p>
              <h2>โครงการใกล้ติดทางตัน</h2>
              <p>รับทุนฉุกเฉินได้หนึ่งครั้ง เพื่อให้ยังมีทางกลับมาฟื้นฟูต่อ</p>
              <button className="primary-button" onClick={claimEmergencyGrant}>รับทุน +220 🪙</button>
            </section>
          )}

          {currentPlot?.species && (
            <section className="panel selected-panel">
              <p className="eyebrow">SELECTED PLOT #{String(currentPlot.id).padStart(2, '0')}</p>
              <h2>{SPECIES[currentPlot.species].name}</h2>
              <div className="detail-grid">
                <span>น้ำ <b>{currentPlot.tide}</b></span>
                <span>ดิน <b>{currentPlot.soil}</b></span>
                <span>อายุ <b>{currentPlot.age} วัน</b></span>
                <span>Fit <b>{suitability(currentPlot, currentPlot.species)}/2</b></span>
                <span>สุขภาพ <b>{Math.round(currentPlot.health)}%</b></span>
                <span>สถานะ <b>{stageLabel(currentPlot)}</b></span>
              </div>
              {!currentPlot.dead && currentPlot.health < 98 && (
                <button className="secondary-button plot-action" onClick={() => maintainPlot(currentPlot.id)}>ดูแลแปลง · 35 🪙</button>
              )}
              {currentPlot.dead && (
                <button className="secondary-button plot-action danger" onClick={() => clearPlot(currentPlot.id)}>เตรียมปลูกใหม่ · 20 🪙</button>
              )}
            </section>
          )}

          <section className="panel log-panel">
            <p className="eyebrow">FIELD LOG</p>
            <h2>บันทึกล่าสุด</h2>
            <div className="log-list">
              {game.log.map((item, index) => (
                <div className="log-item" key={`${item.day}-${index}-${item.text}`}>
                  <span>{item.icon}</span><p>{item.text}<small>DAY {item.day}</small></p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="game-footer">
        <span>Auto-save ใน browser</span>
        <span>Simulation values are for gameplay only</span>
        <span>Plant → Grow → Monitor → Verify → Create Impact</span>
      </footer>

      {game.event && (
        <div className="event-backdrop">
          <div className="event-modal">
            <span className="event-icon">{game.event.icon}</span>
            <p className="eyebrow">{game.event.eyebrow}</p>
            <h2>{game.event.title}</h2>
            <p>{game.event.text}</p>
            <div className="event-choices">
              {game.event.choices.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => resolveEvent(choice.key)}
                  disabled={game.coins < choice.cost}
                >
                  <b>{choice.label}</b><span>{choice.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tutorialStep >= 0 && (
        <div className="tutorial-backdrop">
          <div className="tutorial-modal">
            <div className="tutorial-progress">
              {TUTORIAL.map((_, index) => <span className={index <= tutorialStep ? 'active' : ''} key={index} />)}
            </div>
            <div className="tutorial-hero">{TUTORIAL[tutorialStep].icon}</div>
            <p className="eyebrow">HOW TO PLAY · {tutorialStep + 1}/{TUTORIAL.length}</p>
            <h2>{TUTORIAL[tutorialStep].title}</h2>
            <p>{TUTORIAL[tutorialStep].text}</p>
            <div className="tutorial-actions">
              <button className="tutorial-skip" onClick={finishTutorial}>ข้าม</button>
              {tutorialStep < TUTORIAL.length - 1 ? (
                <button className="tutorial-next" onClick={() => setTutorialStep((step) => step + 1)}>ถัดไป →</button>
              ) : (
                <button className="tutorial-next" onClick={finishTutorial}>เริ่มเล่น</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="completion-backdrop">
          <div className="completion-modal">
            <div className="completion-crown">🏆</div>
            <p className="eyebrow">LIVING COAST RESTORED</p>
            <h2>โครงการฟื้นฟูสำเร็จ</h2>
            <p>ชายฝั่งมีทั้ง Carbon Value และ Non-carbon Benefit ผ่านเงื่อนไขหลักครบแล้ว</p>
            <div className="grade-ring"><span>PROJECT GRADE</span><b>{projectGrade}</b></div>
            <div className="completion-stats">
              <span><b>{metrics.verified.toFixed(1)}</b>tCO₂e verified</span>
              <span><b>{metrics.survivalRate}%</b>survival</span>
              <span><b>{metrics.impactScore}</b>impact</span>
              <span><b>Day {game.day}</b>completed</span>
            </div>
            <div className="completion-actions">
              <button onClick={() => setShowCompletion(false)}>เล่นต่อแบบ Sandbox</button>
              <button className="primary-finish" onClick={resetGame}>เริ่มโครงการใหม่</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ icon, label, value }) {
  const safe = clamp(value)
  return (
    <div className="metric">
      <div><span>{icon}</span><b>{label}</b><strong>{Math.round(value)}</strong></div>
      <div className="metric-track"><span style={{ width: `${safe}%` }} /></div>
    </div>
  )
}

export default App
