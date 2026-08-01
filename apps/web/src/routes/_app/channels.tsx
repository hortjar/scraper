import { Outlet, createFileRoute } from "@tanstack/react-router"

const ChannelsLayout = () => <Outlet />

export const Route = createFileRoute("/_app/channels")({ component: ChannelsLayout })
