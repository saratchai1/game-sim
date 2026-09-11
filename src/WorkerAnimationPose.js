export const POSE_KEYS = ['body','head','bob','leftArm','rightArm','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee','wrist']
export function workerPose(state, time, output = {}) {
  const s=Math.sin(time*3.5), stride=Math.sin(time*8)
  const p = output
  p.body=0; p.head=0; p.bob=Math.sin(time*1.8)*.008
  p.leftArm=.08; p.rightArm=-.08; p.leftElbow=-.12; p.rightElbow=-.12
  p.leftHip=0; p.rightHip=0; p.leftKnee=.06; p.rightKnee=.06; p.wrist=0
  if(state==='walk'){p.bob=Math.abs(stride)*.045;p.leftArm=-stride*.5;p.rightArm=stride*.5;p.leftHip=stride*.48;p.rightHip=-stride*.48;p.leftKnee=Math.max(0,-stride)*.65;p.rightKnee=Math.max(0,stride)*.65}
  if(state==='plant'){p.body=.42+s*.08;p.head=.2;p.leftArm=-.55;p.leftElbow=-.65;p.rightArm=-.8+s*.35;p.rightElbow=-.6-s*.25;p.leftHip=-.48;p.rightHip=-.24;p.leftKnee=.75;p.rightKnee=.45;p.bob=-.15+s*.025}
  if(state==='cleanup'){p.body=.17+Math.max(0,s)*.18;p.head=.2;p.leftArm=.05;p.leftElbow=-.22;p.rightArm=-.6+s*.25;p.rightElbow=-.45-s*.15;p.leftKnee=.16;p.rightKnee=.12}
  if(state==='inspect'){p.head=.12;p.leftArm=-.48;p.leftElbow=-1.15;p.rightArm=-.65;p.rightElbow=-1.4;p.bob=Math.sin(time*1.8)*.008}
  if(state==='maintain'){p.body=.16;p.head=.2;p.leftArm=.1;p.leftElbow=-.25;p.rightArm=-.65;p.rightElbow=-.45;p.wrist=-.65+s*.12}
  if(state==='mrv'){p.head=.24;p.leftArm=-.65;p.leftElbow=-1.1;p.rightArm=-.7;p.rightElbow=-1.0;p.wrist=Math.sin(time*2)*.07}
  return p
}
export function smoothPose(current,target,dt) {
  const alpha=1-Math.exp(-10*Math.min(Math.max(dt,0),.1))
  for(const key of POSE_KEYS) current[key]+=(target[key]-current[key])*alpha
  return current
}
