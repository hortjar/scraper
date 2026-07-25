import { Outlet, createRootRoute } from "@tanstack/react-router"

import { useDocumentTitle } from "../lib/browser"
import { appConfig } from "../lib/config"

const RootLayout = () => {
  useDocumentTitle(appConfig.appTitle)
  return <Outlet />
}

export const Route = createRootRoute({ component: RootLayout })
