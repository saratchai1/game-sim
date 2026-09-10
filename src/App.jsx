import { useEffect, useMemo, useState } from 'react'

const SAVE_KEY = 'mangrove-blue-carbon-save-v1'

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
    note: 'เด่นด้านคาร์บอน เหมาะกับโซนน้ำกลางในเกม',
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
    note: 'ตั้งตัวไวและเพิ่มความหลากหลายได้ดีในเกม',
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
    note: 'ให้แต้มระบบนิเวศสูง เหมาะกับพื้นที่ริมน้ำในเกม',
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
      { key: 'protect', label: 'เสริมแนวป้องกัน', hint: '-120 เหรียญ · ลดความเสียหาย', cost: 120 },
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
      { key: 'clean', label: 'จ้างชุมชนเก็บขยะ', hint: '-70 เหรียญ · Nature + Community', cost: 70 },
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
      { key: 'invest', label: 'ร่วมลงทุน Nursery', hint: '-150 เหรียญ · ลดค่าปลูกถาวร', cost: 150 },
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
]

const createInitialGame = () => ({
  day: 1,
  coins: 720,
  estimatedCarbon: 0,
  credits: 0,
  biodiversity: 8,
  community: 10,
  coastal: 6,
  nurseryLevel: 0,
  marketPrice: 82,
  selectedSpecies: 'rhizophora',
  plots: BASE_PLOTS,
  event: null,
  stats: { planted: 0, dead: 0, verified: 0, sold: 0 },
  log: [
    { day: 1, icon: '🗺️', text: 'ได้รับพื้นที่ชายฝั่งเสื่อมโทรม 16 แปลง เริ่มวางแผนฟื้นฟูได้เลย' },
  ],
})

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : createInitialGame()
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
  const tide = species.tides.includes(plot.tide)
  const soil = species.soils.includes(plot.soil)
  return Number(tide) + Number(soil)
}

function stageFor(plot) {
  if (plot.dead) return 'dead'
  if (!plot.species) return 'empty'
  if (plot.age < 2) return 'seedling'
  if (plot.age < 5) return 'young'
  return 'mature'
}

function stageLabel(plot) {
  const stage = stageFor(plot)
  return {
    empty: 'ว่าง',
    seedling: 'ต้นกล้า',
    young: 'ต้นอ่อน',
    mature: 'โตเต็มที่',
    dead: 'ไม่รอด',
  }[stage]
}

function treeIcon(plot) {
  if (!plot.species) return '＋'
  if (plot.dead) return '🥀'
  const species = SPECIES[plot.species]
  if (plot.age >= 5) return species.matureIcon
  return species.icon
}

