import { useEffect, useMemo, useRef, useState } from 'react'
import { activityFromText, activityTarget, activityTool, AMBIENT_ANCHORS } from './living-world-events.js'

const ACTION_BUTTON_PATTERNS = [
  'เก็บขยะ',
  'สำรวจ',
  'MRV',
  'บำรุง',
  'เคลียร์',
  'เฝ้าระวัง',
]

function selectedPlotFromDom(button) {
  const card = button?.closest?.('.selected-plot-card')
  const text = card?.querySelector?.('small')?.textContent || ''
  const match = text.match(/#\s*(\d{1,2})/)
  return match ? Number(match[1]) : null
}

function Character({ activity }) {
  if (!activity) return null
  const target = activityTarget(activity)
  const tool = activityTool(activity.type)
  return (
    <div
      className={`lw-worker lw-worker-${activity.type}`}
      data-action={activity.type}
      style={{
        '--from-x': AMBIENT_ANCHORS.community.x,
        '--from-y': AMBIENT_ANCHORS.community.y,
        '--to-x': target.x,
        '--to-y': target.y,
        '--route-ms': `${activity.duration}ms`,
      }}
    >
      <div className="lw-route-shadow" />
      <div className="lw-person">
        <span className="lw-hat" />
        <span className="lw-head" />
        <span className="lw-body" />
        <span className="lw-arm lw-arm-left" />
        <span className="lw-arm lw-arm-right" />
        <span className="lw-leg lw-leg-left" />
        <span className="lw-leg lw-leg-right" />
        <span className={`lw-tool lw-tool-${tool}`} />
      </div>
      <div className="lw-action-ring" />
      <div className="lw-speech">{activity.label}</div>
    </div>
  )
}

function AmbientLife() {
  const crabs = useMemo(() => [
    { x: 27, y: 75, delay: -1.2, scale: 0.9 },
    { x: 42, y: 79, delay: -5.4, scale: 0.75 },
    { x: 59, y: 75, delay: -8.2, scale: 0.7 },
  ], [])
  const fish = useMemo(() => [
    { x: 24, y: 83, delay: -2.8, scale: 0.9 },
    { x: 52, y: 84, delay: -6.1, scale: 0.75 },
    { x: 70, y: 76, delay: -9.4, scale: 0.68 },
  ], [])
  const birds = useMemo(() => [
    { y: 19, delay: -4.2, scale: 0.9 },
    { y: 27, delay: -10.5, scale: 0.72 },
  ], [])

  return (
    <>
      <div className="lw-boat">
        <span className="lw-boat-hull" />
        <span className="lw-boat-cabin" />
        <span className="lw-boat-person" />
        <span className="lw-boat-wake" />
      </div>

      {crabs.map((crab, index) => (
        <div
          className="lw-crab"
          key={`crab-${index}`}
          style={{ '--x': crab.x, '--y': crab.y, '--delay': `${crab.delay}s`, '--scale': crab.scale }}
        >
          <span className="lw-crab-body" />
          <span className="lw-claw lw-claw-a" />
          <span className="lw-claw lw-claw-b" />
          <i /><i /><i /><i />
        </div>
      ))}

      {fish.map((item, index) => (
        <div
          className="lw-fish"
          key={`fish-${index}`}
          style={{ '--x': item.x, '--y': item.y, '--delay': `${item.delay}s`, '--scale': item.scale }}
        >
          <span className="lw-fish-body" />
          <span className="lw-fish-tail" />
          <span className="lw-fish-wake" />
        </div>
      ))}

      {birds.map((bird, index) => (
        <div
          className="lw-bird"
          key={`bird-${index}`}
          style={{ '--bird-y': bird.y, '--delay': `${bird.delay}s`, '--scale': bird.scale }}
        >
          <span /><span />
        </div>
      ))}
    </>
  )
}

export default function LivingWorldOverlay() {
  const [activity, setActivity] = useState(null)
  const timerRef = useRef(null)
  const lastRef = useRef({ signature: '', at: 0 })

  useEffect(() => {
    const launch = (candidate, source = '') => {
      if (!candidate) return
      const signature = `${candidate.type}:${candidate.plotId || ''}:${source}`
      const now = Date.now()
      if (lastRef.current.signature === signature && now - lastRef.current.at < 900) return
      lastRef.current = { signature, at: now }
      const id = `${now}-${Math.random().toString(36).slice(2, 7)}`
      setActivity({ ...candidate, id })
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setActivity((current) => current?.id === id ? null : current), candidate.duration)
    }

    const onClick = (event) => {
      const button = event.target?.closest?.('button')
      if (!button) return
      const label = button.textContent?.replace(/\s+/g, ' ').trim() || ''
      if (!ACTION_BUTTON_PATTERNS.some((pattern) => label.includes(pattern))) return
      const selectedPlot = selectedPlotFromDom(button)
      const candidate = activityFromText(selectedPlot ? `${label} แปลง ${selectedPlot}` : label)
      launch(candidate, `button:${label.slice(0, 36)}`)
    }

    const notice = document.querySelector('.notice-toast')
    const observer = notice
      ? new MutationObserver(() => {
          const text = notice.textContent?.replace(/\s+/g, ' ').trim() || ''
          launch(activityFromText(text), `notice:${text.slice(0, 48)}`)
        })
      : null

    observer?.observe(notice, { childList: true, characterData: true, subtree: true })
    document.addEventListener('click', onClick, true)
    return () => {
      observer?.disconnect()
      document.removeEventListener('click', onClick, true)
      window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="living-world-overlay" aria-hidden="true">
      <AmbientLife />
      <Character key={activity?.id || 'idle'} activity={activity} />
      <div className="lw-world-pulse lw-world-pulse-a" />
      <div className="lw-world-pulse lw-world-pulse-b" />
    </div>
  )
}
