import { readdirSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { selectPendingMigrations, shouldAdoptBaseline, sortMigrationFiles } from "./migrator.js"

const MIGRATIONS_DIR_URL = new URL("../migrations/", import.meta.url)

describe("sortMigrationFiles", () => {
  it("keeps only .sql files", () => {
    expect(sortMigrationFiles(["0001_a.sql", "meta", "0000_b.sql", "README.md"])).toEqual([
      "0000_b.sql",
      "0001_a.sql",
    ])
  })

  it("orders zero-padded filenames lexically regardless of input order", () => {
    expect(sortMigrationFiles(["0010_c.sql", "0002_a.sql", "0001_b.sql"])).toEqual([
      "0001_b.sql",
      "0002_a.sql",
      "0010_c.sql",
    ])
  })

  it("is stable when the input is already sorted", () => {
    const files = ["0000_init.sql", "0001_monitor_stats.sql"]
    expect(sortMigrationFiles(files)).toEqual(files)
  })

  it("matches the real migrations directory in lexical apply order", () => {
    const entries = readdirSync(MIGRATIONS_DIR_URL)
    expect(sortMigrationFiles(entries)).toEqual([
      "0000_init.sql",
      "0001_monitor_stats.sql",
      "0002_change_dedupe.sql",
      "0003_app_logs.sql",
    ])
  })
})

describe("selectPendingMigrations", () => {
  const available = ["0000_init.sql", "0001_monitor_stats.sql", "0002_notifications.sql"]

  it("returns every migration when none have been applied", () => {
    expect(selectPendingMigrations(available, new Set())).toEqual(available)
  })

  it("excludes migrations already recorded as applied", () => {
    expect(selectPendingMigrations(available, new Set(["0000_init.sql"]))).toEqual([
      "0001_monitor_stats.sql",
      "0002_notifications.sql",
    ])
  })

  it("is idempotent: nothing pending once every migration is applied", () => {
    expect(selectPendingMigrations(available, new Set(available))).toEqual([])
  })

  it("ignores an applied filename that no longer exists on disk", () => {
    expect(selectPendingMigrations(available, new Set(["0099_removed.sql"]))).toEqual(available)
  })

  it("preserves lexical order even when the applied set is built out of order", () => {
    const applied = new Set(["0001_monitor_stats.sql"])
    expect(selectPendingMigrations([...available].toReversed(), applied)).toEqual([
      "0000_init.sql",
      "0002_notifications.sql",
    ])
  })
})

describe("shouldAdoptBaseline", () => {
  it("adopts when the schema exists but nothing is tracked", () => {
    expect(shouldAdoptBaseline(0, true)).toBe(true)
  })

  it("migrates normally on an empty database", () => {
    expect(shouldAdoptBaseline(0, false)).toBe(false)
  })

  it("never adopts once anything is tracked, so later migrations still apply", () => {
    expect(shouldAdoptBaseline(2, true)).toBe(false)
    expect(shouldAdoptBaseline(2, false)).toBe(false)
  })
})
