import { Outlet, createFileRoute } from "@tanstack/react-router"

const MonitorsLayout = () => <Outlet />

export const Route = createFileRoute("/_app/monitors")({ component: MonitorsLayout })
