import { customType, timestamp, uuid } from "drizzle-orm/pg-core"

export const primaryId = () => uuid("id").primaryKey().defaultRandom()

export const citext = customType<{ data: string }>({
  dataType: () => "citext",
})

export const bytea = customType<{ data: Buffer }>({
  dataType: () => "bytea",
})

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })

export const nullableTimestamp = (name: string) => timestamptz(name)

export const timestamps = () => ({
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
})
