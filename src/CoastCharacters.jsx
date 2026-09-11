import WorkerCharacter from './WorkerCharacter.jsx'
import { workerVariants } from './workerVariants.js'
export default function CoastCharacters({ action, target }) {
  return <group>{workerVariants.map((variant,index)=><WorkerCharacter key={variant.id} variant={variant} index={index} action={action} target={target} />)}</group>
}
