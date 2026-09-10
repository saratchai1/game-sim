import { useEffect, useMemo, useState } from 'react'
import MangroveWorld3D from './MangroveWorld3D.jsx'
import {
  CHAPTERS,
  EVENTS,
  PLOT_BLUEPRINT,
  SPECIES,
  UPGRADE_DEFS,
  clamp,
  createInitialGame,
  deriveGame,
  getPlotBlueprint,
  impactScore,
  loadGame,
  plantingCost,
  projectGrade,
  saveGame,
  stageFor,
  stageLabel,
  suitability,
  tidePhase,
  verificationCost,
  weatherForDay,
} from './gameModel.js'

const TUTORIAL_KEY = 'mangrove-bay-3d-tutorial-seen'

function addLog(state, icon, text) {
  return {
    ...state,
    log: [{ day: state.day, icon, text }, ...(state.log || [])].slice(0, 10),
  }
}

function metricTone(value) {
  if (value >= 65) return 'good'
  if (value >= 35) return 'mid'
  return 'low'
}

export default function App3D() {
  const [game, setGame] = useState(loadGame)
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [notice, setNotice] = useState('เลือกพันธุ์ไม้ด้านล่าง แล้วคลิกวงปลูกบนพื้นที่ 3D')
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(TUTORIAL_KEY) !== 'yes'
  })
  const [showFinish, setShowFinish] = useState(false)

  useEffect(() => saveGame(game), [game])

  const derived = useMemo(() => deriveGame(game), [game])
  const selected = game.plots.find((plot) => plot.id === selectedPlot) || null
  const selectedBlueprint = selected ? getPlotBlueprint(selected.id) : null
  const currentChapter = CHAPTERS.find((chapter) => !game.claimedChapters.includes(chapter.id)) || CHAPTERS.at(-1)
  const chapterComplete = currentChapter.complete(game, derived)
  const chapterProgress = currentChapter.progress(game, derived)
  const worldGame = {
    ...game,
    tide: tidePhase(game.day),
    weather: game.event?.id === 'storm' ? 'storm' : game.weather,
  }

  useEffect(() => {
    if (derived.campaignComplete && !game.completed) {
      setGame((current) => addLog({ ...current, completed: true }, '★', 'โครงการผ่าน Living Coast Standard แล้ว'))
      setShowFinish(true)
    }
  }, [derived.campaignComplete, game.completed])

  const chooseSpecies = (speciesId) => {
    setGame((current) => ({ ...current, selectedSpecies: speciesId }))
    setNotice(`เลือก${SPECIES[speciesId].name}แล้ว · คลิกวงปลูกบนพื้นที่`)
  }

  const plant = (plotId) => {
    setGame((current) => {
      if (current.event) {
        setNotice('จัดการเหตุการณ์ปัจจุบันก่อนเริ่มงานปลูก')
        return current
      }
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot || plot.species) return current
      const species = SPECIES[current.selectedSpecies]
      const cost = plantingCost(current, current.selectedSpecies)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ ลองขายเครดิตหรืออัปเกรด Nursery')
        return current
      }
      const fit = suitability(plotId, current.selectedSpecies)
      const health = fit === 2 ? 95 : fit === 1 ? 82 : 66
      const next = {
        ...current,
        coins: current.coins - cost,
        biodiversity: clamp(current.biodiversity + (fit === 2 ? 0.7 : 0.25)),
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: current.selectedSpecies, age: 0, health, dead: false }
          : item),
        stats: { ...current.stats, planted: current.stats.planted + 1 },
      }
      const blueprint = getPlotBlueprint(plotId)
      setNotice(`ปลูก${species.short}ในแปลง ${plotId} · ความเหมาะสม ${fit}/2`)
      return addLog(next, '✦', `ปลูก${species.short}ในโซน${blueprint.tide}/${blueprint.soil}`)
    })
  }

  const clearPlot = (plotId) => {
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === plotId)
      if (!plot?.dead) return current
      if (current.coins < 20) {
        setNotice('ต้องใช้ 20 เหรียญเพื่อฟื้นฟูหน้าดินและเตรียมปลูกใหม่')
        return current
      }
      const next = {
        ...current,
        coins: current.coins - 20,
        plots: current.plots.map((item) => item.id === plotId
          ? { ...item, species: null, age: 0, health: 100, dead: false }
          : item),
      }
      setNotice(`เตรียมแปลง ${plotId} ใหม่แล้ว`)
      return addLog(next, '↻', `ฟื้นฟูหน้าดินแปลง ${plotId} เพื่อปลูกใหม่`)
    })
  }

  const careForSelected = () => {
    if (!selected?.species || selected.dead) return
    setGame((current) => {
      const plot = current.plots.find((item) => item.id === selected.id)
      if (!plot || current.coins < 22) {
        setNotice('ต้องใช้ 22 เหรียญสำหรับทีมดูแลต้นไม้')
        return current
      }
      const boost = 16 + current.upgrades.community * 3
      const next = {
        ...current,
        coins: current.coins - 22,
        community: clamp(current.community + 0.8),
        plots: current.plots.map((item) => item.id === selected.id
          ? { ...item, health: clamp(item.health + boost) }
          : item),
        stats: { ...current.stats, cared: current.stats.cared + 1 },
      }
      setNotice(`ทีมชุมชนดูแลแปลง ${selected.id} · สุขภาพ +${boost}`)
      return addLog(next, '♥', `บำรุงและตรวจสุขภาพต้นไม้แปลง ${selected.id}`)
    })
  }

  const nextDay = () => {
    setGame((current) => {
      if (current.event) {
        setNotice('ต้องตัดสินใจเหตุการณ์ปัจจุบันก่อนจบวัน')
        return current
      }

      let carbonGain = 0
      let biodiversityGain = 0
      let coastalGain = 0
      let newDeaths = 0
      let newMature = 0
      const tomorrow = current.day + 1
      const tomorrowWeather = weatherForDay(tomorrow)

      const plots = current.plots.map((plot) => {
        if (!plot.species || plot.dead) return plot
        const species = SPECIES[plot.species]
        const fit = suitability(plot.id, plot.species)
        const previousStage = stageFor(plot)
        const age = plot.age + 1
        const random = Math.random() * 4 - 2
        const weatherEffect = tomorrowWeather === 'rain' ? 1.25 : tomorrowWeather === 'breeze' ? 0.35 : 0
        const healthDelta = fit === 2 ? 1.9 : fit === 1 ? -0.55 : -4.2
        const health = clamp(plot.health + healthDelta + random + weatherEffect)
        const dead = health <= 5
        if (dead) newDeaths += 1

        const stageFactor = age < 2 ? 0.28 : age < 6 ? 0.64 : 1
        if (!dead) {
          carbonGain += species.carbon * stageFactor * (health / 100)
          biodiversityGain += species.biodiversity * stageFactor * 0.2
          coastalGain += (plot.species === 'rhizophora' ? 0.16 : 0.1) * stageFactor
          if (previousStage !== 'mature' && age >= 6) newMature += 1
        }
        return { ...plot, age, health, dead }
      })

      const communityIncome = 7
        + current.upgrades.community * 6
        + (current.community >= 35 ? 5 : 0)
      const nextPrice = clamp(current.marketPrice + Math.floor(Math.random() * 11) - 5, 58, 124)
      const shouldTriggerEvent = tomorrow % 4 === 0
      const event = shouldTriggerEvent
        ? EVENTS[Math.floor(Math.random() * EVENTS.length)]
        : null

      let next = {
        ...current,
        day: tomorrow,
        coins: current.coins + communityIncome,
        weather: tomorrowWeather,
        plots,
        estimatedCarbon: current.estimatedCarbon + carbonGain,
        biodiversity: clamp(current.biodiversity + biodiversityGain),
        community: clamp(current.community + current.upgrades.community * 0.15),
        coastal: clamp(current.coastal + coastalGain),
        marketPrice: nextPrice,
        marketHistory: [...current.marketHistory, nextPrice].slice(-12),
        event,
        stats: { ...current.stats, dead: current.stats.dead + newDeaths },
      }
      next = addLog(next, '☀', `Day ${tomorrow} · Carbon +${carbonGain.toFixed(1)} tCO₂e · รายได้ชุมชน +${communityIncome}`)
      if (newMature) next = addLog(next, '♣', `ต้นไม้ ${newMature} ต้นเติบโตเต็มที่`)
      if (newDeaths) next = addLog(next, '!', `มีต้นไม้ไม่รอด ${newDeaths} ต้น ตรวจความเหมาะสมของพื้นที่`)
      setNotice(event ? 'มีเหตุการณ์ใหม่เกิดขึ้นในพื้นที่' : `เข้าสู่ Day ${tomorrow} · ${tidePhase(tomorrow)}`)
      return next
    })
  }

  const verifyCarbon = () => {
    setGame((current) => {
      const cost = verificationCost(current)
      if (current.estimatedCarbon < 3) {
        setNotice('ต้องมี Estimated Carbon อย่างน้อย 3 tCO₂e ก่อนส่งตรวจ')
        return current
      }
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญสำหรับ Drone + Field MRV`)
        return current
      }
      const factor = Math.min(0.995, 0.86 + current.upgrades.drone * 0.025 + Math.random() * 0.06)
      const issued = current.estimatedCarbon * factor
      let next = {
        ...current,
        coins: current.coins - cost,
        estimatedCarbon: 0,
        credits: current.credits + issued,
        community: clamp(current.community + 1.4),
        stats: { ...current.stats, verified: current.stats.verified + issued },
      }
      next = addLog(next, '◇', `MRV ผ่าน · ออกเครดิต ${issued.toFixed(1)} tCO₂e (${Math.round(factor * 100)}%)`)
      setNotice(`Verified ${issued.toFixed(1)} tCO₂e · เครดิตพร้อมถือหรือขาย`)
      return next
    })
  }

  const sellCredit = (amount) => {
    setGame((current) => {
      const sellable = amount === 'all'
        ? current.credits
        : Math.min(Number(amount), current.credits)
      if (sellable <= 0.001) {
        setNotice('ยังไม่มี Verified Carbon Credit สำหรับขาย')
        return current
      }
      const revenue = Math.round(sellable * current.marketPrice)
      let next = {
        ...current,
        coins: current.coins + revenue,
        credits: Math.max(0, current.credits - sellable),
        stats: { ...current.stats, sold: current.stats.sold + sellable },
      }
      next = addLog(next, '◆', `ขาย ${sellable.toFixed(1)} เครดิต ได้ ${revenue} เหรียญ`)
      setNotice(`ขายเครดิตแล้ว · รายรับ +${revenue} เหรียญ`)
      return next
    })
  }

  const buyUpgrade = (upgradeId) => {
    setGame((current) => {
      const level = current.upgrades[upgradeId]
      const definition = UPGRADE_DEFS[upgradeId]
      if (level >= 3) {
        setNotice(`${definition.name} ถึงระดับสูงสุดแล้ว`)
        return current
      }
      const cost = definition.costs[level]
      if (current.coins < cost) {
        setNotice(`ต้องใช้ ${cost} เหรียญสำหรับอัปเกรดนี้`)
        return current
      }
      const next = {
        ...current,
        coins: current.coins - cost,
        community: clamp(current.community + (upgradeId === 'community' ? 4 : 1)),
        coastal: clamp(current.coastal + (upgradeId === 'drone' ? 1 : 0)),
        upgrades: { ...current.upgrades, [upgradeId]: level + 1 },
      }
      setNotice(`${definition.name} อัปเกรดเป็น Lv.${level + 1}`)
      return addLog(next, definition.icon, `${definition.name} อัปเกรดเป็นระดับ ${level + 1}`)
    })
  }

  const resolveEvent = (choiceKey) => {
    setGame((current) => {
      const event = current.event
      if (!event) return current
      const choice = event.choices.find((item) => item.key === choiceKey)
      if (!choice || current.coins < choice.cost) {
        setNotice('เหรียญไม่พอสำหรับตัวเลือกนี้')
        return current
      }

      let next = { ...current, coins: current.coins - choice.cost, event: null }
      let text = ''

      if (event.id === 'storm') {
        const damage = choiceKey === 'protect' ? 4 : 15
        let newDeaths = 0
        next.plots = current.plots.map((plot) => {
          if (!plot.species || plot.dead || plot.age >= 6) return plot
          const health = clamp(plot.health - damage)
          const dead = health <= 5
          if (dead) newDeaths += 1
          return { ...plot, health, dead }
        })
        next.stats = { ...current.stats, dead: current.stats.dead + newDeaths }
        next.coastal = clamp(current.coastal + (choiceKey === 'protect' ? 4 : -1))
        text = choiceKey === 'protect'
          ? 'เสริมแนวป้องกันก่อนมรสุม ต้นอ่อนเสียหายน้อยลง'
          : 'ปล่อยพื้นที่รับมรสุมตามธรรมชาติ ต้นอ่อนสูญเสียสุขภาพ'
      }

      if (event.id === 'trash') {
        next.biodiversity = clamp(current.biodiversity + (choiceKey === 'clean' ? 6 : -5))
        if (choiceKey === 'clean') next.community = clamp(current.community + 4)
        text = choiceKey === 'clean'
          ? 'ชุมชนเก็บขยะออกจากแนวรากและร่องน้ำ'
          : 'ขยะยังสะสมในพื้นที่ Biodiversity ลดลง'
      }

      if (event.id === 'nursery') {
        if (choiceKey === 'invest') {
          const currentLevel = current.upgrades.nursery
          if (currentLevel < 3) next.upgrades = { ...current.upgrades, nursery: currentLevel + 1 }
          next.community = clamp(current.community + 6)
          text = currentLevel < 3
            ? `ขยาย Community Nursery เป็น Lv.${currentLevel + 1}`
            : 'Nursery เต็มระดับแล้ว เงินลงทุนเปลี่ยนเป็นกองทุนต้นกล้าชุมชน'
        } else {
          text = 'เก็บข้อเสนอขยาย Nursery ไว้พิจารณารอบหน้า'
        }
      }

      if (event.id === 'wildlife') {
        next.biodiversity = clamp(current.biodiversity + 7)
        text = 'บันทึกการกลับมาของปูและปลา Biodiversity +7'
      }

      if (event.id === 'fisher') {
        if (choiceKey === 'support') {
          next.community = clamp(current.community + 7)
          next.coastal = clamp(current.coastal + 4)
          next.biodiversity = clamp(current.biodiversity + 2)
          text = 'ตั้งเขตอนุบาลสัตว์น้ำร่วมกับกลุ่มประมงชุมชน'
        } else {
          next.community = clamp(current.community + 2)
          next.biodiversity = clamp(current.biodiversity + 1)
          text = 'เริ่มติดตามเขตอนุบาลด้วยทีมอาสาสมัคร'
        }
      }

      if (event.id === 'erosion') {
        next.coastal = clamp(current.coastal + (choiceKey === 'barrier' ? 8 : -4))
        if (choiceKey === 'barrier') next.community = clamp(current.community + 1)
        text = choiceKey === 'barrier'
          ? 'สร้างแนวชะลอคลื่นและติดตามการสะสมตะกอน'
          : 'เลือกติดตามต่อ การกัดเซาะทำให้ Coastal resilience ลดลง'
      }

      setNotice(text)
      return addLog(next, event.icon, text)
    })
  }

  const claimChapter = () => {
    setGame((current) => {
      const liveDerived = deriveGame(current)
      const chapter = CHAPTERS.find((item) => !current.claimedChapters.includes(item.id))
      if (!chapter || !chapter.complete(current, liveDerived)) return current
      const next = {
        ...current,
        coins: current.coins + chapter.reward,
        claimedChapters: [...current.claimedChapters, chapter.id],
      }
      setNotice(`ผ่านบท “${chapter.title}” · รับ ${chapter.reward} เหรียญ`)
      return addLog(next, '★', `ผ่านบท ${chapter.title} และรับรางวัล ${chapter.reward} เหรียญ`)
    })
  }

  const takeRecoveryGrant = () => {
    setGame((current) => {
      if (current.recoveryUsed || current.coins >= 60) return current
      const next = { ...current, coins: current.coins + 220, recoveryUsed: true }
      setNotice('รับทุนฟื้นฟูฉุกเฉิน 220 เหรียญแล้ว')
      return addLog(next, '+', 'รับทุนฟื้นฟูฉุกเฉินเพื่อดำเนินโครงการต่อ')
    })
  }

  const resetGame = () => {
    if (typeof window !== 'undefined' && !window.confirm('เริ่มโครงการใหม่และลบเซฟปัจจุบันหรือไม่?')) return
    setGame(createInitialGame())
    setSelectedPlot(null)
    setActivePanel(null)
    setShowFinish(false)
    setNotice('เริ่มโครงการใหม่แล้ว · เลือกพันธุ์ไม้เพื่อเริ่มปลูก')
  }

  const closeWelcome = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(TUTORIAL_KEY, 'yes')
    setShowWelcome(false)
  }

  const continueSandbox = () => {
    setGame((current) => ({ ...current, sandbox: true }))
    setShowFinish(false)
    setNotice('เข้าสู่ Sandbox · ฟื้นฟูและขยายผลต่อได้ไม่จำกัด')
  }

  return (
    <div className="game3d-app">
      <MangroveWorld3D
        game={worldGame}
        selectedPlot={selectedPlot}
        selectedSpecies={game.selectedSpecies}
        onPlant={plant}
        onClear={clearPlot}
        onSelectPlot={setSelectedPlot}
      />

      <header className="hud-top">
        <div className="game-brand" aria-label="Mangrove Bay">
          <div className="brand-emblem"><span>♣</span></div>
          <div>
            <strong>MANGROVE BAY</strong>
            <small>BLUE CARBON RESTORATION</small>
          </div>
        </div>

        <div className="resource-rack">
          <ResourcePill symbol="◉" label="เหรียญ" value={Math.round(game.coins)} tone="coin" />
          <ResourcePill symbol="◆" label="เครดิต" value={`${game.credits.toFixed(1)} t`} tone="carbon" />
          <ResourcePill symbol="☀" label="เวลา" value={`Day ${game.day}`} tone="day" />
          <ResourcePill symbol="≈" label="น้ำ" value={tidePhase(game.day)} tone="tide" />
        </div>

        <div className="header-actions">
          <button className="round-hud-button" onClick={() => setShowWelcome(true)} aria-label="วิธีเล่น">?</button>
          <button className="round-hud-button" onClick={resetGame} aria-label="เริ่มเกมใหม่">↻</button>
        </div>
      </header>

      <section className="chapter-float">
        <div className="chapter-kicker">CHAPTER {currentChapter.id + 1} / {CHAPTERS.length}</div>
        <div className="chapter-row">
          <div>
            <strong>{currentChapter.title}</strong>
            <span>{currentChapter.text}</span>
          </div>
          {chapterComplete && (
            <button onClick={claimChapter}>รับ {currentChapter.reward}</button>
          )}
        </div>
        <div className="chapter-track"><span style={{ width: `${chapterProgress * 100}%` }} /></div>
      </section>

      <div className="impact-orbs" aria-label="Project impact">
        <ImpactOrb symbol="✿" label="Nature" value={game.biodiversity} tone={metricTone(game.biodiversity)} />
        <ImpactOrb symbol="●" label="People" value={game.community} tone={metricTone(game.community)} />
        <ImpactOrb symbol="≈" label="Coast" value={game.coastal} tone={metricTone(game.coastal)} />
      </div>

      <nav className="action-dock" aria-label="เมนูโครงการ">
        <DockButton symbol="▦" label="ภาพรวม" active={activePanel === 'overview'} onClick={() => setActivePanel(activePanel === 'overview' ? null : 'overview')} />
        <DockButton symbol="◇" label="MRV" active={activePanel === 'mrv'} onClick={() => setActivePanel(activePanel === 'mrv' ? null : 'mrv')} badge={game.estimatedCarbon >= 3} />
        <DockButton symbol="◆" label="ตลาด" active={activePanel === 'market'} onClick={() => setActivePanel(activePanel === 'market' ? null : 'market')} />
        <DockButton symbol="↑" label="อัปเกรด" active={activePanel === 'upgrades'} onClick={() => setActivePanel(activePanel === 'upgrades' ? null : 'upgrades')} />
        <DockButton symbol="✓" label="เป้าหมาย" active={activePanel === 'goals'} onClick={() => setActivePanel(activePanel === 'goals' ? null : 'goals')} />
      </nav>

      {selected && selectedBlueprint && (
        <section className="selected-plot-card">
          <button className="selected-close" onClick={() => setSelectedPlot(null)} aria-label="ปิด">×</button>
          <div className="plot-number">PLOT {String(selected.id).padStart(2, '0')}</div>
          {selected.species ? (
            <>
              <strong>{SPECIES[selected.species].name}</strong>
              <span>{stageLabel(selected)} · อายุ {selected.age} วัน · สุขภาพ {Math.round(selected.health)}%</span>
              <div className="selected-health"><i style={{ width: `${selected.health}%` }} /></div>
              <div className="plot-facts">
                <span>น้ำ <b>{selectedBlueprint.tide}</b></span>
                <span>ดิน <b>{selectedBlueprint.soil}</b></span>
                <span>Fit <b>{suitability(selected.id, selected.species)}/2</b></span>
              </div>
              {!selected.dead && <button className="care-button" onClick={careForSelected}>ส่งทีมดูแล · 22 ◉</button>}
              {selected.dead && <small>คลิกต้นแห้งอีกครั้งเพื่อเตรียมแปลงใหม่ · 20 ◉</small>}
            </>
          ) : (
            <>
              <strong>พื้นที่พร้อมปลูก</strong>
              <span>โซน{selectedBlueprint.tide} · {selectedBlueprint.soil}</span>
            </>
          )}
        </section>
      )}

      {activePanel && (
        <GameDrawer
          panel={activePanel}
          game={game}
          derived={derived}
          onClose={() => setActivePanel(null)}
          onVerify={verifyCarbon}
          onSell={sellCredit}
          onUpgrade={buyUpgrade}
          onClaim={claimChapter}
          currentChapter={currentChapter}
          chapterComplete={chapterComplete}
          onRecovery={takeRecoveryGrant}
        />
      )}

      <div className="notice-toast" role="status"><span>●</span>{notice}</div>

      <footer className="nursery-dock">
        <div className="nursery-heading">
          <span>NURSERY</span>
          <strong>เลือกพันธุ์ไม้</strong>
          <small>Lv.{game.upgrades.nursery}</small>
        </div>
        <div className="species-rack">
          {Object.values(SPECIES).map((species) => (
            <button
              key={species.id}
              className={`species-button species-${species.id} ${game.selectedSpecies === species.id ? 'active' : ''}`}
              onClick={() => chooseSpecies(species.id)}
            >
              <span className="species-miniature" aria-hidden="true"><i /><b /><em /></span>
              <span className="species-name"><b>{species.short}</b><small>{species.trait}</small></span>
              <span className="species-price">{plantingCost(game, species.id)}<small>◉</small></span>
            </button>
          ))}
        </div>
        <button className="next-day-button" onClick={nextDay}>
          <span><small>ดำเนินโครงการ</small>จบวันนี้</span>
          <b>DAY {game.day + 1}</b>
        </button>
      </footer>

      {game.event && (
        <div className="modal-backdrop">
          <section className="event-card" role="dialog" aria-modal="true" aria-labelledby="event-title">
            <div className="event-symbol">{game.event.icon}</div>
            <div className="event-category">{game.event.category} EVENT</div>
            <h2 id="event-title">{game.event.title}</h2>
            <p>{game.event.text}</p>
            <div className="event-choices">
              {game.event.choices.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => resolveEvent(choice.key)}
                  disabled={game.coins < choice.cost}
                >
                  <span><b>{choice.label}</b><small>{choice.hint}</small></span>
                  <i>›</i>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {showWelcome && (
        <div className="modal-backdrop tutorial-backdrop">
          <section className="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
            <div className="tutorial-scene" aria-hidden="true">
              <span className="tutorial-sun" />
              <span className="tutorial-island" />
              <span className="tutorial-tree tree-a"><i /><b /></span>
              <span className="tutorial-tree tree-b"><i /><b /></span>
              <span className="tutorial-water" />
            </div>
            <div className="tutorial-copy">
              <div className="tutorial-kicker">3D RESTORATION GAME</div>
              <h1 id="tutorial-title">ฟื้นคืนชีวิตให้ Mangrove Bay</h1>
              <p>ปลูกให้เหมาะกับน้ำและดิน ดูแลให้รอด ตรวจ MRV เพื่อออก Carbon Credit และทำให้ธรรมชาติกับชุมชนเติบโตไปพร้อมกัน</p>
              <div className="tutorial-steps">
                <div><b>1</b><span><strong>เลือกพันธุ์</strong><small>ใช้แถบ Nursery ด้านล่าง</small></span></div>
                <div><b>2</b><span><strong>คลิกพื้นที่ 3D</strong><small>วงสีเขียวเหมาะที่สุด</small></span></div>
                <div><b>3</b><span><strong>หมุนและซูม</strong><small>ลากฉากหรือใช้ล้อเมาส์</small></span></div>
              </div>
              <button className="start-button" onClick={closeWelcome}>เริ่มฟื้นฟูพื้นที่ <span>→</span></button>
              <small className="simulation-note">ตัวเลขคาร์บอนและผลกระทบเป็นค่าจำลองสำหรับเกม ไม่ใช่การคำนวณเครดิตจริง</small>
            </div>
          </section>
        </div>
      )}

      {showFinish && (
        <div className="modal-backdrop finish-backdrop">
          <section className="finish-card" role="dialog" aria-modal="true" aria-labelledby="finish-title">
            <div className="grade-seal"><small>PROJECT GRADE</small><strong>{projectGrade(game, derived)}</strong></div>
            <div className="finish-kicker">LIVING COAST STANDARD</div>
            <h2 id="finish-title">Mangrove Bay ฟื้นตัวแล้ว</h2>
            <p>ป่าชายเลนสร้างคาร์บอน ถิ่นอาศัย รายได้ชุมชน และแนวป้องกันชายฝั่งได้อย่างสมดุล</p>
            <div className="finish-stats">
              <span><b>{derived.living}</b>ต้นรอด</span>
              <span><b>{game.stats.verified.toFixed(1)}</b>tCO₂e verified</span>
              <span><b>{impactScore(game)}</b>Impact</span>
            </div>
            <div className="finish-actions">
              <button onClick={continueSandbox}>เล่น Sandbox ต่อ</button>
              <button className="secondary" onClick={resetGame}>เริ่มโครงการใหม่</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ResourcePill({ symbol, label, value, tone }) {
  return (
    <div className={`resource-pill ${tone}`}>
      <span>{symbol}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  )
}

function ImpactOrb({ symbol, label, value, tone }) {
  return (
    <div className={`impact-orb ${tone}`}>
      <div className="impact-ring" style={{ '--progress': `${clamp(value)}%` }}>
        <span>{symbol}</span>
      </div>
      <div><b>{Math.round(value)}</b><small>{label}</small></div>
    </div>
  )
}

function DockButton({ symbol, label, active, onClick, badge }) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick} aria-label={label} title={label}>
      <span>{symbol}</span><small>{label}</small>{badge && <i />}
    </button>
  )
}

function GameDrawer({
  panel,
  game,
  derived,
  onClose,
  onVerify,
  onSell,
  onUpgrade,
  onClaim,
  currentChapter,
  chapterComplete,
  onRecovery,
}) {
  const titles = {
    overview: ['PROJECT DASHBOARD', 'ภาพรวมโครงการ'],
    mrv: ['CARBON PIPELINE', 'Drone + Field MRV'],
    market: ['BLUE CARBON MARKET', 'ตลาดเครดิต'],
    upgrades: ['PROJECT FACILITIES', 'อัปเกรดพื้นที่'],
    goals: ['LIVING COAST', 'เป้าหมายโครงการ'],
  }
  const [eyebrow, title] = titles[panel]

  return (
    <aside className="game-drawer">
      <header>
        <div><small>{eyebrow}</small><h2>{title}</h2></div>
        <button onClick={onClose} aria-label="ปิดแผง">×</button>
      </header>

      {panel === 'overview' && (
        <>
          <div className="drawer-hero-score">
            <div><small>IMPACT SCORE</small><strong>{derived.impact}</strong><span>/100</span></div>
            <b>{derived.impact >= 70 ? 'THRIVING' : derived.impact >= 40 ? 'GROWING' : 'RESTORING'}</b>
          </div>
          <DrawerMetric label="Biodiversity" value={game.biodiversity} icon="✿" />
          <DrawerMetric label="Community" value={game.community} icon="●" />
          <DrawerMetric label="Coastal resilience" value={game.coastal} icon="≈" />
          <div className="overview-grid">
            <span><small>ต้นไม้รอด</small><b>{derived.living}</b></span>
            <span><small>โตเต็มที่</small><b>{derived.mature}</b></span>
            <span><small>Survival</small><b>{derived.survival}%</b></span>
            <span><small>ดูแลแล้ว</small><b>{game.stats.cared}</b></span>
          </div>
          <h3>บันทึกล่าสุด</h3>
          <div className="drawer-log">
            {game.log.slice(0, 5).map((entry, index) => (
              <div key={`${entry.day}-${index}`}><span>{entry.icon}</span><p>{entry.text}<small>DAY {entry.day}</small></p></div>
            ))}
          </div>
        </>
      )}

      {panel === 'mrv' && (
        <>
          <div className="carbon-hero">
            <small>ESTIMATED CARBON</small>
            <strong>{game.estimatedCarbon.toFixed(1)}</strong>
            <span>tCO₂e awaiting verification</span>
          </div>
          <div className="pipeline">
            <span className="done"><i>1</i>ปลูก</span><b>›</b>
            <span className="done"><i>2</i>ติดตาม</span><b>›</b>
            <span className={game.estimatedCarbon >= 3 ? 'ready' : ''}><i>3</i>Verify</span><b>›</b>
            <span><i>4</i>Credit</span>
          </div>
          <div className="mrv-facts">
            <span><small>Drone Lab</small><b>Lv.{game.upgrades.drone}</b></span>
            <span><small>ค่าตรวจ</small><b>{verificationCost(game)} ◉</b></span>
            <span><small>สะสมออกแล้ว</small><b>{game.stats.verified.toFixed(1)} t</b></span>
          </div>
          <button className="drawer-primary" onClick={onVerify} disabled={game.estimatedCarbon < 3 || game.coins < verificationCost(game)}>
            ส่ง Drone + Field ตรวจ MRV <span>{verificationCost(game)} ◉</span>
          </button>
          <p className="drawer-note">Verification factor เป็นกลไกจำลองในเกม และไม่แทนขั้นตอนรับรองโครงการจริง</p>
        </>
      )}

      {panel === 'market' && (
        <>
          <div className="market-price">
            <div><small>ราคาตลาดวันนี้</small><strong>{game.marketPrice}</strong><span>◉ / tCO₂e</span></div>
            <b>{game.marketPrice >= game.marketHistory.at(-2) ? '▲' : '▼'}</b>
          </div>
          <div className="market-chart" aria-label="ประวัติราคา">
            {game.marketHistory.map((value, index) => {
              const min = Math.min(...game.marketHistory)
              const max = Math.max(...game.marketHistory)
              const height = max === min ? 50 : 22 + ((value - min) / (max - min)) * 66
              return <i key={`${value}-${index}`} style={{ height: `${height}%` }} title={`${value}`} />
            })}
          </div>
          <div className="credit-wallet">
            <span><small>เครดิตในบัญชี</small><b>{game.credits.toFixed(1)} tCO₂e</b></span>
            <span><small>ขายสะสม</small><b>{game.stats.sold.toFixed(1)} tCO₂e</b></span>
          </div>
          <div className="market-actions">
            <button onClick={() => onSell(1)} disabled={game.credits < 1}>ขาย 1 เครดิต</button>
            <button onClick={() => onSell('all')} disabled={game.credits <= 0}>ขายทั้งหมด</button>
          </div>
          {game.coins < 60 && !game.recoveryUsed && (
            <button className="recovery-button" onClick={onRecovery}>ขอทุนฟื้นฟูฉุกเฉิน 220 ◉</button>
          )}
        </>
      )}

      {panel === 'upgrades' && (
        <div className="upgrade-list">
          {Object.entries(UPGRADE_DEFS).map(([id, definition]) => {
            const level = game.upgrades[id]
            const max = level >= 3
            const cost = max ? null : definition.costs[level]
            return (
              <article key={id}>
                <div className="upgrade-icon">{definition.icon}</div>
                <div className="upgrade-copy">
                  <div><strong>{definition.name}</strong><span>Lv.{level}/3</span></div>
                  <p>{definition.description}</p>
                  <div className="level-pips">{[1, 2, 3].map((pip) => <i key={pip} className={pip <= level ? 'on' : ''} />)}</div>
                </div>
                <button onClick={() => onUpgrade(id)} disabled={max || game.coins < cost}>
                  {max ? 'MAX' : <>{cost}<small>◉</small></>}
                </button>
              </article>
            )
          })}
        </div>
      )}

      {panel === 'goals' && (
        <>
          <div className="campaign-progress">
            <div><small>OVERALL PROGRESS</small><strong>{Math.round(derived.campaignProgress * 100)}%</strong></div>
            <div className="campaign-track"><span style={{ width: `${derived.campaignProgress * 100}%` }} /></div>
          </div>
          <div className="requirement-list">
            {derived.requirements.map((requirement) => {
              const done = requirement.value >= requirement.target
              return (
                <div key={requirement.key} className={done ? 'done' : ''}>
                  <span>{done ? '✓' : '○'}</span>
                  <div><b>{requirement.label}</b><i style={{ width: `${Math.min(requirement.value / requirement.target, 1) * 100}%` }} /></div>
                  <strong>{requirement.decimals ? requirement.value.toFixed(requirement.decimals) : Math.round(requirement.value)}{requirement.suffix || ''}/{requirement.target}{requirement.suffix || ''}</strong>
                </div>
              )
            })}
          </div>
          <div className="chapter-drawer-card">
            <small>CURRENT CHAPTER</small>
            <strong>{currentChapter.title}</strong>
            <p>{currentChapter.text}</p>
            {chapterComplete && <button onClick={onClaim}>รับรางวัล {currentChapter.reward} ◉</button>}
          </div>
        </>
      )}
    </aside>
  )
}

function DrawerMetric({ label, value, icon }) {
  return (
    <div className="drawer-metric">
      <span>{icon}</span><b>{label}</b><strong>{Math.round(value)}</strong>
      <i><em style={{ width: `${clamp(value)}%` }} /></i>
    </div>
  )
}
