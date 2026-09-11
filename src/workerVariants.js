export const workerVariants = [
  { id:'mali', name:'มะลิ', role:'นักปลูก', shirt:'#e5ad45', vest:'#618575', skin:'#c99168', hair:'#3b302a', pants:'#4b655f', hat:'straw', height:1.04, width:.96, home:[-8,.49,5.3], end:[-3.7,.49,2.7] },
  { id:'non', name:'นนท์', role:'ผู้ดูแลชายฝั่ง', shirt:'#cf7864', vest:'#e6c995', skin:'#986547', hair:'#302c27', pants:'#455e6d', hat:'bucket', height:.98, width:1.08, home:[4,.49,-2.7], end:[-.6,.49,1.7] },
  { id:'ing', name:'อิง', role:'นักสำรวจ', shirt:'#61a8b4', vest:'#304f66', skin:'#d6aa83', hair:'#5d4030', pants:'#6b7259', hat:'cap', height:1.08, width:.94, home:[-9.3,.49,-7.5], end:[-4.3,.49,-7.1] },
]
export const workerTools = { idle:'none', walk:'none', plant:'seedling-shovel', cleanup:'bag-picker', inspect:'notebook-binoculars', maintain:'watering-toolkit', mrv:'controller-tablet' }
export function workerTask(action) {
  if (!action) return null
  const state = {plant:'plant',clean:'cleanup',cleanup:'cleanup',clear:'cleanup',care:'maintain',maintenance:'maintain',survey:'inspect',patrol:'inspect',mrv:'mrv'}[action.type]
  if (!state) return null
  return { state, worker:state==='plant'||state==='maintain'?0:state==='cleanup'||action.type==='patrol'?1:2, plotId:action.plotId||null }
}
// Workers never participate in the scene's picking pass: plots retain priority.
export const workerRaycast = () => null
