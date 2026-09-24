// One outstanding frame per caller: native rendering when available, a foreground
// recovery tick if the compositor stops delivering that callback after a modal
// or cached-page return. No hidden-tab simulation and no second animation loop.
export function createFrameScheduler({
  requestNative = callback => globalThis.requestAnimationFrame(callback),
  cancelNative = id => globalThis.cancelAnimationFrame(id),
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = id => globalThis.clearTimeout(id),
  now = () => globalThis.performance.now(),
  isHidden = () => Boolean(globalThis.document?.hidden),
  recoveryDelay = 250,
} = {}) {
  const pending = new Map()
  let sequence = 0
  function cancel(token) {
    const frame = pending.get(token)
    if (!frame) return
    pending.delete(token)
    cancelNative(frame.native)
    if (frame.timer !== null) clearTimer(frame.timer)
  }
  function request(callback) {
    const token = ++sequence, frame = { native: null, timer: null }
    pending.set(token, frame)
    const deliver = timestamp => {
      if (!pending.has(token)) return
      cancel(token)
      callback(timestamp)
    }
    frame.native = requestNative(deliver)
    frame.timer = setTimer(() => {
      frame.timer = null
      // Native RAF may remain pending while hidden. Do not poll or render there;
      // explicit Resume will cancel this token and create a fresh frame request.
      if (!isHidden()) deliver(now())
    }, recoveryDelay)
    return token
  }
  return { request, cancel, get pendingCount() { return pending.size } }
}
const scheduler = createFrameScheduler()
export const requestFrame = callback => scheduler.request(callback)
export const cancelFrame = token => scheduler.cancel(token)
