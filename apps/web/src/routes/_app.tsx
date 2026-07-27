import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { checkSession, resolveAppGuardRedirect } from "../features/auth"

const AppLayout = () => <Outlet />

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const isAuthenticated = await checkSession(context.queryClient)
    const redirectTo = resolveAppGuardRedirect(isAuthenticated)
    if (redirectTo !== null) throw redirect({ to: redirectTo })
  },
  component: AppLayout,
})
