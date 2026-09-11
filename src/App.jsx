import { useEffect, useMemo, useRef, useState } from 'react'
import MangroveWorld3D from './MangroveWorld3D.jsx'
import { rankFor, WILDLIFE, missionFor, claimMission, rewardPlant, discoverWildlife, diversityBonus, reconcileDeaths, restoreGame } from './coast-progression.js'

import { SPECIES, EVENTS, UPGRADE_INFO, STORY_CHAPTERS, createInitialGame, clamp, suitability, getPlantCost, getMrvCost } from './game-data.js'
import { advanceDay } from './game-engine.js'
import { forecastFor, habitatFor, crewLeft, crewAction, crewRule, acceptContract, contractProgress, claimContract, settleRestoration, prepareSoil, stormDamage } from './restoration.js'
import GameIcon from './GameIcon.jsx'
import { RestorationPanel, RestorationModal } from './RestorationPanel.jsx'

const SAVE_KEY = 'mangrove-bay-3d-save-v2'

function safeLoad() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createInitialGame()
    const parsed = JSON.parse(raw)
    const restored = restoreGame(parsed, createInitialGame())
    restored.event = EVENTS.find((event) => event.id === restored.event?.id) || null
    return restored
  } catch {
    return createInitialGame()
  }
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
  const [showHelp, setShowHelp] = useState(() => { try { return !localStorage.getItem('mangrove-bay-3d-help-seen') } catch { return true } })
  const [showUpgrades, setShowUpgrades] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [sandbox, setSandbox] = useState(() => game.journey.sandbox)
  const [showJournal, setShowJournal] = useState(false)
  const [showPlots, setShowPlots] = useState(false)
  const [showEconomy, setShowEconomy] = useState(false)
  const [showRestoration, setShowRestoration] = useState(false)
  const [showDayPlan, setShowDayPlan] = useState(false)
  const [photoMode, setPhotoMode] = useState(false)
  const [cameraReset, setCameraReset] = useState(0)
  const [sound, setSound] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [dayReport, setDayReport] = useState(null)
  const [worldAction, setWorldAction] = useState(null)
  const audioRef = useRef(null)
  const rank = rankFor(game.journey.xp)
  const mission = missionFor(game)
  const forestBonus = diversityBonus(game)
  const habitat = habitatFor(game)
  const forecast = forecastFor(game.day)
  const forecastEvent = EVENTS.find((e) => e.id === forecast.eventId)
  const playChime = () => {
    if (!sound) return
    try {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) return
      const context = audioRef.current || (audioRef.current = new Audio())
      context.resume().catch(() => {})
      ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const start = context.currentTime + index * 0.07
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.055, start + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + 0.3)
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      })
    } catch { /* Sound is optional on browsers without Web Audio. */ }
  }
  useEffect(() => () => { audioRef.current?.close().catch(() => {}); audioRef.current = null }, [])
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setPhotoMode(false); setShowPlots(false); setShowJournal(false); setShowRestoration(false); setShowDayPlan(false)
      setShowEconomy(false); setShowGoals(false); setShowUpgrades(false); setShowLog(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); setSaveError(false) } catch { setSaveError(true) }
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

  useEffect(() => {
    const next = settleRestoration(discoverWildlife(game))
    if (next === game) return
    const names = WILDLIFE.filter((animal) => next.journey.discovered.includes(animal.id) && !game.journey.discovered.includes(animal.id)).map((animal) => animal.name)
    setGame((current) => settleRestoration(discoverWildlife(current)))
    setNotice(names.length ? `ค้นพบ ${names.join(' · ')}! รับทุนสำรวจ +${next.coins - game.coins} เหรียญ` : '✦ ความสำเร็จใหม่! เปิดแผนภาคสนามเพื่อดูสมุดสะสม')
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
      if (current.event || !plot || plot.species) return current
      const speciesKey = current.activeSpecies
      const species = SPECIES[speciesKey]
      const cost = getPlantCost(current, speciesKey)
      if (current.coins < cost) {
        setNotice('เหรียญไม่พอ · ชวนชุมชนเก็บขยะรับ 45 เหรียญ หรือขายเครดิตเพื่อเพิ่มงบ')
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
      next = rewardPlant(next, fit)
      setWorldAction({ type: 'plant', plotId, id: current.stats.planted + 1 })
      next = appendLog(next, `ปลูก${species.short}ในแปลง ${plotId} · ความเหมาะสม ${fit}/2`, 'plant')
      setNotice(fit === 2 ? `ปลูกได้เหมาะมาก! คอมโบ ×${next.journey.combo} · คืนทุน +${next.journey.combo * 4} ● · +16 XP` : `${species.name} · Fit ${fit}/2 · ลองเลือกพันธุ์ให้ตรงน้ำและดินเพื่อรับคอมโบ`)
      return next
    })
    setSelectedPlot(plotId)
  }

  const handlePlotClick = (plotId) => {
    const plot = game.plots.find((item) => item.id === plotId)
    setSelectedPlot(plotId)
    if (game.event) return
    if (plot && !plot.species) setNotice(`แปลง ${plotId} · Fit ${suitability(plot, game.activeSpecies)}/2 · ดูรายละเอียดแล้วกดยืนยันปลูก`)
    else if (plot?.dead) setNotice(`แปลง ${plotId} ต้องเคลียร์พื้นที่ก่อนปลูกใหม่`)
    else if (plot) setNotice(`เลือกแปลง ${plotId} · ${SPECIES[plot.species].name}`)
  }

  const maintainSelected = () => {
    if (!selected?.species || selected.dead) return
    setGame((current) => {
      const target = current.plots.find((p) => p.id === selected.id)
      if (current.event || !target?.species || target.dead || target.health >= 100) return current
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
      if (current.event || !current.plots.find((p) => p.id === selected.id)?.dead) return current
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
    setShowDayPlan(false)
    if (game.event) {
      setNotice('ต้องตัดสินใจเหตุการณ์ปัจจุบันก่อนจบวัน')
      return
    }

    setGame((current) => {
      if (current.event) return current
      const result = advanceDay(current)
      let next = appendLog(result.game, `Day ${result.report.day}: Carbon +${result.report.carbon.toFixed(1)} tCO₂e`, 'day')
      if (result.report.deaths) next = appendLog(next, `ต้นไม้ไม่รอด ${result.report.deaths} ต้น · ตรวจ Fit และสุขภาพ`, 'warning')
      setDayReport(result.report)
      setSelectedPlot(null)
      setNotice(next.event ? 'เหตุการณ์ที่พยากรณ์ไว้มาถึงแล้ว' : `วันใหม่ · ทีมภาคสนามพร้อม 2 งาน · Carbon +${result.report.carbon.toFixed(1)}`)
      return next
    })
  }

  const verifyCarbon = () => {
    setGame((current) => {
      if (current.event) return current
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
      const factor = Math.min(0.97, baseFactor + 0.025)
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
      if (current.event) return current
      const amount = requested === 'all'
        ? current.credits
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
      if (current.event) return current
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
        const damage = stormDamage(current, choiceKey === 'protect')
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
              ? { ...plot, health: clamp(plot.health - stormDamage(current, false, 8)) }
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

      next = reconcileDeaths(current, next)
      if (['storm', 'kingtide'].includes(event.id)) next.expedition = { ...next.expedition, protectionDay: 0 }
      next.journey = { ...next.journey, xp: next.journey.xp + 20 }
      setNotice(text)
      return appendLog(next, text, 'event')
    })
  }

  const handleCrew = (key) => {
    const rule = crewRule(game, key)
    if (!rule.ok) return
    setGame((current) => { const next = crewAction(current, key); return next === current ? current : appendLog(next, `ภาคสนาม: ${rule.name} · ${rule.hint}`, 'care') })
    setWorldAction({ type: key, plotId: key === 'care' ? game.plots.filter((p) => p.species && !p.dead).sort((a,b) => a.health - b.health)[0]?.id : null, id: `${game.day}-${key}` })
    setNotice(`${rule.name}สำเร็จ · ${rule.hint}`); playChime()
  }
  const handleContractClaim = () => {
    const c = contractProgress(game)
    if (!c?.ready || game.event) return
    setGame((current) => claimContract(current))
    setNotice(`ส่งมอบงานสำเร็จ · +${c.coins + c.bonus} เหรียญ · +${c.xp} XP`); playChime()
  }
  const resetGame = () => {
    const fresh = createInitialGame()
    setGame(fresh)
    setSelectedPlot(null)
    setSandbox(false)
    setDayReport(null)
    setCameraReset((v) => v + 1)
    setNotice('เริ่มโครงการใหม่แล้ว · เลือกพันธุ์และคลิกพื้นที่ 3D')
  }

  const closeHelp = () => {
    try { localStorage.setItem('mangrove-bay-3d-help-seen', '1') } catch { /* Session-only mode. */ }
    setShowHelp(false)
  }

  return (
    <div className={`game3d-shell ${photoMode ? 'photo-mode' : ''}`}>
      <MangroveWorld3D
        cameraReset={cameraReset}
        habitat={habitat}
        action={worldAction}
        clean={game.day - game.expedition.cleanDay < 2 && game.expedition.cleanDay > 0}
        protection={game.expedition.protectionDay >= game.day}
        weather={game.event?.id}
        fireflies={WILDLIFE.find((animal) => animal.id === 'firefly').test(game)}
        plots={game.plots}
        selectedPlot={selectedPlot}
        activeSpecies={game.activeSpecies}
        onPlotClick={photoMode ? () => {} : handlePlotClick}
        onClearSelection={() => setSelectedPlot(null)}
        day={game.day}
        upgrades={game.upgrades}
      />

      {photoMode && <button className="photo-exit" onClick={() => setPhotoMode(false)}>← กลับเข้าเกม · Esc</button>}
      <div className="game-ui">
        <header className="top-hud">
          <div className="brand-plaque">
            <span className="brand-emblem">M</span>
            <span>
              <strong>MANGROVE BAY</strong>
              <small>A LITTLE BAY. A BIG COMEBACK.</small>
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
            <button className="next-day-button" onClick={() => setShowDayPlan(true)} disabled={Boolean(game.event)} aria-label="จบวันนี้">
              <span>จบวันนี้</span><b>›</b>
            </button>
          </div>
        </header>

        <aside className="left-stack">
          <section className="ranger-card">
            <span className="ranger-badge">{rank.level}</span>
            <div><small>COAST KEEPER</small><strong>{rank.name}</strong><div className="xp-track"><i style={{ width: `${rank.progress}%` }} /></div><small>{game.journey.xp} / {rank.next?.xp || 'MAX'} XP</small></div>
          </section>
          <section className={`mission-card ${mission.ready ? 'ready' : ''}`}>
            <div className="eyebrow">✧ ภารกิจ {game.journey.mission + 1}<span>+{mission.xp} XP</span></div>
            <h2>{mission.name}</h2><p>{mission.description}</p>
            <div className="mission-progress"><i style={{ width: `${Math.min(100, mission.value / mission.goal * 100)}%` }} /></div>
            <div className="mission-bottom"><span>{Math.floor(mission.value)} / {mission.goal}</span><b>+{mission.coins} ●</b></div>
            <button disabled={Boolean(game.event) || mission.recurring && game.journey.deliveryDay === game.day} onClick={() => {
              if (game.event) return
              if (!mission.ready) {
                if ([0, 1, 5].includes(game.journey.mission)) setShowPlots(true)
                else if (game.journey.mission === 2) setShowRestoration(true)
                else if (game.journey.mission === 4) setShowUpgrades(true)
                else setShowEconomy(true)
                return
              }
              setGame((current) => { const next = claimMission(current); return next === current ? current : appendLog(next, `ภารกิจสำเร็จ: ${missionFor(current).name}`, 'reward') })
              setNotice(`ภารกิจสำเร็จ · +${mission.coins} เหรียญ · +${mission.xp} XP`); playChime()
            }}>{mission.ready ? 'รับรางวัล ✦' : mission.recurring && game.journey.deliveryDay === game.day ? 'รับงานใหม่วันถัดไป' : ['เลือกแปลงที่เหมาะ →', 'วางแผนพันธุ์ไม้ →', 'ดูแลระหว่างรอต้นโต →', 'เปิดศูนย์ MRV →', 'ดูอัปเกรด →', 'ขยายพื้นที่ป่า →'][game.journey.mission] || 'เปิดตลาดเครดิต →'}</button>
          </section>
          <RestorationPanel game={game} onOpen={() => setShowRestoration(true)} onClaim={handleContractClaim} />
        </aside>

        <div className="coast-status"><span><i /> LIVE COAST / {forecast.tide}</span><b>{game.event ? game.event.title : `วันที่ ${forecast.eventDay} · ${forecastEvent.title}`}</b><small>{forestBonus > 1 ? 'ป่า 3 สายพันธุ์ · Carbon +15%' : 'ป่าครบ 3 สายพันธุ์ → Carbon +15%'}</small></div>
        <aside className={`right-dashboard ${showEconomy ? 'expanded' : ''}`}>
          <button className="economy-close" onClick={() => setShowEconomy(false)} aria-label="ปิดเศรษฐกิจ">×</button>
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
            <p className="mrv-hint">{game.estimatedCarbon < 5 ? 'สะสมอย่างน้อย 5 tCO₂e เพื่อส่งตรวจ' : game.coins < mrvCost ? 'ทุนไม่พอ · เก็บขยะหรือขายเครดิตก่อน' : 'พร้อมตรวจสอบและออกเครดิต'}</p>
            <button className="primary-game-button" onClick={verifyCarbon} disabled={game.estimatedCarbon < 5 || game.coins < mrvCost || Boolean(game.event)}>
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
              <button disabled={game.credits < 1} onClick={() => sellCredits(1)}>ขาย 1</button>
              <button disabled={game.credits < 1} onClick={() => sellCredits(5)}>ขาย 5</button>
              <button disabled={game.credits <= 0} onClick={() => sellCredits('all')}>ขายทั้งหมด</button>
            </div>
          </section>
        </aside>

        {selected && (
          <section className="selected-plot-card">
            <button className="selected-close" onClick={() => setSelectedPlot(null)} aria-label="ปิดรายละเอียด">×</button>
            <small>SELECTED PLOT #{String(selected.id).padStart(2, '0')}</small>
            <strong>{selected.species ? SPECIES[selected.species].name : SPECIES[game.activeSpecies].name}</strong>
            <div className="selected-tags">
              <span>น้ำ {selected.tide}</span><span>ดิน {selected.prepared ? "ตะกอนฟื้นฟู" : selected.soil}</span>
              {selected.species && <span>Fit {suitability(selected, selected.species)}/2</span>}
            </div>
            {selected.species ? (
              <>
                <div className="tree-age">{selected.dead ? "ต้องฟื้นฟูแปลง" : selected.age >= 6 ? "โตเต็มที่ · สร้างคาร์บอนเต็มกำลัง" : `อายุ ${selected.age} วัน · อีก ${6 - selected.age} วันโตเต็มที่`}</div><div className="health-row"><span>สุขภาพ</span><b>{Math.round(selected.health)}%</b></div>
                <div className="health-bar"><span style={{ width: `${selected.health}%` }} /></div>
                <div className="selected-actions">
                  {selected.dead
                    ? <button disabled={game.coins < 28} onClick={clearSelected}>เคลียร์แปลง · 28 ●</button>
                    : <button disabled={selected.health >= 100 || game.coins < 38} onClick={maintainSelected}>บำรุงรักษา · 38 ●</button>}
                </div>
              </>
            ) : (
              <>
                <p className={`fit-preview fit-preview-${suitability(selected, game.activeSpecies)}`}>Fit {suitability(selected, game.activeSpecies)}/2 · {suitability(selected, game.activeSpecies) === 2 ? 'เหมาะมาก · สุขภาพเริ่ม 96% · รับคอมโบ' : suitability(selected, game.activeSpecies) === 1 ? 'พอใช้ · สุขภาพเริ่ม 83% · ต้องดูแลเพิ่ม' : 'ไม่เหมาะ · สุขภาพเริ่ม 67% · เสี่ยงไม่รอด'}</p>
                {selected.soil === 'ทราย' && !selected.prepared && <button className="soil-action" disabled={game.coins < 40 || Boolean(game.event)} onClick={() => { setGame((g) => prepareSoil(g, selected.id)); setNotice('ฟื้นดินด้วยตะกอนแล้ว · ตรวจ Fit ใหม่ก่อนปลูก') }}>ฟื้นดินด้วยตะกอน · 40 ●</button>}
                <button className="confirm-plant" disabled={game.coins < getPlantCost(game, game.activeSpecies) || Boolean(game.event)} onClick={() => { plant(selected.id); playChime() }}>ยืนยันปลูก · {getPlantCost(game, game.activeSpecies)} ●</button>
              </>
            )}
          </section>
        )}

        <nav className="utility-rail" aria-label="เครื่องมือเกม">
          <button onClick={() => setShowRestoration(true)} aria-label="เปิดแผนภาคสนาม"><GameIcon name="field" /><span>ภาคสนาม</span></button>
          <button onClick={() => setShowGoals(true)} aria-label="เปิดเป้าหมายระยะยาว"><GameIcon name="goal" /><span>เป้าหมาย</span></button>
          <button onClick={() => setShowLog(true)} aria-label="เปิดบันทึก"><GameIcon name="log" /><span>บันทึก</span></button>
          <button onClick={() => setShowJournal(true)} aria-label="เปิดสมุดสัตว์"><GameIcon name="wildlife" /><span>สมุดสัตว์</span><em>{game.journey.discovered.length}/4</em></button>
          <button onClick={() => setShowPlots(true)} aria-label="เปิดแผนที่แปลง"><GameIcon name="plots" /><span>แปลง</span></button>
          <button onClick={() => setShowEconomy((v) => !v)} className="economy-toggle" aria-label="เปิดเศรษฐกิจ"><GameIcon name="economy" /><span>เศรษฐกิจ</span></button>
          <button onClick={() => { setSelectedPlot(null); setCameraReset((v) => v + 1) }} aria-label="คืนมุมกล้อง"><GameIcon name="target" /><span>คืนกล้อง</span></button>
          <button onClick={() => setPhotoMode(true)} aria-label="โหมดชมวิว"><GameIcon name="photo" /><span>ชมวิว</span></button>
          <button onClick={() => setSound((v) => !v)} aria-label={sound ? 'ปิดเสียง' : 'เปิดเสียง'} aria-pressed={sound}><GameIcon name="sound" /><span>{sound ? 'เสียงเปิด' : 'เสียงปิด'}</span></button>
        </nav>
        {game.journey.combo >= 2 && <div className="combo-banner" key={`${game.day}-${game.journey.combo}`}>PERFECT PLANT <b>×{game.journey.combo}</b><span>คืนทุน +{game.journey.combo * 4} ● ต่อการปลูกที่เหมาะสม</span></div>}
        {dayReport && <div className="day-report" role="status"><button onClick={() => setDayReport(null)} aria-label="ปิดสรุปวัน">×</button><small>รุ่งเช้าวันที่ {dayReport.day}</small><strong>+{dayReport.carbon.toFixed(1)} <span>tCO₂e</span></strong><p>{dayReport.mature ? `🌳 โตเต็มที่ ${dayReport.mature} ต้น · ` : ''}รายได้ +{dayReport.income} ●{dayReport.deaths ? ` · ไม่รอด ${dayReport.deaths} ต้น` : ''}</p></div>}
        <nav className="plant-dock" aria-label="เลือกพันธุ์ไม้">
          <div className="dock-caption"><small>NURSERY LV.{game.upgrades.nursery}</small><strong>เลือกพันธุ์ · ดูแปลง · ยืนยันปลูก</strong></div>
          {Object.entries(SPECIES).map(([key, species]) => {
            const cost = getPlantCost(game, key)
            return (
              <button
                key={key}
                className={`species-tool ${game.activeSpecies === key ? 'active' : ''}`}
                aria-pressed={game.activeSpecies === key}
                title={species.description}
                onClick={() => selectSpecies(key)}
                style={{ '--species-tint': species.tint }}
              >
                <span className={`seedling-icon seedling-${key}`} aria-hidden="true"><i /><i /><i /></span>
                <b>{species.short}</b>
                <small>{cost} ●</small>
              </button>
            )
          })}
          <button className="dock-more" onClick={() => setShowUpgrades(true)}>
            <span>+</span><b>สิ่งปลูกสร้าง</b><small>อัปเกรด</small>
          </button>
        </nav>

        <div className="notice-toast" role="status"><span>✦</span>{notice}</div>
        {saveError && <div className="save-warning" role="alert">บันทึกอัตโนมัติไม่ได้ · อย่าปิดหน้านี้ ความคืบหน้าอาจสูญหาย</div>}
        <div className="camera-tip">ลากฉากเพื่อหมุน · เลื่อนเมาส์เพื่อซูม · คลิกแปลงเพื่อดู Fit ก่อนปลูก</div>
      </div>

      {showRestoration && <ModalBackdrop onClose={() => setShowRestoration(false)}><div className="game-modal restoration-modal"><button className="modal-close" aria-label="ปิดแผนภาคสนาม" onClick={() => setShowRestoration(false)}>×</button><RestorationModal game={game} onCrew={handleCrew} onClaim={handleContractClaim} onAccept={(id) => { setGame((g) => acceptContract(g, id)); setNotice('รับงานแล้ว · ความคืบหน้านับจากตอนรับงาน · ส่งภายใน 3 วันในเกม') }} /></div></ModalBackdrop>}
      {showDayPlan && <ModalBackdrop onClose={() => setShowDayPlan(false)}><div className="game-modal day-plan-modal"><button className="modal-close" aria-label="กลับไปทำงาน" onClick={() => setShowDayPlan(false)}>×</button><small>BEFORE THE NEXT TIDE</small><h2>พักทีม แล้วพบกันพรุ่งนี้</h2><p>ทีมวันนี้ยังทำได้อีก {crewLeft(game)} งาน · ต้นไม้จะเติบโตอีก 1 วัน</p><div className="next-tide-preview"><b>{forecast.eventDay === game.day + 1 ? `พรุ่งนี้: ${forecastEvent.title}` : `พรุ่งนี้: ${forecastFor(game.day + 1).tide}`}</b><span>{habitat.living} ต้นที่กำลังเติบโต · {game.plots.filter((p) => p.species && !p.dead && p.health < 50).length} ต้นสุขภาพต่ำกว่า 50%</span></div>{contractProgress(game)?.deadline === game.day && <p className="deadline-warning">งานฟื้นฟูครบกำหนดวันนี้{contractProgress(game).ready ? ' · ส่งมอบก่อนจบวันเพื่อรับรางวัล' : ' · ถ้าจบวันจะหมดเวลาและรีเซ็ตโบนัสต่อเนื่อง'}</p>}<button className="primary-game-button large" onClick={nextDay}>ยืนยันจบวัน → วันที่ {game.day + 1}</button><button className="secondary-game-button" onClick={() => { setShowDayPlan(false); setShowRestoration(true) }}>กลับไปวางแผน</button></div></ModalBackdrop>}

      {showJournal && (
        <ModalBackdrop onClose={() => setShowJournal(false)}><div className="game-modal journal-modal"><button className="modal-close" onClick={() => setShowJournal(false)} aria-label="ปิดสมุดสัตว์">×</button>
          <small>THE BAY IS COMING BACK</small><h2>ทุกชีวิตที่กลับมา</h2><p>ฟื้นป่าเพื่อค้นพบสัตว์ใหม่ รับทุนสำรวจและ 25 XP ต่อชนิด</p>
          <div className="wildlife-grid">{WILDLIFE.map((animal) => {
            const found = game.journey.discovered.includes(animal.id)
            return <article key={animal.id} className={found ? 'discovered' : ''}><span className="animal-art">{found ? animal.icon : '◇'}</span><small>{found ? 'ค้นพบแล้ว ✓' : 'ยังไม่ค้นพบ'}</small><h3>{animal.name}</h3><p>{animal.hint}</p><b>{found ? 'บันทึกในสมุดแล้ว' : `ทุนสำรวจ +${animal.reward} ●`}</b></article>
          })}</div><p className="journal-footnote">สมุดเก็บการค้นพบถาวรในโครงการนี้ สัตว์ในฉากจะเปลี่ยนตามสภาพป่าปัจจุบัน</p>
        </div></ModalBackdrop>
      )}
      {showPlots && (
        <ModalBackdrop onClose={() => setShowPlots(false)}><div className="game-modal plots-modal"><button className="modal-close" onClick={() => setShowPlots(false)} aria-label="ปิดแผนที่แปลง">×</button>
          <small>PLANT WITH PURPOSE</small><h2>เลือกบ้านให้ต้นไม้</h2><p>พันธุ์ที่เลือก: {SPECIES[game.activeSpecies].name} · เขียว = เหมาะทั้งน้ำและดิน</p>
          <div className="plot-species-picker">{Object.entries(SPECIES).map(([key, species]) => <button key={key} aria-pressed={game.activeSpecies === key} onClick={() => selectSpecies(key)}>{species.short} · {getPlantCost(game, key)} ●</button>)}</div>
          <div className="plot-picker">{game.plots.map((plot) => <button key={plot.id} className={`fit-${suitability(plot, plot.species || game.activeSpecies)} ${plot.species ? 'occupied' : ''}`} onClick={() => { handlePlotClick(plot.id); setShowPlots(false) }}>
            <small>แปลง {plot.id}</small><b>{plot.dead ? 'กู้พื้นที่' : plot.species ? SPECIES[plot.species].short : `ดูแปลง · Fit ${suitability(plot, game.activeSpecies)}/2`}</b><span>น้ำ{plot.tide} · {plot.prepared ? "ฟื้นดินแล้ว" : plot.soil}</span>
          </button>)}</div>
        </div></ModalBackdrop>
      )}
      {game.event && (
        <ModalBackdrop>
          <div className="event-modal game-modal">
            <div className="modal-icon">{game.event.icon}</div>
            <small>{game.event.label}</small>
            <h2>{game.event.title}</h2>
            <p>{game.event.text}</p>
            {['storm', 'kingtide'].includes(game.event.id) && <div className="event-forecast-impact"><b>ผลต่อพื้นที่ของคุณ</b><p>ต้นอ่อนที่เสี่ยง {game.plots.filter((p) => p.species && !p.dead && p.age < (game.event.id === 'storm' ? 6 : 5)).length} ต้น · ถ้าไม่จ่ายเพิ่ม สุขภาพ −{stormDamage(game, false, game.event.id === 'storm' ? 15 : 8)}</p><small>{game.expedition.protectionDay === game.day ? '✓ ทีมเตรียมแนวป้องกันแล้ว · ลดความเสียหาย 8' : 'วางแผนส่งทีมป้องกันก่อนเหตุการณ์รอบหน้าได้'} · รากโกงกางโตเต็มที่ช่วยลดเพิ่ม</small></div>}
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
              <HelpStep number="1" title="เลือกพันธุ์" text="เลือกแปลงสีเขียวในแผนที่ Fit 2/2 รับคอมโบคืนทุนสูงสุด 20 เหรียญ" />
              <HelpStep number="2" title="คลิกแปลงในฉาก" text="คลิกแปลงเพื่อดู Fit และราคาก่อนยืนยันปลูก แปลงทรายฟื้นดินได้" />
              <HelpStep number="3" title="จบวันและดูแล" text="เปิดภาคสนาม เลือกงาน 3 วัน จัดทีม 2 งานต่อวัน แล้วดูพยากรณ์ก่อนจบวัน" />
              <HelpStep number="4" title="ตรวจ MRV" text="Estimated Carbon ต้องผ่าน Drone + Field ก่อนออกเครดิต" />
              <HelpStep number="5" title="สร้าง Impact" text="ทำภารกิจรับรางวัล สะสม XP และปลดล็อกสัตว์ในสมุดสำรวจ" />
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
                    <button onClick={() => buyUpgrade(key)} disabled={level >= 3 || game.coins < cost}>
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
              <button className="primary-game-button large" onClick={() => { setSandbox(true); setGame((current) => ({ ...current, journey: { ...current.journey, sandbox: true } })) }}>เล่น Sandbox ต่อ</button>
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
  const modal = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const buttons = () => [...modal.current.querySelectorAll('button:not(:disabled), [href], input, [tabindex="0"]')]
    buttons()[0]?.focus()
    const trap = (event) => {
      if (event.key !== 'Tab') return
      const items = buttons()
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus() }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    const node = modal.current
    node.addEventListener('keydown', trap)
    return () => { node.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus?.() }
  }, [])
  return (
    <div
      ref={modal}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="รายละเอียดเกม"
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
