import test from 'node:test'
import assert from 'node:assert/strict'
import { activityFromText, activityTarget, plotAnchor, activityTool, PLOT_ANCHORS } from '../src/living-world-events.js'

test('parses planting activity and plot id from Thai notice', () => {
  const activity = activityFromText('ปลูกโกงกางในแปลง 7 · ความเหมาะสม 2/2')
  assert.equal(activity.type, 'plant')
  assert.equal(activity.plotId, 7)
})

test('parses maintenance and cleanup work', () => {
  assert.equal(activityFromText('ทีมภาคสนามบำรุงแปลง 12').type, 'care')
  assert.equal(activityFromText('ชวนชุมชนเก็บขยะรับ 45 เหรียญ').type, 'cleanup')
})

test('parses biodiversity and MRV activities', () => {
  assert.equal(activityFromText('ทำ Biodiversity Survey').type, 'survey')
  assert.equal(activityFromText('ส่งตรวจ MRV').type, 'mrv')
})

test('plot anchors cover all 16 restoration plots and stay on screen', () => {
  assert.equal(PLOT_ANCHORS.length, 16)
  for (let id = 1; id <= 16; id += 1) {
    const point = plotAnchor(id)
    assert.ok(point.x > 0 && point.x < 100)
    assert.ok(point.y > 0 && point.y < 100)
  }
})

test('activities resolve to target positions and tools', () => {
  const target = activityTarget({ type: 'plant', plotId: 3 })
  assert.deepEqual(target, plotAnchor(3))
  assert.equal(activityTool('cleanup'), 'bag')
  assert.equal(activityTool('survey'), 'binoculars')
})
