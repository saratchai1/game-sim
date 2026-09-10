export const PLOT_ANCHORS = [
  { x: 36, y: 70 }, { x: 44, y: 73 }, { x: 53, y: 72 }, { x: 63, y: 69 },
  { x: 33, y: 61 }, { x: 42, y: 62 }, { x: 51, y: 63 }, { x: 61, y: 59 },
  { x: 35, y: 52 }, { x: 44, y: 53 }, { x: 54, y: 52 }, { x: 65, y: 49 },
  { x: 38, y: 44 }, { x: 48, y: 45 }, { x: 58, y: 44 }, { x: 67, y: 42 },
]

export const AMBIENT_ANCHORS = {
  cleanup: { x: 30, y: 76 },
  survey: { x: 56, y: 56 },
  mrv: { x: 69, y: 34 },
  community: { x: 72, y: 31 },
  nursery: { x: 27, y: 34 },
}

function readPlotId(text = '') {
  const match = String(text).match(/(?:แปลง|PLOT)\s*#?\s*(\d{1,2})/i)
  if (!match) return null
  const id = Number(match[1])
  return id >= 1 && id <= PLOT_ANCHORS.length ? id : null
}

export function plotAnchor(plotId) {
  const id = Number(plotId)
  return PLOT_ANCHORS[id - 1] || AMBIENT_ANCHORS.survey
}

export function activityFromText(raw = '') {
  const text = String(raw).replace(/\s+/g, ' ').trim()
  if (!text) return null
  const plotId = readPlotId(text)

  if (/เก็บขยะ|ขยะทะเล|cleanup|clean up/i.test(text)) {
    return { type: 'cleanup', plotId, label: 'เก็บขยะชายฝั่ง', duration: 6200 }
  }
  if (/Biodiversity Survey|สำรวจ|สมุดสัตว์|wildlife/i.test(text)) {
    return { type: 'survey', plotId, label: 'สำรวจระบบนิเวศ', duration: 6500 }
  }
  if (/MRV|Verified|Drone/i.test(text)) {
    return { type: 'mrv', plotId, label: 'สำรวจ MRV', duration: 6000 }
  }
  if (/บำรุง|ดูแลแปลง|care/i.test(text)) {
    return { type: 'care', plotId, label: 'ดูแลต้นไม้', duration: 5600 }
  }
  if (/เคลียร์แปลง|เตรียมแปลง|ปลูกซ่อม/i.test(text)) {
    return { type: 'clear', plotId, label: 'เตรียมพื้นที่', duration: 5600 }
  }
  if (/ปลูก/.test(text) && (plotId || /Fit|คอมโบ|species|พันธุ์/i.test(text))) {
    return { type: 'plant', plotId, label: 'ปลูกต้นกล้า', duration: 5800 }
  }
  if (/ประมง|เฝ้าระวัง|ชุมชน/i.test(text)) {
    return { type: 'community', plotId, label: 'ทีมชุมชนออกตรวจ', duration: 6200 }
  }
  return null
}

export function activityTarget(activity) {
  if (!activity) return AMBIENT_ANCHORS.survey
  if (activity.plotId) return plotAnchor(activity.plotId)
  return AMBIENT_ANCHORS[activity.type] || AMBIENT_ANCHORS.survey
}

export function activityTool(type) {
  return {
    plant: 'seedling',
    care: 'watering',
    clear: 'rake',
    cleanup: 'bag',
    survey: 'binoculars',
    mrv: 'tablet',
    community: 'radio',
  }[type] || 'radio'
}
