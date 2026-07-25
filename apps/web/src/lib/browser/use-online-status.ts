import { useSyncExternalStore } from "react"

const subscribe = (onStoreChange: () => void) => {
  addEventListener("online", onStoreChange)
  addEventListener("offline", onStoreChange)
  return () => {
    removeEventListener("online", onStoreChange)
    removeEventListener("offline", onStoreChange)
  }
}

const isOnline = () => navigator.onLine

const isOnlineOnServer = () => true

export const useIsOnline = (): boolean =>
  useSyncExternalStore(subscribe, isOnline, isOnlineOnServer)
