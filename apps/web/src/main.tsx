import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import { applyStoredTheme } from "./stores/preferences"
import "./styles/index.css"

applyStoredTheme()

const container = document.querySelector("#root")

if (container === null) {
  throw new Error("Missing #root container")
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
