import { Outlet, createFileRoute } from "@tanstack/react-router"

const MonitorDetailLayout = () => <Outlet />

export const Route = createFileRoute("/_app/monitors/$monitorId")({
  component: MonitorDetailLayout,
})
