import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import Part from './WorkerShape.jsx'
import WorkerProp from './WorkerProp.jsx'
import { workerPose, smoothPose } from './WorkerAnimationPose.js'
import { workerTask } from './workerVariants.js'
import { useMotionBudget } from './useMotionBudget.js'
const JOINT_KEYS = ['leftArm','rightArm','leftElbow','rightElbow','leftHip','rightHip','leftKnee','rightKnee']

const labels={plant:'ปลูกต้นกล้า',cleanup:'เก็บและเตรียมพื้นที่',inspect:'สำรวจถิ่นอาศัย',maintain:'ดูแลต้นไม้',mrv:'ตรวจ MRV'}
export default function WorkerCharacter({ variant:v, index, action, target }) {
  const label=useRef()
  const root=useRef(), body=useRef(), head=useRef(), joints=useRef({}), props=useRef({})
  const clock=useRef(index*4), assignment=useRef(null), lastAction=useRef(null), pose=useRef(workerPose('idle',0))
  const poseTarget = useRef({}), lastProp = useRef(null), labelVisible = useRef(false)
  const motionDue = useMotionBudget(root, index)
  const task=workerTask(action)
  const accent=v.accent||'#e8dfc3', gear=v.gear||'#56645d'
  const relevant=task?.worker===index
  useEffect(()=>{
    if(!relevant || lastAction.current===action?.id) return
    lastAction.current=action.id
    assignment.current={state:task.state,target:target||v.end,expires:clock.current+45,arrived:null, facePlot:Boolean(task.plotId)}
  },[action,relevant,target,v.end,task?.state])
  useFrame((frame,delta)=>{
    if(!root.current) return
    const dt=Math.min(delta,.06);clock.current+=dt
    const t=clock.current
    let job=assignment.current
    if(job&&(t>job.expires||job.arrived!==null&&t-job.arrived>6)){assignment.current=null;job=null}
    const goal=job?job.target:t%22<11?v.end:v.home
    const dx=goal[0]-root.current.position.x,dz=goal[2]-root.current.position.z,distance=Math.hypot(dx,dz)
    const walking=distance>.15
    if(walking){
      const step=Math.min(distance,dt*(job?1.25:.7));root.current.position.x+=dx/distance*step;root.current.position.z+=dz/distance*step
      const desired=Math.atan2(dx,dz),angle=desired-root.current.rotation.y
      root.current.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,dt*8)
    }else if(job){
      if(job.arrived===null)job.arrived=t
      const desired=job.facePlot?-Math.PI/2:Math.PI/4
      const angle=desired-root.current.rotation.y
      root.current.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,dt*7)
    }
    const state=walking?'walk':job?job.state:'idle'
    if(label.current && labelVisible.current !== Boolean(job)) { labelVisible.current=Boolean(job); label.current.style.display=job?'block':'none' }
    root.current.userData.workerState=state
    root.current.userData.workerTask=job?.state||null
    if(lastProp.current !== (job?.state || null)) {
      lastProp.current = job?.state || null
      for(const [key,node] of Object.entries(props.current)) if(node) node.visible=key.startsWith(job?.state+'-')
    }
    const poseDelta = motionDue(frame.clock.elapsedTime, dt)
    if (!poseDelta) return
    const p=smoothPose(pose.current,workerPose(state,t,poseTarget.current),poseDelta)
    body.current.rotation.x=p.body;body.current.position.y=p.bob
    head.current.rotation.x=p.head
    head.current.rotation.y=state==='idle'?Math.sin(t*.7)*.16:0
    for(const key of JOINT_KEYS)joints.current[key].rotation.x=p[key]
    joints.current.rightHand.rotation.z=p.wrist
  })
  const ref=(key)=>(node)=>{joints.current[key]=node}
  return <group name={`crew-${index}`} ref={root} position={v.home} scale={[1.27*v.width,1.27*v.height,1.27]}>
    <group ref={body}>
      <Part name="hips" color={v.pants} position={[0,.61,0]} scale={[.34,.19,.23]} />
      <Part name="torso" shape="tube" color={v.shirt} position={[0,.92,0]} scale={[.5,.49,.33]} />
      <Part name="belt" color="#665441" position={[0,.69,0]} scale={[.37,.055,.25]} />
      <Part name="belt-buckle" color={accent} position={[0,.69,.137]} scale={[.065,.05,.016]} />
      <Part name="utility-bag" color={gear} position={[-.23,.66,-.02]} scale={[.12,.18,.14]} />
      <Part name="cross-body-strap" color={gear} position={[.015,.94,.182]} scale={[.038,.49,.025]} rotation={[0,0,-.4]} />
      <Part name="field-badge" color={accent} position={[.12,1.04,.185]} scale={[.075,.055,.014]} />
      <Part name="shirt-collar-left" color={accent} position={[-.07,1.16,.15]} scale={[.11,.07,.022]} rotation={[0,0,-.42]} />
      <Part name="shirt-collar-right" color={accent} position={[.07,1.16,.15]} scale={[.11,.07,.022]} rotation={[0,0,.42]} />
      {[-1,1].map(side=><group key={side}>
        <Part name="vest-panel" color={v.vest} position={[side*.115,.95,.14]} scale={[.15,.37,.045]} rotation={[0,0,side*.05]} />
        <Part color="#d5cbaa" position={[side*.115,.94,.17]} scale={[.11,.035,.015]} />
        <Part color={v.vest} position={[side*.115,.85,.17]} scale={[.11,.095,.025]} />
      </group>)}
      <Part name="neck" shape="tube" color={v.skin} position={[0,1.205,0]} scale={[.13,.14,.13]} />
      <group position={[-.27,1.09,.09]} rotation={[0,0,-.08]}>
        <Part name="field-radio" color={gear} scale={[.08,.12,.05]} />
        <Part name="radio-screen" color="#9bc9c7" position={[0,.025,.055]} scale={[.047,.03,.008]} />
        <Part name="radio-antenna" shape="tube" color="#3e4c48" position={[-.035,.115,0]} scale={[.012,.13,.012]} rotation={[0,0,-.18]} />
      </group>
      <group ref={head} position={[0,1.4,0]}>
        <Part name="head" shape="sphere" color={v.skin} scale={[.39,.43,.36]} />
        <Part name="hair" shape="sphere" color={v.hair} position={[0,.085,-.055]} scale={[.39,.29,.29]} />
        {v.hairStyle==='bun'&&<Part name="hair-bun" shape="sphere" color={v.hair} position={[0,.08,-.29]} scale={[.18,.18,.16]} />}
        {v.hairStyle==='ponytail'&&<Part name="ponytail" shape="tube" color={v.hair} position={[0,-.02,-.31]} scale={[.11,.28,.11]} rotation={[.28,0,0]} />}
        {[-1,1].map(side=><group key={side}><Part name="ear" shape="sphere" color={v.skin} position={[side*.195,-.015,0]} scale={[.065,.09,.05]} /><Part color="#25392f" position={[side*.066,.012,.174]} scale={[.027,.039,.013]} /><Part color={v.hair} position={[side*.066,.062,.167]} scale={[.057,.018,.018]} rotation={[0,0,side*.1]} /><Part shape="sphere" color="#c78565" position={[side*.1,-.06,.155]} scale={[.07,.033,.015]} /></group>)}
        <Part name="nose" shape="sphere" color={v.skin} position={[0,-.027,.182]} scale={[.05,.055,.05]} />
        <Part name="mouth" color="#814c3a" position={[0,-.091,.163]} scale={[.056,.014,.016]} />
        {v.facialHair&&<><Part name="moustache-left" color={v.hair} position={[-.035,-.068,.172]} scale={[.047,.014,.013]} rotation={[0,0,-.12]} /><Part name="moustache-right" color={v.hair} position={[-.0,-.068,.172]} scale={[.047,.014,.013]} rotation={[0,0,.12]} /></>}
        <Part name="hat-crown" shape={v.hat==='cap'?'sphere':'tube'} color={v.hat==='straw'?'#ddc58e':v.hat==='bucket'?'#c0c3a0':v.vest} position={[0,.225,-.015]} scale={[.4,v.hat==='cap'?.18:.16,.37]} />
        {v.hat==='cap'?<Part name="hat-brim" shape="sphere" color={v.vest} position={[0,.18,.2]} scale={[.4,.04,.3]} />:<Part name="hat-brim" shape="tube" color={v.hat==='straw'?'#eddaa6':'#c4caaa'} position={[0,.17,0]} scale={[v.hat==='straw'?.65:.49,.04,v.hat==='straw'?.58:.46]} />}
        <Part name="hat-band" shape="tube" color={v.shirt} position={[0,.18,-.014]} scale={[.405,.035,.38]} />
      </group>
      {[-1,1].map(side=>{const key=side<0?'left':'right';return <group key={key}>
        <group ref={ref(key+'Arm')} position={[side*.255,1.075,0]} rotation={[0,0,side*-.08]}>
          <Part name="shoulder" shape="sphere" color={v.shirt} scale={[.2,.22,.22]} />
          <Part name="upper-arm" shape="tube" color={v.shirt} position={[0,-.12,0]} scale={[.155,.24,.16]} />
          <Part name="sleeve-cuff" color={accent} position={[0,-.21,0]} scale={[.145,.05,.16]} />
          <group ref={ref(key+'Elbow')} position={[0,-.235,0]}>
            <Part name="elbow" shape="sphere" color={v.skin} scale={[.125,.125,.125]} />
            <Part name="forearm" shape="tube" color={v.skin} position={[0,-.115,0]} scale={[.115,.22,.12]} />
            <group ref={ref(key+'Hand')} position={[0,-.25,0]}>
              <Part name="hand" shape="sphere" color={v.skin} scale={[.12,.14,.095]} />
              <Part name="thumb" shape="sphere" color={v.skin} position={[-side*.055,.015,.015]} scale={[.05,.065,.05]} />
              {['plant','cleanup','inspect','maintain','mrv'].map(state=><group key={state} visible={false} ref={node=>{props.current[state+'-'+key]=node}}><WorkerProp state={state} hand={key} /></group>)}
            </group>
          </group>
        </group>
        <group ref={ref(key+'Hip')} position={[side*.1,.61,0]}>
          <Part name="thigh" shape="tube" color={v.pants} position={[0,-.115,0]} scale={[.16,.24,.18]} />
          <group ref={ref(key+'Knee')} position={[0,-.245,0]}>
            <Part name="knee" shape="sphere" color={v.pants} scale={[.15,.14,.165]} />
            <Part name="knee-pad" color={gear} position={[0,-.005,.13]} scale={[.12,.09,.035]} />
            <Part name="shin" shape="tube" color={v.pants} position={[0,-.105,0]} scale={[.135,.22,.15]} />
            <Part name="boot-shaft" shape="tube" color="#465b4f" position={[0,-.16,0]} scale={[.17,.19,.185]} />
            <Part name="boot-toe" shape="sphere" color="#3c4f43" position={[0,-.27,.055]} scale={[.19,.15,.3]} />
            <Part name="boot-sole" color="#b3a078" position={[0,-.31,.047]} scale={[.185,.036,.25]} />
            <Part name="boot-trim" color={accent} position={[0,-.16,.17]} scale={[.12,.025,.03]} />
          </group>
        </group>
      </group>})}
    </group>
    {relevant&&<Html center position={[0,2,0]} zIndexRange={[2,1]} style={{pointerEvents:'none'}}><div ref={label} className="character-name"><b>{v.name} · {labels[task.state]}</b></div></Html>}
  </group>
}
