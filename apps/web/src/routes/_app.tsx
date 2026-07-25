import { Outlet, createFileRoute } from "@tanstack/react-router"

const AppLayout = () => <Outlet />

export const Route = createFileRoute("/_app")({ component: AppLayout })
