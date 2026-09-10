import { useEffect, useMemo, useRef, useState } from 'react'
import MangroveWorld3D from './game3d/MangroveWorld3D.jsx'
import {
  CHAPTERS,
  EVENTS,
  SAVE_KEY,
  SPECIES,
  TUTORIAL,
  TUTORIAL_KEY,
  UPGRADES,
  clamp,
  createInitialGame,
  getMetrics,
  loadGame,
  stageFor,
  stageLabel,
  suitability,
  upgradeCost,
} from './game3d/gameData.js'

const DRAWERS = {
  missions: { icon: '📜', label: 'ภารกิจ' },
  upgrades: { icon: '🛠️', label: 'พัฒนา' },
  market: { icon: '💠', label: 'ตลาด' },
  log: { icon: '📒', label: 'บันทึก' },
}

function App3D() {
  const [game, setGame] = useState(loadGame)
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [notice, setNotice] = useState('เลือกพันธุ์จากแถบด้านล่าง แล้วคลิกแปลงดินในโลก 3D')
  const [tutorialStep, setTutorialStep] = useState(() => (
    localStorage.getItem(TUTORIAL_KEY) ? -1 : 0
  ))
  const [drawer, setDrawer] = useState(null)
  const [worldReady, setWorldReady] = useState(false)
  const [mrvActive, setMrvActive] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [cameraResetSignal, setCameraResetSignal] = useState(0)
  const mrvTimerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game])

  useEffect(() => () => {
    if (mrvTimerRef.current) window.clearTimeout(mrvTimerRef.current)
  }, [])

  const metrics = getMetrics(game)
  const selectedSpecies = SPECIES[game.selectedSpecies]
  const currentPlot = game.plots.find((plot) => plot.id === selectedPlot) || null
  const year = Math.floor((game.day - 1) / 20) + 1
  const tidePhase = ['น้ำลง', 'น้ำกำลังขึ้น', 'น้ำขึ้น', 'น้ำกำลังลง'][(game.day - 1) % 4]
  const marketTrend = game.marketPrice - game.lastMarketPrice
  const plantingCost = (species) => Math.max(28, species.cost - game.upgrades.nursery * 7)
  const mrvCost = Math.max(65, 120 - game.upgrades.drone * 18)
  const livelihoodIncome = game.community >= 30 ? Math.floor(game.community / 20) * 5 : 0

  const completionRequirements = useMemo(() => [
    { label: 'ต้นไม้รอด', value: metrics.liveCount, target: 12, unit: ' ต้น' },
    { label: 'ต้นโตเต็มที่', value: metrics.matureCount, target: 8, unit: ' ต้น' },
    { label: 'Verified carbon', value: metrics.verified, target: 25, unit: ' tCO₂e' },
    { label: 'Biodiversity', value: game.biodiversity, target: 45, unit: '' },
    { label: 'Community', value: game.community, target: 35, unit: '' },
    { label: 'Coastal resilience', value: game.coastal, target: 35, unit: '' },
    { label: 'Survival rate', value: metrics.survivalRate, target: 70, unit: '%' },
  ], [game.biodiversity, game.coastal, game.community, metrics])

  const completionReady = completionRequirements.every((item) => item.value >= item.target)
  const finishedCount = completionRequirements.filter((item) => item.value >= item.target).length
  const completionPercent = Math.round((finishedCount / completionRequirements.length) * 100)

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
    log: [{ day: state.day, icon, text }, ...state.log].slice(0, 12),
  })

  const selectSpecies = (key) => {
    const species = SPECIES[key]
    setGame((current) => ({ ...current, selectedSpecies: key }))
    setNotice(`เลือก${species.name}แล้ว — คลิกแปลงว่างในพื้นที่ 3D เพื่อปลูก`)
  }

  const plant = (plotId) => {
    setGame((current) => {
      if (current.event) {
        setNotice('จัดการเหตุการณ์ปัจจุบันก่อนปลูกเพิ่ม')
        return current
      }
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot || plot.species) return current
      const species = SPECIES[current.selectedSpecies]
      const cost = Math.max(28, species.cost - current.upgrades.nursery * 7)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ ลองขายเครดิต รับรางวัลภารกิจ หรือใช้ทุนฉุกเฉิน')
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

  const handlePlotClick = (plotId) => {
    setSelectedPlot(plotId)
    const plot = game.plots.find((item) => item.id === plotId)
    if (!plot?.species) {
      plant(plotId)
      return
    }
    setNotice(`เลือกแปลง ${plotId} · ${SPECIES[plot.species].name} · ${stageLabel(plot)}`)
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
      const event = nextDayNumber % 4 === 0
        ? EVENTS[Math.floor(Math.random() * EVENTS.length)]
        : null
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

      next = addLog(next, '☀️', `Day ${nextDayNumber} · Estimated Carbon +${carbonGain.toFixed(1)} tCO₂e${passiveIncome ? ` · รายได้ชุมชน +${passiveIncome}` : ''}`)
      if (newFailures > 0) next = addLog(next, '🥀', `มีต้นไม้ไม่รอด ${newFailures} ต้นจากสภาพพื้นที่`)
      if (event) next = addLog(next, event.icon, `เกิดเหตุการณ์: ${event.title}`)

      setNotice(event ? 'มีเหตุการณ์ใหม่ ต้องตัดสินใจก่อนเดินหน้าต่อ' : `เข้าสู่ Day ${nextDayNumber} · ป่าชายเลนกำลังเติบโต`)
      return next
    })
  }

  const verifyCarbon = () => {
    if (mrvActive) return
    if (game.estimatedCarbon < 5) {
      setNotice('ต้องมี Estimated Carbon อย่างน้อย 5 tCO₂e ก่อนส่งตรวจ MRV')
      return
    }
    if (game.coins < mrvCost) {
      setNotice(`ต้องใช้ ${mrvCost} เหรียญสำหรับ Drone + Field MRV`)
      return
    }

    setMrvActive(true)
    if (mrvTimerRef.current) window.clearTimeout(mrvTimerRef.current)
    mrvTimerRef.current = window.setTimeout(() => setMrvActive(false), 2100)

    setGame((current) => {
      const cost = Math.max(65, 120 - current.upgrades.drone * 18)
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
      setNotice(`Drone สำรวจเสร็จแล้ว · Verified ${issued.toFixed(1)} tCO₂e`)
      return next
    })
  }

  const sellCredit = (amount) => {
    setGame((current) => {
      const sellable = amount === 'all'
        ? Math.floor(current.credits)
        : Math.min(amount, Math.floor(current.credits))
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
      next = addLog(next, '💠', `ขาย ${sellable} เครดิตที่ ${current.marketPrice} เหรียญ ได้ ${revenue} เหรียญ`)
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
      setNotice(`${UPGRADES[key].name} Lv.${newLevel} ปรากฏในพื้นที่แล้ว`)
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
          logText = 'ชุมชนเก็บขยะ Biodiversity +5 และ Community +4'
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
            logText = 'Nursery เต็มระดับแล้ว จึงใช้เงินฝึกคนในชุมชน Community +6'
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
      next = addLog(next, '🛟', 'รับทุนฟื้นฟูฉุกเฉิน +220 เหรียญ')
      setNotice('ได้รับทุนฉุกเฉิน 220 เหรียญ ใช้กับรอบฟื้นฟูถัดไป')
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
    setDrawer(null)
    setNotice('เริ่มโครงการใหม่แล้ว เลือกพันธุ์และคลิกแปลงดินเพื่อปลูก')
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

  const fit = currentPlot
    ? suitability(currentPlot, currentPlot.species || game.selectedSpecies)
    : null
  const fitLabel = fit === 2 ? 'เหมาะมาก' : fit === 1 ? 'พอใช้' : 'เสี่ยง'

  return (
    <div className="game3d-app">
      <main className="game3d-stage">
        <MangroveWorld3D
          plots={game.plots}
          selectedPlot={selectedPlot}
          selectedSpecies={game.selectedSpecies}
          biodiversity={game.biodiversity}
          community={game.community}
          coastal={game.coastal}
          upgrades={game.upgrades}
          day={game.day}
          eventId={game.event?.id || null}
          mrvActive={mrvActive}
          cameraResetSignal={cameraResetSignal}
          onPlotClick={handlePlotClick}
          onReady={() => setWorldReady(true)}
        />

        {!worldReady && (
          <div className="world-loading">
            <div className="loading-leaf">🌿</div>
            <b>กำลังสร้าง Mangrove Bay 3D</b>
            <span>เตรียมพื้นที่ น้ำ ต้นไม้ และชุมชน</span>
          </div>
        )}

        <div className="sky-vignette" />

        <header className="g3d-topbar">
          <div className="g3d-brand wooden-sign">
            <span className="brand-leaf">🌿</span>
            <div><strong>MANGROVE BAY</strong><small>BLUE CARBON ADVENTURE</small></div>
          </div>

          <div className="resource-cluster">
            <ResourcePill icon="🪙" value={Math.round(game.coins)} label="coins" />
            <ResourcePill icon="💠" value={game.credits.toFixed(1)} label="credits" cyan />
            <div className="level-badge"><span>LV</span><b>{metrics.level}</b></div>
          </div>

          <button className="day-button" onClick={nextDay} disabled={Boolean(game.event)}>
            <span className="day-sun">☀️</span>
            <span><small>DAY {game.day}</small><b>จบวันนี้</b></span>
            <i>›</i>
          </button>
        </header>

        <section className="campaign-banner">
          <div className="campaign-medal">🏆</div>
          <div className="campaign-copy">
            <small>ภารกิจหลัก · YEAR {year}</small>
            <b>ฟื้นฟูชายฝั่งให้ผ่าน Living Coast Standard</b>
            <span>{tidePhase} · สำเร็จแล้ว {finishedCount}/{completionRequirements.length} เงื่อนไข</span>
          </div>
          <div className="campaign-ring" style={{ '--campaign-progress': `${completionPercent * 3.6}deg` }}>
            <b>{completionPercent}%</b>
          </div>
        </section>

        <aside className="impact-hud">
          <div className="impact-score-orb">
            <span>IMPACT</span>
            <b>{metrics.impactScore}</b>
            <small>/100</small>
          </div>
          <ImpactMeter icon="🦋" label="Biodiversity" value={game.biodiversity} />
          <ImpactMeter icon="🤝" label="Community" value={game.community} />
          <ImpactMeter icon="🌊" label="Coastal" value={game.coastal} />
          <div className="survival-chip"><span>❤️ Survival</span><b>{metrics.survivalRate}%</b></div>
        </aside>

        <div className="camera-tools">
          <button onClick={() => setCameraResetSignal((value) => value + 1)} title="กลับมุมกล้องเริ่มต้น">⌂</button>
          <button onClick={() => setTutorialStep(0)} title="วิธีเล่น">?</button>
          <button onClick={resetGame} title="เริ่มเกมใหม่">↻</button>
        </div>

        <div className="notice-toast"><span>💬</span><b>{notice}</b></div>

        <nav className="quick-tools" aria-label="เมนูเกม">
          {Object.entries(DRAWERS).map(([key, item]) => (
            <button
              key={key}
              className={drawer === key ? 'active' : ''}
              onClick={() => setDrawer((current) => current === key ? null : key)}
            >
              <span>{item.icon}</span><small>{item.label}</small>
            </button>
          ))}
        </nav>

        <section className="species-dock">
          <div className="dock-label">
            <span>🌱</span>
            <div><small>COMMUNITY NURSERY · LV.{game.upgrades.nursery}</small><b>เลือกต้นกล้า</b></div>
          </div>
          <div className="seedling-buttons">
            {Object.entries(SPECIES).map(([key, species]) => {
              const active = game.selectedSpecies === key
              return (
                <button
                  key={key}
                  className={`seedling-button species-${key} ${active ? 'active' : ''}`}
                  onClick={() => selectSpecies(key)}
                >
                  <span className="seedling-art" aria-hidden="true">
                    <i className="seedling-pot" />
                    <i className="seedling-stem" />
                    <i className="seedling-leaf leaf-left" />
                    <i className="seedling-leaf leaf-right" />
                  </span>
                  <span className="seedling-copy"><b>{species.short}</b><small>{plantingCost(species)} 🪙</small></span>
                  {active && <em>เลือกแล้ว</em>}
                </button>
              )
            })}
          </div>
        </section>

        <section className={`carbon-console ${mrvActive ? 'flying' : ''}`}>
          <div className="carbon-orb">{mrvActive ? '🚁' : '💠'}</div>
          <div>
            <small>ESTIMATED CARBON</small>
            <b>{game.estimatedCarbon.toFixed(1)} <span>tCO₂e</span></b>
            <em>MRV cost {mrvCost} 🪙</em>
          </div>
          <button onClick={verifyCarbon} disabled={mrvActive || game.estimatedCarbon < 5}>
            {mrvActive ? 'กำลังบินสำรวจ…' : 'ส่ง Drone MRV'}
          </button>
        </section>

        {currentPlot && (
          <section className={`plot-popover stage-${stageFor(currentPlot)}`}>
            <button className="popover-close" onClick={() => setSelectedPlot(null)}>×</button>
            <div className="plot-number">#{String(currentPlot.id).padStart(2, '0')}</div>
            <div className="plot-heading">
              <span>{currentPlot.species ? SPECIES[currentPlot.species].icon : '🟤'}</span>
              <div>
                <small>{currentPlot.tide} / {currentPlot.soil}</small>
                <b>{currentPlot.species ? SPECIES[currentPlot.species].name : 'แปลงพร้อมปลูก'}</b>
              </div>
            </div>
            <div className="plot-facts">
              <span>Fit <b>{fit}/2 · {fitLabel}</b></span>
              {currentPlot.species && <span>อายุ <b>{currentPlot.age} วัน</b></span>}
              {currentPlot.species && <span>สุขภาพ <b>{Math.round(currentPlot.health)}%</b></span>}
              <span>สถานะ <b>{stageLabel(currentPlot)}</b></span>
            </div>
            {currentPlot.species && !currentPlot.dead && currentPlot.health < 98 && (
              <button className="plot-action" onClick={() => maintainPlot(currentPlot.id)}>🧤 ดูแลแปลง · 35 🪙</button>
            )}
            {currentPlot.dead && (
              <button className="plot-action danger" onClick={() => clearPlot(currentPlot.id)}>🧹 เตรียมปลูกใหม่ · 20 🪙</button>
            )}
            {!currentPlot.species && <p>เลือกพันธุ์จาก Nursery แล้วคลิกแปลงนี้อีกครั้ง</p>}
          </section>
        )}

        {drawer && (
          <GameDrawer
            drawer={drawer}
            game={game}
            metrics={metrics}
            achievements={achievements}
            completionRequirements={completionRequirements}
            marketTrend={marketTrend}
            needsEmergencyGrant={needsEmergencyGrant}
            onClose={() => setDrawer(null)}
            onUpgrade={upgrade}
            onClaimChapter={claimChapter}
            onSellCredit={sellCredit}
            onEmergencyGrant={claimEmergencyGrant}
          />
        )}

        <div className="simulation-note">ค่าคาร์บอนและผลประโยชน์เป็นกลไกจำลองสำหรับเกม ไม่ใช่การคำนวณเครดิตจริง</div>
      </main>

      {game.event && (
        <div className="game-modal-backdrop event-weather">
          <div className="event-card wooden-panel">
            <div className="event-illustration"><span>{game.event.icon}</span></div>
            <small>{game.event.eyebrow}</small>
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
        <div className="game-modal-backdrop tutorial-scene">
          <div className="tutorial-card wooden-panel">
            <div className="tutorial-dots">
              {TUTORIAL.map((_, index) => <span className={index <= tutorialStep ? 'active' : ''} key={index} />)}
            </div>
            <div className="tutorial-art">{TUTORIAL[tutorialStep].icon}</div>
            <small>HOW TO PLAY · {tutorialStep + 1}/{TUTORIAL.length}</small>
            <h2>{TUTORIAL[tutorialStep].title}</h2>
            <p>{TUTORIAL[tutorialStep].text}</p>
            <div className="tutorial-actions">
              <button className="text-button" onClick={finishTutorial}>ข้าม</button>
              {tutorialStep < TUTORIAL.length - 1 ? (
                <button className="primary-game-button" onClick={() => setTutorialStep((step) => step + 1)}>ถัดไป ›</button>
              ) : (
                <button className="primary-game-button" onClick={finishTutorial}>เริ่มเล่น</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="game-modal-backdrop completion-scene">
          <div className="completion-card wooden-panel">
            <div className="completion-rays" />
            <div className="completion-trophy">🏆</div>
            <small>LIVING COAST RESTORED</small>
            <h2>โครงการฟื้นฟูสำเร็จ</h2>
            <p>พื้นที่มีทั้ง Carbon Value และ Non-carbon Benefit ผ่านเงื่อนไขหลักครบแล้ว</p>
            <div className="grade-medal"><span>PROJECT GRADE</span><b>{projectGrade}</b></div>
            <div className="completion-grid">
              <span><b>{metrics.verified.toFixed(1)}</b>tCO₂e verified</span>
              <span><b>{metrics.survivalRate}%</b>survival</span>
              <span><b>{metrics.impactScore}</b>impact</span>
              <span><b>Day {game.day}</b>completed</span>
            </div>
            <div className="completion-actions">
              <button onClick={() => setShowCompletion(false)}>เล่น Sandbox ต่อ</button>
              <button className="primary-game-button" onClick={resetGame}>เริ่มโครงการใหม่</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourcePill({ icon, value, label, cyan = false }) {
  return (
    <div className={`resource-pill ${cyan ? 'cyan' : ''}`}>
      <span>{icon}</span><b>{value}</b><small>{label}</small>
      <i>＋</i>
    </div>
  )
}

function ImpactMeter({ icon, label, value }) {
  const safe = clamp(value)
  return (
    <div className="impact-meter">
      <div><span>{icon}</span><b>{label}</b><strong>{Math.round(value)}</strong></div>
      <div className="impact-track"><i style={{ width: `${safe}%` }} /></div>
    </div>
  )
}

function GameDrawer({
  drawer,
  game,
  metrics,
  achievements,
  completionRequirements,
  marketTrend,
  needsEmergencyGrant,
  onClose,
  onUpgrade,
  onClaimChapter,
  onSellCredit,
  onEmergencyGrant,
}) {
  return (
    <aside className="game-drawer wooden-panel">
      <button className="drawer-close" onClick={onClose}>×</button>

      {drawer === 'missions' && (
        <>
          <div className="drawer-title"><span>📜</span><div><small>RESTORATION STORY</small><h2>ภารกิจและเป้าหมาย</h2></div></div>
          <div className="chapter-list">
            {CHAPTERS.map((chapter) => {
              const ready = chapter.ready(metrics)
              const claimed = game.claimedChapters.includes(chapter.id)
              return (
                <article className={`chapter-card ${claimed ? 'claimed' : ready ? 'ready' : ''}`} key={chapter.id}>
                  <span>{claimed ? '✓' : ready ? '!' : '○'}</span>
                  <div><b>{chapter.title}</b><small>{chapter.goal}</small></div>
                  {ready && !claimed && <button onClick={() => onClaimChapter(chapter.id)}>รับรางวัล</button>}
                  {claimed && <em>รับแล้ว</em>}
                </article>
              )
            })}
          </div>
          <h3 className="drawer-subtitle">Living Coast Standard</h3>
          <div className="requirement-list">
            {completionRequirements.map((item) => {
              const done = item.value >= item.target
              const value = Number.isInteger(item.value) ? item.value : item.value.toFixed(1)
              return (
                <div className={done ? 'done' : ''} key={item.label}>
                  <span>{done ? '✓' : '○'} {item.label}</span>
                  <b>{value}/{item.target}{item.unit}</b>
                </div>
              )
            })}
          </div>
          <h3 className="drawer-subtitle">ตราความสำเร็จ</h3>
          <div className="achievement-grid">
            {achievements.map((item) => (
              <div className={item.done ? 'done' : ''} key={item.label}><span>{item.icon}</span><b>{item.label}</b></div>
            ))}
          </div>
        </>
      )}

      {drawer === 'upgrades' && (
        <>
          <div className="drawer-title"><span>🛠️</span><div><small>PROJECT UPGRADES</small><h2>พัฒนาพื้นที่</h2></div></div>
          <p className="drawer-intro">อาคาร ทีมงาน และเทคโนโลยีจะแสดงเพิ่มขึ้นในโลก 3D เมื่ออัปเกรด</p>
          <div className="upgrade-list">
            {Object.entries(UPGRADES).map(([key, item]) => {
              const level = game.upgrades[key]
              const cost = upgradeCost(key, level)
              return (
                <article className="upgrade-item" key={key}>
                  <div className="upgrade-art">{item.icon}</div>
                  <div><small>LV.{level}/3</small><b>{item.name}</b><span>{item.description}</span></div>
                  <button onClick={() => onUpgrade(key)} disabled={level >= 3}>{level >= 3 ? 'MAX' : `${cost} 🪙`}</button>
                </article>
              )
            })}
          </div>
          {needsEmergencyGrant && (
            <div className="emergency-card">
              <span>🛟</span><div><b>ทุนฟื้นฟูฉุกเฉิน</b><small>ใช้ได้หนึ่งครั้งเพื่อป้องกันเกมติดทางตัน</small></div>
              <button onClick={onEmergencyGrant}>รับ +220 🪙</button>
            </div>
          )}
        </>
      )}

      {drawer === 'market' && (
        <>
          <div className="drawer-title"><span>💠</span><div><small>BLUE CARBON MARKET</small><h2>ตลาดเครดิต</h2></div></div>
          <div className="market-hero">
            <span>ราคาปัจจุบัน</span>
            <b>{game.marketPrice} <small>🪙 / credit</small></b>
            <em className={marketTrend >= 0 ? 'up' : 'down'}>{marketTrend >= 0 ? '▲' : '▼'} {Math.abs(marketTrend)} วันนี้</em>
          </div>
          <div className="market-inventory">
            <span>เครดิตที่ถือ</span><b>{game.credits.toFixed(1)} tCO₂e</b>
            <small>Verified สะสมทั้งหมด {game.stats.verified.toFixed(1)} tCO₂e</small>
          </div>
          <div className="market-buttons">
            <button onClick={() => onSellCredit(1)}>ขาย 1 เครดิต</button>
            <button onClick={() => onSellCredit(5)}>ขาย 5 เครดิต</button>
            <button className="sell-all" onClick={() => onSellCredit('all')}>ขายทั้งหมด</button>
          </div>
          <p className="market-note">ราคาตลาดเปลี่ยนเมื่อจบแต่ละวัน ผู้เล่นเลือกถือเครดิตหรือขายเพื่อลงทุนต่อได้</p>
        </>
      )}

      {drawer === 'log' && (
        <>
          <div className="drawer-title"><span>📒</span><div><small>FIELD JOURNAL</small><h2>บันทึกโครงการ</h2></div></div>
          <div className="journal-summary">
            <span><b>{game.stats.planted}</b>ปลูกทั้งหมด</span>
            <span><b>{game.stats.maintenance}</b>ครั้งที่ดูแล</span>
            <span><b>{game.stats.mrvRuns}</b>รอบ MRV</span>
            <span><b>{game.stats.sold.toFixed(0)}</b>เครดิตที่ขาย</span>
          </div>
          <div className="journal-list">
            {game.log.map((item, index) => (
              <article key={`${item.day}-${index}-${item.text}`}>
                <span>{item.icon}</span><div><b>{item.text}</b><small>DAY {item.day}</small></div>
              </article>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

export default App3D
