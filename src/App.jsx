import { useEffect, useMemo, useState } from 'react'
import MangroveWorld3D from './MangroveWorld3D.jsx'

const SAVE_KEY = 'mangrove-bay-3d-save-v2'

const SPECIES = {
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

const EVENTS = [
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

const UPGRADE_INFO = {
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

const STORY_CHAPTERS = [
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

const createInitialGame = () => ({
  version: 2,
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

function safeLoad() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createInitialGame()
    const parsed = JSON.parse(raw)
    if (parsed.version !== 2 || !Array.isArray(parsed.plots)) return createInitialGame()
    return parsed
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

function getPlantCost(game, speciesKey) {
  return Math.max(30, SPECIES[speciesKey].cost - game.upgrades.nursery * 7)
}

function getMrvCost(game) {
  return Math.max(70, 155 - game.upgrades.mrv * 25)
}

function appendLog(game, text, type = 'info') {
  return {
    ...game,
    log: [{ day: game.day, type, text }, ...game.log].slice(0, 8),
  }
}

function App() {
  const [game, setGame] = useState(safeLoad)
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [notice, setNotice] = useState('เลือกพันธุ์ไม้ด้านล่าง แล้วคลิกแปลงว่างในฉาก 3D')
  const [showHelp, setShowHelp] = useState(() => !localStorage.getItem('mangrove-bay-3d-help-seen'))
  const [showUpgrades, setShowUpgrades] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [sandbox, setSandbox] = useState(false)

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game])

  const derived = useMemo(() => {
    const planted = game.plots.filter((plot) => plot.species)
    const living = planted.filter((plot) => !plot.dead)
    const matureCount = living.filter((plot) => plot.age >= 6).length
    const survivalRate = game.stats.planted
      ? Math.round(((game.stats.planted - game.stats.dead) / game.stats.planted) * 100)
      : 100
    const impact = clamp(Math.round(
      game.biodiversity * 0.36 + game.community * 0.32 + game.coastal * 0.32,
    ))
    const victoryChecks = {
      living: living.length >= 12,
      mature: matureCount >= 8,
      carbon: game.stats.verified >= 25,
      biodiversity: game.biodiversity >= 45,
      community: game.community >= 35,
      coastal: game.coastal >= 35,
      survival: survivalRate >= 70,
    }
    const victory = Object.values(victoryChecks).every(Boolean)
    return {
      planted,
      living,
      matureCount,
      survivalRate,
      impact,
      victoryChecks,
      victory,
    }
  }, [game])

  const selected = game.plots.find((plot) => plot.id === selectedPlot) || null
  const year = Math.floor((game.day - 1) / 20) + 1
  const mrvCost = getMrvCost(game)
  const completedChapterIndex = STORY_CHAPTERS.findIndex((chapter, index) => (
    !game.claimedChapters.includes(index) && chapter.test(game, derived)
  ))

  useEffect(() => {
    if (completedChapterIndex < 0) return
    const chapter = STORY_CHAPTERS[completedChapterIndex]
    setGame((current) => {
      if (current.claimedChapters.includes(completedChapterIndex)) return current
      const rewarded = {
        ...current,
        coins: current.coins + chapter.reward,
        claimedChapters: [...current.claimedChapters, completedChapterIndex],
      }
      return appendLog(rewarded, `ผ่านบท “${chapter.title}” ได้รับ ${chapter.reward} เหรียญ`, 'reward')
    })
    setNotice(`ผ่านบทใหม่: ${chapter.title} · +${chapter.reward} เหรียญ`)
  }, [completedChapterIndex])

  const selectSpecies = (key) => {
    setGame((current) => ({ ...current, activeSpecies: key }))
    setNotice(`เลือก${SPECIES[key].name}แล้ว · คลิกแปลงว่างในฉากเพื่อปลูก`)
  }

  const plant = (plotId) => {
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot || plot.species) return current
      const speciesKey = current.activeSpecies
      const species = SPECIES[speciesKey]
      const cost = getPlantCost(current, speciesKey)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ ออกเครดิตหรือขายเครดิตเพื่อเพิ่มงบโครงการ')
        return current
      }
      const fit = suitability(plot, speciesKey)
      const health = fit === 2 ? 96 : fit === 1 ? 83 : 67
      let next = {
        ...current,
        coins: current.coins - cost,
        biodiversity: clamp(current.biodiversity + species.biodiversity * 0.35),
        community: clamp(current.community + 0.25 + current.upgrades.community * 0.2),
        stats: { ...current.stats, planted: current.stats.planted + 1 },
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: speciesKey, age: 0, health, dead: false }
          : item),
      }
      next = appendLog(next, `ปลูก${species.short}ในแปลง ${plotId} · ความเหมาะสม ${fit}/2`, 'plant')
      setNotice(`${species.name}ถูกปลูกในแปลง ${plotId} · Fit ${fit}/2`)
      return next
    })
    setSelectedPlot(plotId)
  }

  const handlePlotClick = (plotId) => {
    const plot = game.plots.find((item) => item.id === plotId)
    setSelectedPlot(plotId)
    if (plot && !plot.species) plant(plotId)
    else if (plot?.dead) setNotice(`แปลง ${plotId} ต้องเคลียร์พื้นที่ก่อนปลูกใหม่`)
    else if (plot) setNotice(`เลือกแปลง ${plotId} · ${SPECIES[plot.species].name}`)
  }

  const maintainSelected = () => {
    if (!selected?.species || selected.dead) return
    setGame((current) => {
      if (current.coins < 38) {
        setNotice('ต้องใช้ 38 เหรียญสำหรับบำรุงรักษาแปลง')
        return current
      }
      const next = {
        ...current,
        coins: current.coins - 38,
        community: clamp(current.community + 0.8 + current.upgrades.community * 0.25),
        plots: current.plots.map((plot) => plot.id === selected.id
          ? { ...plot, health: clamp(plot.health + 20) }
          : plot),
      }
      setNotice(`บำรุงแปลง ${selected.id} แล้ว · สุขภาพ +20`)
      return appendLog(next, `ทีมภาคสนามบำรุงแปลง ${selected.id}`, 'care')
    })
  }

  const clearSelected = () => {
    if (!selected?.dead) return
    setGame((current) => {
      if (current.coins < 28) {
        setNotice('ต้องใช้ 28 เหรียญเพื่อเตรียมพื้นที่ใหม่')
        return current
      }
      const next = {
        ...current,
        coins: current.coins - 28,
        plots: current.plots.map((plot) => plot.id === selected.id
          ? { ...plot, species: null, age: 0, health: 100, dead: false }
          : plot),
      }
      setNotice(`เคลียร์แปลง ${selected.id} แล้ว · เลือกพันธุ์เพื่อปลูกใหม่`)
      return appendLog(next, `เตรียมแปลง ${selected.id} สำหรับปลูกซ่อม`, 'care')
    })
  }

  const nextDay = () => {
    if (game.event) {
      setNotice('ต้องตัดสินใจเหตุการณ์ปัจจุบันก่อนจบวัน')
      return
    }

    setGame((current) => {
      let carbonGain = 0
      let biodiversityGain = 0
      let coastalGain = 0
      let deaths = 0
      const communityBoost = 1 + current.upgrades.community * 0.08

      const plots = current.plots.map((plot) => {
        if (!plot.species || plot.dead) return plot
        const species = SPECIES[plot.species]
        const fit = suitability(plot, plot.species)
        const age = plot.age + 1
        const random = Math.floor(Math.random() * 5) - 2
        const healthDelta = fit === 2 ? 2 : fit === 1 ? -1 : -5
        const health = clamp(plot.health + healthDelta + random)
        const dead = health <= 5
        if (dead) deaths += 1

        const growthFactor = age < 2 ? 0.24 : age < 6 ? 0.62 : 1
        if (!dead) {
          carbonGain += species.carbon * growthFactor * (health / 100)
          biodiversityGain += species.biodiversity * growthFactor * 0.18
          coastalGain += growthFactor * (plot.species === 'rhizophora' ? 0.16 : 0.1)
        }
        return { ...plot, age, health, dead }
      })

      const nextDayNumber = current.day + 1
      const communityIncome = current.community >= 32
        ? 10 + current.upgrades.community * 8
        : 0
      const marketDelta = Math.floor(Math.random() * 11) - 5
      const shouldEvent = nextDayNumber % 5 === 0
      const event = shouldEvent
        ? EVENTS[Math.floor(Math.random() * EVENTS.length)]
        : null

      let next = {
        ...current,
        day: nextDayNumber,
        coins: current.coins + communityIncome,
        plots,
        estimatedCarbon: current.estimatedCarbon + carbonGain,
        biodiversity: clamp(current.biodiversity + biodiversityGain),
        community: clamp(current.community + (current.upgrades.community ? 0.14 * communityBoost : 0)),
        coastal: clamp(current.coastal + coastalGain),
        marketPrice: clamp(current.marketPrice + marketDelta, 58, 128),
        event,
        stats: { ...current.stats, dead: current.stats.dead + deaths },
      }
      next = appendLog(next, `Day ${nextDayNumber}: สะสมคาร์บอนประมาณ +${carbonGain.toFixed(1)} tCO₂e`, 'day')
      if (communityIncome) next = appendLog(next, `ชุมชนสร้างรายได้กลับเข้าโครงการ +${communityIncome} เหรียญ`, 'reward')
      if (deaths) next = appendLog(next, `มีต้นไม้ไม่รอด ${deaths} ต้น ตรวจ Fit และสุขภาพแปลง`, 'warning')
      setNotice(event ? 'มีเหตุการณ์ใหม่เกิดขึ้นในพื้นที่' : `เข้าสู่ Day ${nextDayNumber} · Carbon +${carbonGain.toFixed(1)}`)
      return next
    })
  }

  const verifyCarbon = () => {
    setGame((current) => {
      const cost = getMrvCost(current)
      if (current.estimatedCarbon < 5) {
        setNotice('ต้องมี Estimated Carbon อย่างน้อย 5 tCO₂e ก่อนส่งตรวจ')
        return current
      }
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญสำหรับ Drone + Field MRV`)
        return current
      }
      const baseFactor = 0.84 + current.upgrades.mrv * 0.025
      const factor = Math.min(0.97, baseFactor + Math.random() * 0.055)
      const issued = current.estimatedCarbon * factor
      let next = {
        ...current,
        coins: current.coins - cost,
        estimatedCarbon: 0,
        credits: current.credits + issued,
        community: clamp(current.community + 1.2),
        stats: { ...current.stats, verified: current.stats.verified + issued },
      }
      next = appendLog(next, `MRV ผ่าน ออกเครดิต ${issued.toFixed(1)} tCO₂e`, 'carbon')
      setNotice(`Verified ${issued.toFixed(1)} tCO₂e · พร้อมถือหรือขายเครดิต`)
      return next
    })
  }

  const sellCredits = (requested) => {
    setGame((current) => {
      const amount = requested === 'all'
        ? Math.floor(current.credits * 10) / 10
        : Math.min(requested, Math.floor(current.credits))
      if (!amount || amount <= 0) {
        setNotice('ยังไม่มี Verified Carbon Credit เพียงพอสำหรับขาย')
        return current
      }
      const revenue = Math.round(amount * current.marketPrice)
      const next = {
        ...current,
        coins: current.coins + revenue,
        credits: Math.max(0, current.credits - amount),
        stats: { ...current.stats, sold: current.stats.sold + amount },
      }
      setNotice(`ขาย ${amount.toFixed(1)} เครดิต ได้ ${revenue} เหรียญ`)
      return appendLog(next, `ขาย Carbon Credit ${amount.toFixed(1)} tCO₂e`, 'carbon')
    })
  }

  const buyUpgrade = (key) => {
    setGame((current) => {
      const level = current.upgrades[key]
      if (level >= 3) {
        setNotice(`${UPGRADE_INFO[key].name}ถึงระดับสูงสุดแล้ว`)
        return current
      }
      const cost = UPGRADE_INFO[key].baseCost * (level + 1)
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญสำหรับอัปเกรดนี้`)
        return current
      }
      const nextLevel = level + 1
      let next = {
        ...current,
        coins: current.coins - cost,
        upgrades: { ...current.upgrades, [key]: nextLevel },
      }
      if (key === 'community') next.community = clamp(current.community + 5)
      if (key === 'nursery') next.biodiversity = clamp(current.biodiversity + 1.5)
      if (key === 'mrv') next.coastal = clamp(current.coastal + 1)
      setNotice(`${UPGRADE_INFO[key].name} อัปเกรดเป็น Lv.${nextLevel}`)
      return appendLog(next, `อัปเกรด${UPGRADE_INFO[key].name}เป็น Lv.${nextLevel}`, 'reward')
    })
  }

  const resolveEvent = (choiceKey) => {
    setGame((current) => {
      if (!current.event) return current
      const event = current.event
      const choice = event.choices.find((item) => item.key === choiceKey)
      if (!choice || current.coins < choice.cost) {
        setNotice('เหรียญไม่พอสำหรับตัวเลือกนี้')
        return current
      }

      let next = { ...current, coins: current.coins - choice.cost, event: null }
      let text = ''

      if (event.id === 'storm') {
        const damage = choiceKey === 'protect' ? 3 : 15
        next.plots = current.plots.map((plot) => {
          if (!plot.species || plot.dead || plot.age >= 6) return plot
          const health = clamp(plot.health - damage)
          return { ...plot, health, dead: health <= 5 }
        })
        if (choiceKey === 'protect') next.coastal = clamp(current.coastal + 4)
        text = choiceKey === 'protect'
          ? 'เสริมแนวป้องกัน ต้นอ่อนได้รับผลกระทบน้อยลง'
          : 'ปล่อยพื้นที่รับมรสุม ต้นอ่อนเสียสุขภาพ'
      }

      if (event.id === 'trash') {
        if (choiceKey === 'clean') {
          next.biodiversity = clamp(current.biodiversity + 5)
          next.community = clamp(current.community + 4)
          text = 'ชุมชนช่วยเก็บขยะ Biodiversity และ Community เพิ่มขึ้น'
        } else {
          next.biodiversity = clamp(current.biodiversity - 4)
          text = 'ขยะยังอยู่ในพื้นที่ Biodiversity ลดลง'
        }
      }

      if (event.id === 'fishers') {
        if (choiceKey === 'partner') {
          next.community = clamp(current.community + 8)
          next.coastal = clamp(current.coastal + 2)
          text = 'ตั้งทีมเฝ้าระวังร่วมกับชุมชนสำเร็จ'
        } else {
          next.coins = current.coins + 70
          next.community = clamp(current.community - 2)
          text = 'รับรายได้ระยะสั้น แต่ความร่วมมือชุมชนลดลง'
        }
      }

      if (event.id === 'kingtide') {
        if (choiceKey === 'reinforce') {
          next.coastal = clamp(current.coastal + 10)
          text = 'แนวป้องกันธรรมชาติแข็งแรงขึ้น Coastal +10'
        } else {
          next.plots = current.plots.map((plot) => (
            plot.species && !plot.dead && plot.age < 5
              ? { ...plot, health: clamp(plot.health - 8) }
              : plot
          ))
          text = 'ติดตามโดยไม่แทรกแซง ต้นอ่อนเสียสุขภาพบางส่วน'
        }
      }

      if (event.id === 'wildlife') {
        const gain = choiceKey === 'survey' ? 8 : 2
        next.biodiversity = clamp(current.biodiversity + gain)
        text = `บันทึกการกลับมาของสัตว์น้ำ Biodiversity +${gain}`
      }

      if (event.id === 'grant') {
        if (choiceKey === 'accept') {
          next.coins = current.coins + 240
          next.community = clamp(current.community + 4)
          text = 'รับทุนแบบมีส่วนร่วม งบโครงการและ Community เพิ่มขึ้น'
        } else {
          next.biodiversity = clamp(current.biodiversity + 1)
          next.community = clamp(current.community + 1)
          text = 'ดำเนินงานอิสระ ทุกมิติ Impact เพิ่มเล็กน้อย'
        }
      }

      setNotice(text)
      return appendLog(next, text, 'event')
    })
  }

  const resetGame = () => {
    const fresh = createInitialGame()
    setGame(fresh)
    setSelectedPlot(null)
    setSandbox(false)
    setNotice('เริ่มโครงการใหม่แล้ว · เลือกพันธุ์และคลิกพื้นที่ 3D')
  }

  const closeHelp = () => {
    localStorage.setItem('mangrove-bay-3d-help-seen', '1')
    setShowHelp(false)
  }

  return (
    <div className="game3d-shell">
      <MangroveWorld3D
        plots={game.plots}
        selectedPlot={selectedPlot}
        activeSpecies={game.activeSpecies}
        onPlotClick={handlePlotClick}
        onClearSelection={() => setSelectedPlot(null)}
        day={game.day}
        eventType={game.event?.id || null}
        upgrades={game.upgrades}
      />

      <div className="game-ui">
        <header className="top-hud">
          <div className="brand-plaque">
            <span className="brand-emblem">M</span>
            <span>
              <strong>MANGROVE BAY</strong>
              <small>BLUE CARBON RESTORATION</small>
            </span>
          </div>

          <div className="resource-bar" aria-label="ทรัพยากรโครงการ">
            <ResourcePill icon="●" label="เหรียญ" value={Math.round(game.coins)} tone="coin" />
            <ResourcePill icon="◆" label="เครดิต" value={game.credits.toFixed(1)} tone="carbon" />
            <ResourcePill icon="✦" label="Impact" value={derived.impact} tone="impact" />
          </div>

          <div className="day-controls">
            <button className="round-ui-button" onClick={() => setShowHelp(true)} aria-label="เปิดวิธีเล่น">?</button>
            <button className="round-ui-button" onClick={() => setShowUpgrades(true)} aria-label="เปิดอัปเกรด">↑</button>
            <div className="day-badge"><small>YEAR {year}</small><b>DAY {game.day}</b></div>
            <button className="next-day-button" onClick={nextDay}>
              <span>จบวันนี้</span><b>›</b>
            </button>
          </div>
        </header>

        <aside className="left-stack">
          <button className="quest-card" onClick={() => setShowGoals(true)}>
            <span className="quest-pin">★</span>
            <span>
              <small>STORY PROGRESS</small>
              <strong>{game.claimedChapters.length}/4 บท</strong>
              <em>{STORY_CHAPTERS.find((_, index) => !game.claimedChapters.includes(index))?.text || 'Living Coast สำเร็จ'}</em>
            </span>
            <b>›</b>
          </button>

          <button className="mini-action-card" onClick={() => setShowLog(true)}>
            <span>≡</span><b>บันทึกภาคสนาม</b><small>{game.log.length}</small>
          </button>
        </aside>

        <aside className="right-dashboard">
          <section className="dashboard-panel carbon-panel">
            <div className="panel-title-row">
              <span><small>CARBON PIPELINE</small><strong>Drone + Field MRV</strong></span>
              <i>◆</i>
            </div>
            <div className="carbon-readout">
              <span>Estimated</span>
              <strong>{game.estimatedCarbon.toFixed(1)}</strong>
              <small>tCO₂e</small>
            </div>
            <div className="pipeline-steps">
              <span className="done">ปลูก</span><i>›</i><span className={game.estimatedCarbon >= 5 ? 'done' : ''}>ติดตาม</span><i>›</i><span>Verify</span><i>›</i><span>Credit</span>
            </div>
            <button className="primary-game-button" onClick={verifyCarbon}>
              <span>ส่งตรวจ MRV</span><b>{mrvCost} ●</b>
            </button>
          </section>

          <section className="dashboard-panel impact-panel">
            <div className="panel-title-row">
              <span><small>NON-CARBON BENEFITS</small><strong>สุขภาพพื้นที่</strong></span>
              <i>{derived.survivalRate}%</i>
            </div>
            <ImpactMeter label="Biodiversity" value={game.biodiversity} icon="B" />
            <ImpactMeter label="Community" value={game.community} icon="C" />
            <ImpactMeter label="Coastal" value={game.coastal} icon="W" />
          </section>

          <section className="dashboard-panel market-panel">
            <div className="market-price"><span><small>MARKET PRICE</small><strong>{game.marketPrice} ●</strong></span><em>/ tCO₂e</em></div>
            <div className="market-actions">
              <button onClick={() => sellCredits(1)}>ขาย 1</button>
              <button onClick={() => sellCredits(5)}>ขาย 5</button>
              <button onClick={() => sellCredits('all')}>ขายทั้งหมด</button>
            </div>
          </section>
        </aside>

        {selected && (
          <section className="selected-plot-card">
            <button className="selected-close" onClick={() => setSelectedPlot(null)} aria-label="ปิดรายละเอียด">×</button>
            <small>SELECTED PLOT #{String(selected.id).padStart(2, '0')}</small>
            <strong>{selected.species ? SPECIES[selected.species].name : 'แปลงว่าง'}</strong>
            <div className="selected-tags">
              <span>น้ำ {selected.tide}</span><span>ดิน {selected.soil}</span>
              {selected.species && <span>Fit {suitability(selected, selected.species)}/2</span>}
            </div>
            {selected.species ? (
              <>
                <div className="health-row"><span>สุขภาพ</span><b>{Math.round(selected.health)}%</b></div>
                <div className="health-bar"><span style={{ width: `${selected.health}%` }} /></div>
                <div className="selected-actions">
                  {selected.dead
                    ? <button onClick={clearSelected}>เคลียร์แปลง · 28 ●</button>
                    : <button onClick={maintainSelected}>บำรุงรักษา · 38 ●</button>}
                </div>
              </>
            ) : (
              <p>เลือกพันธุ์ด้านล่างแล้วคลิกแปลงนี้เพื่อปลูก</p>
            )}
          </section>
        )}

        <nav className="plant-dock" aria-label="เลือกพันธุ์ไม้">
          <div className="dock-caption"><small>NURSERY LV.{game.upgrades.nursery}</small><strong>เลือกพันธุ์แล้วคลิกแปลง</strong></div>
          {Object.entries(SPECIES).map(([key, species]) => {
            const cost = getPlantCost(game, key)
            return (
              <button
                key={key}
                className={`species-tool ${game.activeSpecies === key ? 'active' : ''}`}
                onClick={() => selectSpecies(key)}
                style={{ '--species-tint': species.tint }}
              >
                <span>{species.icon}</span>
                <b>{species.short}</b>
                <small>{cost} ●</small>
              </button>
            )
          })}
          <button className="dock-more" onClick={() => setShowUpgrades(true)}>
            <span>+</span><b>สิ่งปลูกสร้าง</b><small>อัปเกรด</small>
          </button>
        </nav>

        <div className="notice-toast"><span>i</span>{notice}</div>
        <div className="camera-tip">ลากฉากเพื่อหมุน · เลื่อนเมาส์เพื่อซูม · คลิกแปลงเพื่อปลูก</div>
      </div>

      {game.event && (
        <ModalBackdrop>
          <div className="event-modal game-modal">
            <div className="modal-icon">{game.event.icon}</div>
            <small>{game.event.label}</small>
            <h2>{game.event.title}</h2>
            <p>{game.event.text}</p>
            <div className="choice-list">
              {game.event.choices.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => resolveEvent(choice.key)}
                  disabled={game.coins < choice.cost}
                >
                  <span><b>{choice.label}</b><small>{choice.hint}</small></span><i>›</i>
                </button>
              ))}
            </div>
          </div>
        </ModalBackdrop>
      )}

      {showHelp && (
        <ModalBackdrop>
          <div className="help-modal game-modal">
            <button className="modal-close" onClick={closeHelp}>×</button>
            <small>HOW TO PLAY</small>
            <h2>ฟื้นป่าชายเลนในโลก 3D</h2>
            <div className="help-steps">
              <HelpStep number="1" title="เลือกพันธุ์" text="พันธุ์แต่ละชนิดเหมาะกับระดับน้ำและดินต่างกัน" />
              <HelpStep number="2" title="คลิกแปลงในฉาก" text="ปลูก ดูการเติบโต หมุนกล้อง และซูมดูพื้นที่ได้" />
              <HelpStep number="3" title="จบวันและดูแล" text="ต้นไม้โต สะสม Carbon และเจอเหตุการณ์ชายฝั่ง" />
              <HelpStep number="4" title="ตรวจ MRV" text="Estimated Carbon ต้องผ่าน Drone + Field ก่อนออกเครดิต" />
              <HelpStep number="5" title="สร้าง Impact" text="รักษา Biodiversity, Community และ Coastal ควบคู่ Carbon" />
            </div>
            <button className="primary-game-button large" onClick={closeHelp}>เริ่มเล่น</button>
            <p className="simulation-note">ค่าคาร์บอนและระบบนิเวศเป็นกลไกจำลองเพื่อการเล่น ไม่ใช่การคำนวณเครดิตจริง</p>
          </div>
        </ModalBackdrop>
      )}

      {showUpgrades && (
        <ModalBackdrop onClose={() => setShowUpgrades(false)}>
          <div className="upgrade-modal game-modal">
            <button className="modal-close" onClick={() => setShowUpgrades(false)}>×</button>
            <small>PROJECT BUILDINGS</small>
            <h2>อัปเกรดพื้นที่</h2>
            <div className="upgrade-grid">
              {Object.entries(UPGRADE_INFO).map(([key, info]) => {
                const level = game.upgrades[key]
                const cost = info.baseCost * (level + 1)
                return (
                  <article key={key} className="upgrade-card">
                    <span className="upgrade-icon">{info.icon}</span>
                    <div><b>{info.name}</b><small>{info.description}</small></div>
                    <div className="level-dots">{[1, 2, 3].map((dot) => <i key={dot} className={dot <= level ? 'on' : ''} />)}</div>
                    <button onClick={() => buyUpgrade(key)} disabled={level >= 3}>
                      {level >= 3 ? 'MAX LEVEL' : `อัปเกรด ${cost} ●`}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        </ModalBackdrop>
      )}

      {showLog && (
        <ModalBackdrop onClose={() => setShowLog(false)}>
          <div className="log-modal game-modal">
            <button className="modal-close" onClick={() => setShowLog(false)}>×</button>
            <small>FIELD ACTIVITY</small>
            <h2>บันทึกภาคสนาม</h2>
            <div className="field-log-list">
              {game.log.map((item, index) => (
                <div key={`${item.day}-${index}`} className={`field-log-item type-${item.type}`}>
                  <span>DAY {item.day}</span><p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </ModalBackdrop>
      )}

      {showGoals && (
        <ModalBackdrop onClose={() => setShowGoals(false)}>
          <div className="goals-modal game-modal">
            <button className="modal-close" onClick={() => setShowGoals(false)}>×</button>
            <small>LIVING COAST CAMPAIGN</small>
            <h2>เส้นทางโครงการ</h2>
            <div className="chapter-list">
              {STORY_CHAPTERS.map((chapter, index) => {
                const complete = game.claimedChapters.includes(index) || chapter.test(game, derived)
                return (
                  <div key={chapter.title} className={complete ? 'complete' : ''}>
                    <span>{complete ? '✓' : index + 1}</span>
                    <p><b>{chapter.title}</b><small>{chapter.text}</small></p>
                    <em>+{chapter.reward} ●</em>
                  </div>
                )
              })}
            </div>
            <h3>เงื่อนไข Living Coast Standard</h3>
            <div className="victory-checks">
              <GoalCheck label="ต้นไม้รอด 12 ต้น" value={`${derived.living.length}/12`} done={derived.victoryChecks.living} />
              <GoalCheck label="ต้นโตเต็มที่ 8 ต้น" value={`${derived.matureCount}/8`} done={derived.victoryChecks.mature} />
              <GoalCheck label="Verified 25 tCO₂e" value={`${game.stats.verified.toFixed(1)}/25`} done={derived.victoryChecks.carbon} />
              <GoalCheck label="Biodiversity 45" value={Math.round(game.biodiversity)} done={derived.victoryChecks.biodiversity} />
              <GoalCheck label="Community 35" value={Math.round(game.community)} done={derived.victoryChecks.community} />
              <GoalCheck label="Coastal 35" value={Math.round(game.coastal)} done={derived.victoryChecks.coastal} />
              <GoalCheck label="Survival 70%" value={`${derived.survivalRate}%`} done={derived.victoryChecks.survival} />
            </div>
          </div>
        </ModalBackdrop>
      )}

      {derived.victory && !sandbox && (
        <ModalBackdrop>
          <div className="victory-modal game-modal">
            <div className="victory-seal">A</div>
            <small>CAMPAIGN COMPLETE</small>
            <h2>Living Coast Standard</h2>
            <p>พื้นที่ของคุณผ่านเป้าหมาย Carbon และ Non-carbon Benefit ครบทุกด้าน</p>
            <div className="victory-stats">
              <span><b>{game.stats.verified.toFixed(1)}</b><small>Verified tCO₂e</small></span>
              <span><b>{derived.impact}</b><small>Impact Score</small></span>
              <span><b>{derived.survivalRate}%</b><small>Survival</small></span>
            </div>
            <div className="victory-actions">
              <button className="primary-game-button large" onClick={() => setSandbox(true)}>เล่น Sandbox ต่อ</button>
              <button className="secondary-game-button" onClick={resetGame}>เริ่มโครงการใหม่</button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}

function ResourcePill({ icon, label, value, tone }) {
  return (
    <div className={`resource-pill tone-${tone}`}>
      <span>{icon}</span><b>{value}</b><small>{label}</small>
    </div>
  )
}

function ImpactMeter({ label, value, icon }) {
  const safe = clamp(value)
  return (
    <div className="impact-meter">
      <div><span>{icon}</span><b>{label}</b><strong>{Math.round(value)}</strong></div>
      <div className="meter-track"><span style={{ width: `${safe}%` }} /></div>
    </div>
  )
}

function ModalBackdrop({ children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      {children}
    </div>
  )
}

function HelpStep({ number, title, text }) {
  return (
    <div className="help-step"><span>{number}</span><p><b>{title}</b><small>{text}</small></p></div>
  )
}

function GoalCheck({ label, value, done }) {
  return (
    <div className={done ? 'done' : ''}><span>{done ? '✓' : '○'}</span><b>{label}</b><strong>{value}</strong></div>
  )
}

export default App
