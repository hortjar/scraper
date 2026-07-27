import type { QueryClient } from "@tanstack/react-query"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"

import { useDocumentTitle } from "../lib/browser"
import { appConfig } from "../lib/config"

export interface RouterContext {
  readonly queryClient: QueryClient
}

const RootLayout = () => {
  useDocumentTitle(appConfig.appTitle)
  return <Outlet />
}

export const Route = createRootRouteWithContext<RouterContext>()({ component: RootLayout })
