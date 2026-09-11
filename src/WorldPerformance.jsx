import { useEffect, useRef, useState } from 'react'
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber'
import { useWorldResources } from './WorldResources.jsx'
import { renderingProfile, nextQuality } from './render-quality.js'
import { installWorldDiagnostics } from './world-diagnostics.js'

function deviceProfile() {
  return renderingProfile({ width: window.innerWidth, dpr: window.devicePixelRatio,
    coarse: window.matchMedia('(pointer: coarse)').matches, memory: navigator.deviceMemory ?? 8 })
}
export function useDeviceQuality() {
  const [quality, setQuality] = useState(deviceProfile)
  useEffect(() => {
    let timer
    const resize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const next = deviceProfile()
        setQuality((current) => current.tier === next.tier && current.maxDpr === next.maxDpr ? current : next)
      }, 150)
    }
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); clearTimeout(timer) }
  }, [])
  return quality
}

export function WorldPerformance({ plotPositions, quality, onReady }) {
  const { gl, scene, camera, setDpr } = useThree()
  const resources = useWorldResources()
  const frames = useRef({ samples: [], cursor: 0, sum: 0, count: 0 })
  useFrame((_, delta) => {
    if (document.hidden || delta <= 0) return
    const ms = delta * 1000, frame = frames.current
    frame.samples[frame.cursor] = ms
    frame.cursor = (frame.cursor + 1) % 120
    frame.sum += ms; frame.count += 1
  })
  useEffect(() => {
    let live = true, sent = false
    const unsubscribe = addAfterEffect(() => {
      if (sent || gl.info.render.frame === 0) return
      sent = true
      unsubscribe()
      queueMicrotask(() => {
        if (!live) return
        performance.mark('coast-world-ready')
        onReady?.(true)
      })
    })
    return () => { live = false; unsubscribe() }
  }, [gl, onReady])
  useEffect(() => {
    const counters = { slow: 0, fast: 0 }
    let warmed = false
    setDpr(quality.maxDpr)
    const timer = setInterval(() => {
      const frame = frames.current
      const mean = frame.count ? frame.sum / frame.count : 0
      const count = frame.count
      frame.sum = 0; frame.count = 0
      if (!warmed || document.hidden || count < 8) { warmed = true; return }
      const current = gl.getPixelRatio()
      const next = nextQuality(current, mean, quality, counters)
      if (next !== current) setDpr(next)
    }, 3000)
    return () => clearInterval(timer)
  }, [gl, setDpr, quality])
  useEffect(() => {
    if (!(import.meta.env.DEV || import.meta.env.VITE_WORLD_QA === '1')) return
    if (!new URLSearchParams(location.search).has('qa')) return
    return installWorldDiagnostics({ gl, scene, camera, plotPositions, frames: frames.current, resources, quality })
  }, [gl, scene, camera, plotPositions, resources, quality])
  return null
}
