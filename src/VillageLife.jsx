import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import Part from './WorkerShape.jsx'
import { villagePlan, villageReaction, villageResidents } from './village-life.js'

const bubbleStyle={
  pointerEvents:'none',whiteSpace:'nowrap',fontSize:'11px',fontWeight:700,color:'#30483f',
  background:'rgba(255,251,232,.94)',border:'1px solid rgba(75,105,89,.22)',borderRadius:'12px',
  padding:'5px 8px',boxShadow:'0 4px 12px rgba(29,54,43,.15)',transform:'translateY(-4px)'
}

function VillagerProp({ activity }) {
  if(activity==='repair') return <group position={[.02,-.1,.08]} rotation={[0,0,-.25]}><Part shape="tube" color="#6b4c32" scale={[.035,.42,.035]} /><Part color="#86908d" position={[0,.23,0]} scale={[.2,.08,.09]} /></group>
  if(activity==='sweep') return <group position={[.04,-.18,.04]} rotation={[0,0,-.4]}><Part shape="tube" color="#8a633f" scale={[.03,.62,.03]} /><Part color="#c59b59" position={[0,-.31,0]} scale={[.25,.07,.15]} /></group>
  if(activity==='water'||activity==='nursery') return <group position={[.06,-.15,.06]}><Part color="#5f8f87" scale={[.22,.18,.16]} /><Part shape="ring" color="#87b7ae" position={[.17,.02,0]} scale={[.2,.2,.16]} rotation={[Math.PI/2,0,0]} /></group>
  if(activity==='carry'||activity==='market') return <group position={[.06,-.18,.06]}><Part color="#a97a45" scale={[.28,.16,.22]} /><Part shape="ring" color="#d1a66a" position={[0,.13,0]} scale={[.3,.23,.2]} rotation={[Math.PI/2,0,0]} /></group>
  if(activity==='nets') return <group position={[.04,-.15,.06]}><Part shape="ring" color="#d8cfaa" scale={[.24,.24,.18]} rotation={[Math.PI/2,0,0]} /><Part color="#6f8b76" position={[0,-.1,0]} scale={[.24,.08,.18]} /></group>
  return null
}

