import { Outlet, createFileRoute } from "@tanstack/react-router"

const AuthLayout = () => <Outlet />

export const Route = createFileRoute("/_auth")({ component: AuthLayout })
