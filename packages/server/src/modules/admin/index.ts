import { Layer } from "effect"

import { AdminRepository } from "./admin.repository.js"
import { Admin } from "./admin.service.js"

export { ADMIN_ACTION, ADMIN_OPERATION_ID, ADMIN_PATH, ADMIN_PLUGIN } from "./admin.constants.js"
export { AdminRepository, AdminRepositoryLive } from "./admin.repository.js"
export { adminRoutes, type AdminServices } from "./admin.routes.js"
export { AdminStatsDto } from "./admin.schema.js"
export { Admin, AdminLive } from "./admin.service.js"
export { makeQueueBoard, type BoardQueues } from "./queue-board.js"

export const AdminLayer = Layer.mergeAll(Admin.Default, AdminRepository.Default)
