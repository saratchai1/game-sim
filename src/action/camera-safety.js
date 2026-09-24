// Camera-boom math only; no dependencies and no gameplay collision changes.
// Intersect a finite segment with a vertical cylinder (including its end caps).
export function cylinderHitFraction(a, b, cylinder) {
  const dx = b.x-a.x, dz = b.z-a.z, dy = b.y-a.y
  const ox = a.x-cylinder.x, oz = a.z-cylinder.z
  const A = dx*dx+dz*dz, B = 2*(ox*dx+oz*dz), C = ox*ox+oz*oz-cylinder.radius*cylinder.radius
  let enter = 0, exit = 1
  if (A < 1e-10) { if (C > 0) return null }
  else {
    const discriminant = B*B-4*A*C
    if (discriminant < 0) return null
    const root = Math.sqrt(discriminant)
    enter = Math.max(enter,(-B-root)/(2*A)); exit = Math.min(exit,(-B+root)/(2*A))
  }
  if (Math.abs(dy) < 1e-10) { if(a.y<cylinder.bottom || a.y>cylinder.top)return null }
  else {
    const t1 = (cylinder.bottom-a.y)/dy, t2 = (cylinder.top-a.y)/dy
    enter = Math.max(enter,Math.min(t1,t2));exit = Math.min(exit,Math.max(t1,t2))
  }
  return enter <= exit && exit >= 0 && enter <= 1 ? Math.max(0, enter) : null
}
export function boomFraction(pivot, goal, obstacles) {
  let fraction = 1
  for(const obstacle of obstacles) {
    const hit = cylinderHitFraction(pivot,goal,obstacle)
    if(hit !== null) fraction=Math.min(fraction,hit)
  }
  const length = Math.hypot(goal.x-pivot.x,goal.y-pivot.y,goal.z-pivot.z)
  // Camera's near plane stays on the player side of the collision.
  return fraction < 1 ? Math.max(0.035,fraction - 0.12/Math.max(length,.1)) : 1
}
