import { createContext, useContext, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { createWorldResources } from './world-resources.js'

const Context = createContext(null)
export function WorldResources({ children }) {
  const resources = useMemo(createWorldResources, [])
  useEffect(() => {
    // StrictMode replays effects. Defer final disposal until a replay can reclaim it.
    resources.mounted = true
    return () => {
      resources.mounted = false
      queueMicrotask(() => { if (!resources.mounted) resources.dispose() })
    }
  }, [resources])
  useFrame(({ clock }) => { resources.windTime.value = clock.elapsedTime })
  return <Context.Provider value={resources}>{children}</Context.Provider>
}
export function useWorldResources() {
  const resources = useContext(Context)
  if (!resources) throw new Error('World geometry must be inside WorldResources')
  return resources
}
