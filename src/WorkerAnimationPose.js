export function workerPose(state, time) {
  const s=Math.sin(time*3.5), stride=Math.sin(time*8)
  const p={ body:0, head:0, bob:Math.sin(time*1.8)*.008, leftArm:.08, rightArm:-.08, leftElbow:-.12, rightElbow:-.12, leftHip:0, rightHip:0, leftKnee:.06, rightKnee:.06, wrist:0 }
  if(state==='walk') Object.assign(p,{bob:Math.abs(stride)*.045,leftArm:-stride*.5,rightArm:stride*.5,leftHip:stride*.48,rightHip:-stride*.48,leftKnee:Math.max(0,-stride)*.65,rightKnee:Math.max(0,stride)*.65})
  if(state==='plant') Object.assign(p,{body:.42+s*.08,head:.2,leftArm:-.55,leftElbow:-.65,rightArm:-.8+s*.35,rightElbow:-.6-s*.25,leftHip:-.48,rightHip:-.24,leftKnee:.75,rightKnee:.45,bob:-.15+s*.025})
  if(state==='cleanup') Object.assign(p,{body:.17+Math.max(0,s)*.18,head:.2,leftArm:.05,leftElbow:-.22,rightArm:-.6+s*.25,rightElbow:-.45-s*.15,leftKnee:.16,rightKnee:.12})
  if(state==='inspect') Object.assign(p,{head:.12,leftArm:-.48,leftElbow:-1.15,rightArm:-.65,rightElbow:-1.4,bob:Math.sin(time*1.8)*.008})
  if(state==='maintain') Object.assign(p,{body:.16,head:.2,leftArm:.1,leftElbow:-.25,rightArm:-.65,rightElbow:-.45,wrist:-.65+s*.12})
  if(state==='mrv') Object.assign(p,{head:.24,leftArm:-.65,leftElbow:-1.1,rightArm:-.7,rightElbow:-1.0,wrist:Math.sin(time*2)*.07})
  return p
}
export function smoothPose(current,target,dt) {
  const alpha=1-Math.exp(-10*Math.min(Math.max(dt,0),.1))
  for(const key of Object.keys(target)) current[key]+=(target[key]-current[key])*alpha
  return current
}