function Villager({ resident, index, action, storm }) {
  const root=useRef(), body=useRef(), leftArm=useRef(), rightArm=useRef(), leftLeg=useRef(), rightLeg=useRef()
  const clock=useRef(index*1.9), lastAction=useRef(null), reactionUntil=useRef(0), currentBubble=useRef('')
  const [bubble,setBubble]=useState('')
  const [activity,setActivity]=useState('rest')
  const reaction=villageReaction(action,resident.id)

  const updateBubble=(next)=>{
    if(currentBubble.current===next) return
    currentBubble.current=next
    setBubble(next)
  }

  useEffect(()=>{
    if(!reaction || !action?.id || lastAction.current===action.id) return
    lastAction.current=action.id
    reactionUntil.current=clock.current+4.5
    updateBubble(reaction.speak?reaction.text:'')
  },[action?.id,reaction?.text,reaction?.speak])

  useFrame((state,delta)=>{
    if(!root.current) return
    const dt=Math.min(delta,.06);clock.current+=dt
    const t=clock.current
    const plan=villagePlan(resident.id,t,storm)
    const dx=plan.point[0]-root.current.position.x,dz=plan.point[2]-root.current.position.z
    const distance=Math.hypot(dx,dz), walking=distance>.12
    if(walking){
      const speed=storm?1.05:.48+index*.035
      const step=Math.min(distance,dt*speed)
      root.current.position.x+=dx/distance*step
      root.current.position.z+=dz/distance*step
      const desired=Math.atan2(dx,dz),diff=desired-root.current.rotation.y
      root.current.rotation.y+=Math.atan2(Math.sin(diff),Math.cos(diff))*Math.min(1,dt*6)
    }
    const activeReaction=reactionUntil.current>t
    const nextActivity=walking?'walk':activeReaction?(reaction?.mood||'cheer'):plan.activity
    if(nextActivity!==activity) setActivity(nextActivity)
    const routineSpeaker=Math.floor(state.clock.elapsedTime/3)%villageResidents.length===index
    if(storm&&!walking) updateBubble(routineSpeaker?(plan.label||'พายุมา เก็บของก่อน!'):'')
    else if(activeReaction) updateBubble(reaction?.speak?reaction.text:'')
    else if(!walking&&plan.label&&routineSpeaker) updateBubble(plan.label)
    else updateBubble('')

    const swing=Math.sin(t*6+index)*.52
    const gentle=Math.sin(t*2.1+index)*.12
    body.current.position.y=Math.sin(t*3+index)*(walking?.018:.008)
    body.current.rotation.x=(nextActivity==='nursery'||nextActivity==='water') ? .16 : nextActivity==='shelter' ? .12 : 0
    leftLeg.current.rotation.x=walking?swing:0
    rightLeg.current.rotation.x=walking?-swing:0
    leftArm.current.rotation.x=walking?-swing*.72:gentle
    rightArm.current.rotation.x=walking?swing*.72:-gentle
    rightArm.current.rotation.z=0
    leftArm.current.rotation.z=0
    if(nextActivity==='repair'){rightArm.current.rotation.x=-1.05+Math.sin(t*7)*.55;leftArm.current.rotation.x=-.35}
    if(nextActivity==='sweep'){rightArm.current.rotation.x=-.55+Math.sin(t*4)*.18;leftArm.current.rotation.x=-.45-Math.sin(t*4)*.18}
    if(nextActivity==='water'||nextActivity==='nursery'){rightArm.current.rotation.x=-.85;leftArm.current.rotation.x=-.7+Math.sin(t*3)*.08}
    if(nextActivity.startsWith('chat')||nextActivity==='dock-chat'||nextActivity==='curious'){rightArm.current.rotation.z=-.55+Math.sin(t*2.3)*.12;leftArm.current.rotation.x=-.25}
    if(nextActivity==='wave'||nextActivity==='cheer'){rightArm.current.rotation.z=-1.35;rightArm.current.rotation.x=-.35+Math.sin(t*5)*.18}
    if(nextActivity==='ready'){rightArm.current.rotation.x=-.7;leftArm.current.rotation.x=-.35}
    if(nextActivity==='shelter'){rightArm.current.rotation.x=-.35;leftArm.current.rotation.x=-.35}
  })

  const brim=resident.hat==='straw'?'#e4c991':resident.hat==='bucket'?'#a8b49c':resident.shirt
  return <group name={`village-npc-${resident.id}`} ref={root} position={resident.home} scale={[.94,.94,.94]}>
    <group ref={body}>
      <Part name="villager-torso" shape="tube" color={resident.shirt} position={[0,.88,0]} scale={[.43,.48,.31]} />
      <Part color={resident.accent} position={[0,.7,.13]} scale={[.32,.055,.05]} />
      <Part name="villager-head" shape="sphere" color={resident.skin} position={[0,1.38,0]} scale={[.34,.38,.32]} />
      <Part shape="sphere" color={resident.hair} position={[0,1.47,-.05]} scale={[.34,.22,.26]} />
      <Part shape={resident.hat==='cap'?'sphere':'tube'} color={brim} position={[0,1.61,-.01]} scale={[.36,.12,.34]} />
      {resident.hat!=='cap'&&<Part shape="tube" color={brim} position={[0,1.57,0]} scale={[.5,.035,.46]} />}
      {[-1,1].map(side=>{
        const arm=side<0?leftArm:rightArm
        return <group key={`arm-${side}`} ref={arm} position={[side*.25,1.03,0]}>
          <Part shape="tube" color={resident.shirt} position={[0,-.12,0]} scale={[.13,.25,.14]} />
          <Part shape="sphere" color={resident.skin} position={[0,-.29,0]} scale={[.11,.12,.1]} />
          {side>0&&<VillagerProp activity={activity}/>} 
        </group>
      })}
      {[-1,1].map(side=>{
        const leg=side<0?leftLeg:rightLeg
        return <group key={`leg-${side}`} ref={leg} position={[side*.11,.62,0]}>
          <Part shape="tube" color={resident.pants} position={[0,-.18,0]} scale={[.14,.36,.15]} />
          <Part shape="sphere" color="#3c4f43" position={[0,-.39,.05]} scale={[.16,.13,.23]} />
        </group>
      })}
      <Part color={resident.accent} position={[-.19,.84,-.02]} scale={[.1,.16,.12]} />
    </group>
    {bubble&&<Html center position={[0,2.02,0]} zIndexRange={[3,1]} style={{pointerEvents:'none'}}><div style={bubbleStyle}>{resident.name} · {bubble}</div></Html>}
  </group>
}

export default function VillageLife({ action, storm=false }) {
  return <group name="village-life">{villageResidents.map((resident,index)=><Villager key={resident.id} resident={resident} index={index} action={action} storm={storm}/>)}</group>
}
