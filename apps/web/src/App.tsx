import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { I18nextProvider } from "react-i18next"

import { ToastProvider, ToastViewport } from "./components/ui/Toast"
import { TooltipProvider } from "./components/ui/Tooltip"
import { i18n } from "./i18n"
import { createQueryClient } from "./lib/api"
import { router } from "./router"

const queryClient = createQueryClient()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <ToastViewport />
        </ToastProvider>
      </TooltipProvider>
    </I18nextProvider>
  </QueryClientProvider>
)