function App() {
  const [game, setGame] = useState(loadGame)
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [notice, setNotice] = useState('เลือกพันธุ์ไม้ แล้วคลิกแปลงว่างเพื่อปลูก')

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game])

  const selectedSpecies = SPECIES[game.selectedSpecies]
  const plantedPlots = game.plots.filter((plot) => plot.species && !plot.dead)
  const matureCount = plantedPlots.filter((plot) => plot.age >= 5).length
  const survivalRate = game.stats.planted
    ? Math.round(((game.stats.planted - game.stats.dead) / game.stats.planted) * 100)
    : 100
  const impactScore = clamp(Math.round(
    game.biodiversity * 0.38 + game.community * 0.34 + game.coastal * 0.28,
  ))
  const year = Math.floor((game.day - 1) / 20) + 1
  const tidePhase = ['น้ำลง', 'น้ำกำลังขึ้น', 'น้ำขึ้น', 'น้ำกำลังลง'][(game.day - 1) % 4]

  const missions = useMemo(() => [
    { label: 'ปลูกให้ครบ 6 ต้น', value: Math.min(game.stats.planted, 6), max: 6 },
    { label: 'มีต้นโตเต็มที่ 3 ต้น', value: Math.min(matureCount, 3), max: 3 },
    { label: 'ออกเครดิต 5 tCO₂e', value: Math.min(game.stats.verified, 5), max: 5 },
  ], [game.stats.planted, game.stats.verified, matureCount])

  const addLog = (state, icon, text) => ({
    ...state,
    log: [{ day: state.day, icon, text }, ...state.log].slice(0, 7),
  })

  const plant = (plotId) => {
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot || plot.species) return current
      const species = SPECIES[current.selectedSpecies]
      const cost = Math.max(28, species.cost - current.nurseryLevel * 7)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ ลองขาย Carbon Credit หรือเลือกพันธุ์ที่ต้นทุนต่ำกว่า')
        return current
      }
      const score = suitability(plot, current.selectedSpecies)
      const health = score === 2 ? 94 : score === 1 ? 82 : 68
      const next = {
        ...current,
        coins: current.coins - cost,
        stats: { ...current.stats, planted: current.stats.planted + 1 },
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: current.selectedSpecies, age: 0, health, dead: false }
          : item),
      }
      setNotice(`${species.name} ถูกปลูกในแปลง ${plotId} · ความเหมาะสม ${score}/2`)
      return addLog(next, '🌱', `ปลูก${species.short}ในแปลง ${plotId} (${plot.tide}/${plot.soil})`)
    })
  }

  const clearPlot = (plotId) => {
    setGame((current) => {
      if (current.coins < 20) {
        setNotice('ต้องใช้ 20 เหรียญเพื่อเตรียมแปลงใหม่')
        return current
      }
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot?.dead) return current
      setNotice(`เตรียมแปลง ${plotId} ใหม่แล้ว`)
      return {
        ...current,
        coins: current.coins - 20,
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: null, age: 0, health: 100, dead: false }
          : item),
      }
    })
  }

  const nextDay = () => {
    setGame((current) => {
      let carbonGain = 0
      let bioGain = 0
      let coastalGain = 0
      let newDeaths = 0

      const plots = current.plots.map((plot) => {
        if (!plot.species || plot.dead) return plot
        const species = SPECIES[plot.species]
        const score = suitability(plot, plot.species)
        const age = plot.age + 1
        const random = Math.floor(Math.random() * 5) - 2
        const healthDelta = score === 2 ? 2 : score === 1 ? -1 : -5
        const health = clamp(plot.health + healthDelta + random)
        const dead = health <= 5
        if (dead) newDeaths += 1

        const stageFactor = age < 2 ? 0.3 : age < 5 ? 0.65 : 1
        if (!dead) {
          carbonGain += species.carbon * stageFactor * (health / 100)
          bioGain += species.biodiversity * stageFactor * 0.22
          coastalGain += stageFactor * 0.09
        }
        return { ...plot, age, health, dead }
      })

      const nextDayNumber = current.day + 1
      const shouldTriggerEvent = nextDayNumber % 4 === 0 && !current.event
      const event = shouldTriggerEvent
        ? EVENTS[Math.floor(Math.random() * EVENTS.length)]
        : current.event
      const marketDelta = Math.floor(Math.random() * 9) - 4

      let next = {
        ...current,
        day: nextDayNumber,
        plots,
        estimatedCarbon: current.estimatedCarbon + carbonGain,
        biodiversity: clamp(current.biodiversity + bioGain),
        coastal: clamp(current.coastal + coastalGain),
        marketPrice: clamp(current.marketPrice + marketDelta, 62, 110),
        event,
        stats: { ...current.stats, dead: current.stats.dead + newDeaths },
      }
      next = addLog(next, '🌊', `ผ่านไป 1 วัน · สะสมคาร์บอนประมาณ +${carbonGain.toFixed(1)} tCO₂e`)
      if (newDeaths > 0) {
        next = addLog(next, '🥀', `มีต้นไม้ไม่รอด ${newDeaths} ต้น ต้องตรวจความเหมาะสมของแปลง`)
      }
      setNotice(event ? 'มีเหตุการณ์ใหม่เกิดขึ้นในพื้นที่' : 'ระบบนิเวศเดินหน้าต่ออีก 1 วัน')
      return next
    })
  }

  const verifyCarbon = () => {
    setGame((current) => {
      if (current.estimatedCarbon < 3) {
        setNotice('ต้องมี Estimated Carbon อย่างน้อย 3 tCO₂e ก่อนส่งตรวจ')
        return current
      }
      if (current.coins < 120) {
        setNotice('ต้องใช้ 120 เหรียญสำหรับภารกิจ Drone + MRV')
        return current
      }
      const factor = 0.88 + Math.random() * 0.08
      const issued = current.estimatedCarbon * factor
      let next = {
        ...current,
        coins: current.coins - 120,
        estimatedCarbon: 0,
        credits: current.credits + issued,
        community: clamp(current.community + 1.5),
        stats: { ...current.stats, verified: current.stats.verified + issued },
      }
      next = addLog(next, '🛰️', `MRV ผ่าน ออกเครดิต ${issued.toFixed(1)} tCO₂e จากข้อมูล Drone/Field`)
      setNotice(`Verified ${issued.toFixed(1)} tCO₂e — พร้อมถือหรือขายเครดิต`)
      return next
    })
  }

  const sellCredit = (amount = 1) => {
    setGame((current) => {
      const sellable = Math.min(amount, Math.floor(current.credits))
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
      next = addLog(next, '💠', `ขาย ${sellable} Carbon Credit ได้ ${revenue} เหรียญ`)
      setNotice(`ขายเครดิตแล้ว +${revenue} เหรียญ`)
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
        const damage = choice === 'protect' ? 4 : 16
        next.plots = current.plots.map((plot) => {
          if (!plot.species || plot.dead || plot.age >= 5) return plot
          const health = clamp(plot.health - damage)
          return { ...plot, health, dead: health <= 5 }
        })
        if (choice === 'protect') next.coastal = clamp(current.coastal + 3)
        logText = choice === 'protect'
          ? 'เสริมแนวป้องกันก่อนมรสุม ต้นอ่อนได้รับผลกระทบน้อยลง'
          : 'ปล่อยให้พื้นที่รับมรสุมตามธรรมชาติ ต้นอ่อนเสียสุขภาพ'
      }

      if (event.id === 'trash') {
        if (choice === 'clean') {
          next.biodiversity = clamp(current.biodiversity + 5)
          next.community = clamp(current.community + 4)
          logText = 'ชุมชนช่วยกันเก็บขยะ Biodiversity และ Community เพิ่มขึ้น'
        } else {
          next.biodiversity = clamp(current.biodiversity - 4)
          logText = 'ขยะยังคงอยู่ในพื้นที่ Biodiversity ลดลง'
        }
      }

      if (event.id === 'nursery') {
        if (choice === 'invest') {
          next.nurseryLevel = current.nurseryLevel + 1
          next.community = clamp(current.community + 8)
          logText = `Nursery อัปเกรดเป็น Lv.${next.nurseryLevel} ค่าต้นกล้าลดลงถาวร`
        } else {
          logText = 'ยังไม่ลงทุน Nursery ในรอบนี้'
        }
      }

      if (event.id === 'wildlife') {
        next.biodiversity = clamp(current.biodiversity + 6)
        logText = 'บันทึกการกลับมาของสัตว์น้ำ Biodiversity +6'
      }

      setNotice(logText)
      return addLog(next, event.icon, logText)
    })
  }

  const resetGame = () => {
    const fresh = createInitialGame()
    setGame(fresh)
    setSelectedPlot(null)
    setNotice('เริ่มโครงการใหม่แล้ว')
  }

  const currentPlot = game.plots.find((plot) => plot.id === selectedPlot)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MANGROVE</strong>
            <span>BLUE CARBON</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="mini-stat"><span>🪙</span><b>{Math.round(game.coins)}</b></div>
          <div className="mini-stat carbon"><span>◆</span><b>{game.credits.toFixed(1)}</b><small>tCO₂e</small></div>
          <button className="ghost-button" onClick={resetGame}>เริ่มใหม่</button>
        </div>
      </header>

      <main className="game-layout">
        <section className="main-column">
          <div className="scene-header">
            <div>
              <p className="eyebrow">RESTORATION SITE · YEAR {year}</p>
              <h1>ฟื้นคืนผืนป่าชายเลน</h1>
              <p className="scene-subtitle">Day {game.day} · {tidePhase} · เลือกพันธุ์ให้เหมาะกับน้ำและดิน</p>
            </div>
            <button className="next-day" onClick={nextDay}>
              จบวันนี้ <span>→</span>
            </button>
          </div>

          <div className="notice-bar"><span>●</span>{notice}</div>

          <div className="world-card">
            <div className="waterline">
              <div className="sun">☀</div>
              <div className="horizon-copy">พื้นที่ชุ่มน้ำชายฝั่ง</div>
              <div className="wave wave-a">～～～～～～～～～～～～～～</div>
              <div className="wave wave-b">～～～～～～～～～～～～～～</div>
            </div>

            <div className="plot-grid">
              {game.plots.map((plot) => {
                const empty = !plot.species
                const score = empty ? suitability(plot, game.selectedSpecies) : suitability(plot, plot.species)
                const stage = stageFor(plot)
                const cost = Math.max(28, selectedSpecies.cost - game.nurseryLevel * 7)
                return (
                  <button
                    key={plot.id}
                    className={`plot plot-${stage} ${selectedPlot === plot.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPlot(plot.id)
                      if (empty) plant(plot.id)
                      else if (plot.dead) clearPlot(plot.id)
                    }}
                  >
                    <div className="plot-meta">
                      <span>#{String(plot.id).padStart(2, '0')}</span>
                      <span className={`fit fit-${score}`}>{'●'.repeat(score)}{'○'.repeat(2 - score)}</span>
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
              <div><p className="eyebrow">NURSERY · LV.{game.nurseryLevel}</p><h2>เลือกพันธุ์ไม้</h2></div>
              <span className="legend">●● เหมาะมาก &nbsp; ●○ พอใช้ &nbsp; ○○ เสี่ยง</span>
            </div>
            <div className="species-list">
              {Object.entries(SPECIES).map(([key, species]) => {
                const cost = Math.max(28, species.cost - game.nurseryLevel * 7)
                return (
                  <button
                    key={key}
                    className={`species-card ${game.selectedSpecies === key ? 'active' : ''}`}
                    onClick={() => {
                      setGame((current) => ({ ...current, selectedSpecies: key }))
                      setNotice(`เลือก${species.name}แล้ว — คลิกแปลงว่างเพื่อปลูก`)
                    }}
                  >
                    <span className="species-icon">{species.matureIcon}</span>
                    <span className="species-copy">
                      <b>{species.name}</b>
                      <i>{species.latin}</i>
                      <small>{species.note}</small>
                    </span>
                    <span className="species-cost">{cost}<small>🪙 / ต้น</small></span>
                  </button>
                )
              })}
            </div>
          </section>
        </section>

        <aside className="sidebar">
          <section className="impact-card">
            <div className="impact-score">
              <div>
                <p className="eyebrow">PROJECT IMPACT</p>
                <strong>{impactScore}</strong><span>/100</span>
              </div>
              <div className="impact-badge">{impactScore >= 70 ? 'THRIVING' : impactScore >= 40 ? 'GROWING' : 'RESTORING'}</div>
            </div>
            <Metric icon="🦋" label="Biodiversity" value={game.biodiversity} />
            <Metric icon="🤝" label="Community" value={game.community} />
            <Metric icon="🌊" label="Coastal resilience" value={game.coastal} />
            <div className="survival-row"><span>Survival rate</span><b>{survivalRate}%</b></div>
          </section>

          <section className="panel mrv-panel">
            <div className="section-heading compact">
              <div><p className="eyebrow">CARBON PIPELINE</p><h2>MRV</h2></div>
              <span className="satellite">🛰️</span>
            </div>
            <div className="carbon-number">
              <span>Estimated</span><strong>{game.estimatedCarbon.toFixed(1)}</strong><small>tCO₂e</small>
            </div>
            <div className="flow-line"><span className="done">ปลูก</span><i>→</i><span>ติดตาม</span><i>→</i><span>Verify</span><i>→</i><span>Credit</span></div>
            <button className="primary-button" onClick={verifyCarbon}>ส่ง Drone + Field ตรวจ MRV <span>120 🪙</span></button>
            <p className="fine-print">ค่าคาร์บอนและ Verification ในเกมเป็นค่าจำลองเพื่อ gameplay ไม่ใช่การคำนวณเครดิตจริง</p>
          </section>

          <section className="panel market-panel">
            <div className="market-head"><div><p className="eyebrow">CARBON MARKET</p><h2>ตลาดเครดิต</h2></div><b>{game.marketPrice} 🪙</b></div>
            <div className="market-row"><span>เครดิตที่ถือ</span><strong>{game.credits.toFixed(1)} tCO₂e</strong></div>
            <button className="secondary-button" onClick={() => sellCredit(1)}>ขาย 1 เครดิต</button>
          </section>

          <section className="panel mission-panel">
            <p className="eyebrow">RESTORATION GOALS</p>
            <h2>ภารกิจโครงการ</h2>
            {missions.map((mission) => (
              <div className="mission" key={mission.label}>
                <div><span>{mission.label}</span><b>{mission.value.toFixed(mission.max === 5 ? 1 : 0)}/{mission.max}</b></div>
                <div className="mission-track"><span style={{ width: `${(mission.value / mission.max) * 100}%` }} /></div>
              </div>
            ))}
          </section>

          <section className="panel log-panel">
            <p className="eyebrow">FIELD LOG</p>
            <h2>บันทึกล่าสุด</h2>
            <div className="log-list">
              {game.log.map((item, index) => (
                <div className="log-item" key={`${item.day}-${index}`}>
                  <span>{item.icon}</span><p>{item.text}<small>DAY {item.day}</small></p>
                </div>
              ))}
            </div>
          </section>

          {currentPlot?.species && (
            <section className="panel selected-panel">
              <p className="eyebrow">SELECTED PLOT #{String(currentPlot.id).padStart(2, '0')}</p>
              <h2>{SPECIES[currentPlot.species].name}</h2>
              <div className="detail-grid">
                <span>น้ำ <b>{currentPlot.tide}</b></span>
                <span>ดิน <b>{currentPlot.soil}</b></span>
                <span>อายุ <b>{currentPlot.age} วัน</b></span>
                <span>Fit <b>{suitability(currentPlot, currentPlot.species)}/2</b></span>
              </div>
            </section>
          )}
        </aside>
      </main>

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
