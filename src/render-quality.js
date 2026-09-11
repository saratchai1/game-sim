// Rendering only: never change actor counts, save data, simulation, or tree growth.
export function renderingProfile({ width = 1440, dpr = 1, coarse = false, memory = 8 } = {}) {
  const mobile = width < 600
  const tablet = !mobile && (coarse || width <= 1100)
  const tier = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop'
  const cap = mobile ? 1.25 : tablet ? 1.35 : 1.5
  const maxDpr = Math.max(1, Math.min(Number.isFinite(dpr) ? dpr : 1, cap, memory <= 4 ? 1.25 : cap))
  return { tier, maxDpr, minDpr: Math.min(maxDpr, mobile ? 1.05 : 1.1), shadowSize: 1024 }
}

// Hysteresis: degrade after two slow windows; recover only after four fast ones.
export function nextQuality(current, sample, profile, counters) {
  if (!Number.isFinite(sample) || sample <= 0) return current
  counters.slow = sample > 28 ? counters.slow + 1 : 0
  counters.fast = sample < 18 ? counters.fast + 1 : 0
  if (counters.slow >= 2) {
    counters.slow = 0
    return Math.max(profile.minDpr, Number((current - .1).toFixed(2)))
  }
  if (counters.fast >= 4) {
    counters.fast = 0
    return Math.min(profile.maxDpr, Number((current + .05).toFixed(2)))
  }
  return current
}
