import { useSyncExternalStore } from "react"

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("online", onStoreChange)
  window.addEventListener("offline", onStoreChange)
  return () => {
    window.removeEventListener("online", onStoreChange)
    window.removeEventListener("offline", onStoreChange)
  }
}

const getSnapshot = () => window.navigator.onLine

const getServerSnapshot = () => true

export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
