import { useEffect } from "react"

export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
