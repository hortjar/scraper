export const DELIVERY_PLUGIN = {
  routes: "deliveries/routes",
  handlers: "deliveries/handlers",
} as const

export const DELIVERY_PATH = {
  root: "",
  retry: "/:deliveryId/retry",
} as const
