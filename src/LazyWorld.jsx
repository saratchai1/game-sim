import { Component, lazy, Suspense, useEffect, useState } from 'react'
import './world-loading.css'

// This module and its fallback must not import three, fiber, drei, or scene helpers.
const World = lazy(() => import('./MangroveWorld3DNatural.jsx'))
function WorldLoading() {
  return <div className="world-canvas world-loading" role="status" aria-live="polite" aria-busy="true">
    <div className="world-loading-card">
      <span className="world-loading-leaf" aria-hidden="true">🌱</span>
      <strong>กำลังเตรียมป่าชายเลน</strong>
      <span>เปิดแผนภาคสนามได้เลย ระหว่างรอฉากสามมิติ</span>
      <span className="world-loading-track" aria-hidden="true"><i /></span>
    </div>
  </div>
}
class WorldBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="world-canvas world-loading" role="alert">
      <div className="world-loading-card"><strong>เปิดฉากสามมิติไม่สำเร็จ</strong>
        <span>ข้อมูลที่บันทึกไว้ยังอยู่ ลองโหลดหน้าใหม่อีกครั้ง</span>
        <button onClick={() => window.location.reload()}>ลองโหลดใหม่</button>
      </div>
    </div>
    return this.props.children
  }
}
export default function LazyWorld(props) {
  const [start, setStart] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Give the lightweight UI an actual paint before loading/parsing the 3D graph.
    let second
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setStart(true))
    })
    return () => { cancelAnimationFrame(first); if (second) cancelAnimationFrame(second) }
  }, [])
  return <WorldBoundary>
    {start && <Suspense fallback={null}><World {...props} onReady={setReady} /></Suspense>}
    {!ready && <WorldLoading />}
  </WorldBoundary>
}
