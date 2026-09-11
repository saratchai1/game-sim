import { SPECIES, EVENTS, clamp, suitability } from './game-data.js'
import { diversityBonus } from './coast-progression.js'
import { forecastFor, closeRestorationDay } from './restoration.js'
// Stable per-day variation keeps previews, replay, and React StrictMode consistent.
const variation = (day, seed, range) => ((day * 17 + seed * 31) % range) - Math.floor(range / 2)
export function advanceDay(current) {
  if (current.event) return { game: current, report: null }
  let carbon = 0, biodiversity = 0, coastal = 0, deaths = 0, matured = 0
  const plots = current.plots.map((plot) => {
    if (!plot.species || plot.dead) return plot
    const species = SPECIES[plot.species]
    const fit = suitability(plot, plot.species)
    const age = plot.age + 1
    const health = clamp(plot.health + (fit === 2 ? 2 : fit === 1 ? -1 : -5) + variation(current.day, plot.id, 5))
    const dead = health <= 5
    if (dead) deaths++
    const growth = age < 2 ? .24 : age < 6 ? .62 : 1
    if (!dead) {
      if (plot.age < 6 && age >= 6) matured++
      carbon += species.carbon * growth * health / 100
      biodiversity += species.biodiversity * growth * .18
      coastal += growth * (plot.species === 'rhizophora' ? .16 : .1)
    }
    return { ...plot, age, health, dead }
  })
  // Apply diversity to surviving habitat, not trees that died during this day.
  carbon *= diversityBonus({ ...current, plots })
  const day = current.day + 1
  const income = current.community >= 32 ? 10 + current.upgrades.community * 8 : 0
  const event = EVENTS.find((e) => e.id === forecastFor(day).todayEvent) || null
  const game = closeRestorationDay({
    ...current, day, plots, event,
    journey: { ...current.journey, combo: 0, xp: current.journey.xp + 5 },
    coins: current.coins + income,
    estimatedCarbon: current.estimatedCarbon + carbon,
    biodiversity: clamp(current.biodiversity + biodiversity),
    coastal: clamp(current.coastal + coastal),
    community: clamp(current.community + (current.upgrades.community ? .14 * (1 + current.upgrades.community * .08) : 0)),
    marketPrice: clamp(current.marketPrice + variation(day, 7, 11), 58, 128),
    stats: { ...current.stats, dead: current.stats.dead + deaths },
  })
  return { game, report: { day, carbon, income, mature: matured, deaths } }
}
