import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A single low-resolution surface: analytic ripples, shore tint and sun glints.
// No texture download, reflection pass, or postprocessing dependency.
export default function LivingWater({ tide, storm, score, golden }) {
  const group = useRef()
  const material = useRef()
  const targets = useMemo(() => ({
    deep: new THREE.Color(storm ? '#214d5d' : golden ? '#246f76' : '#166f83'),
    shallow: new THREE.Color(storm ? '#759a96' : score > 50 ? '#6acbb0' : '#80b6a6'),
    glint: new THREE.Color(golden ? '#ffe0a3' : '#d2fff4'),
  }), [storm, score > 50, golden])
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uStorm: { value: 0 },
    uDeep: { value: new THREE.Color('#166f83') }, uShallow: { value: new THREE.Color('#80b6a6') },
    uGlint: { value: new THREE.Color('#d2fff4') },
  }), [])
  useFrame((state, delta) => {
    if (!material.current || !group.current) return
    const u = material.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    const ease = 1 - Math.exp(-2 * Math.min(delta, .1))
    u.uDeep.value.lerp(targets.deep, ease)
    u.uShallow.value.lerp(targets.shallow, ease)
    u.uGlint.value.lerp(targets.glint, ease)
    u.uStorm.value = THREE.MathUtils.lerp(u.uStorm.value, storm ? 1 : 0, ease)
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, -.58 + tide, 2, delta)
  })
  return <mesh ref={group} position={[0, -.58 + tide, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[90, 80, 72, 64]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`
      uniform float uTime; uniform float uStorm; varying vec2 vWorld;
      void main() {
        vec3 p = position; vWorld = p.xy;
        p.z += (sin(p.x * .9 + uTime * 1.1) * cos(p.y * .6 + uTime * .7)) * (.035 + uStorm * .06);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`} fragmentShader={`
      uniform float uTime; uniform float uStorm; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uGlint;
      varying vec2 vWorld;
      void main() {
        vec2 p = vWorld;
        float shore = 1.0 - smoothstep(10.0, 23.0, length(p * vec2(.85,1.0)));
        float wave = sin(p.x * 2.3 + p.y * 1.4 + uTime * 1.3) * sin(p.x * .7 - p.y * 2.8 - uTime * .8);
        float glint = pow(max(0.0, wave), 24.0) * (.12 + uStorm * .12);
        float band = sin(p.y * .55 + p.x * .17 + uTime * .35) * .025;
        vec3 color = mix(uDeep, uShallow, shore * .6 + band);
        color = mix(color, uGlint, glint);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
}
