import type { ReactNode } from "react"

import { cn } from "../../lib/utils"
import type { Density } from "../../stores/ui"

export interface DataTableColumn<T> {
  readonly id: string
  readonly header: string
  readonly cell: (row: T) => ReactNode
  readonly align?: "start" | "end"
  readonly numeric?: boolean
  readonly width?: string
}

export interface DataTableProperties<T> {
  readonly columns: readonly DataTableColumn<T>[]
  readonly rows: readonly T[]
  readonly getRowId: (row: T) => string
  readonly caption: string
  readonly density?: Density | undefined
  readonly onRowClick?: ((row: T) => void) | undefined
  readonly className?: string | undefined
}

const ROW_HEIGHT: Readonly<Record<Density, string>> = {
  comfortable: "h-row-comfortable",
  compact: "h-row-compact",
}

export const DataTable = <T,>({
  columns,
  rows,
  getRowId,
  caption,
  density = "comfortable",
  onRowClick,
  className,
}: DataTableProperties<T>) => (
  <div className={cn("overflow-x-auto rounded-lg border border-line bg-surface", className)}>
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-line">
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              style={column.width === undefined ? undefined : { width: column.width }}
              className={cn(
                "px-4 py-2.5 eyebrow text-ink-subtle whitespace-nowrap",
                column.align === "end" && "text-right",
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={getRowId(row)}
            onClick={
              onRowClick === undefined
                ? undefined
                : () => {
                    onRowClick(row)
                  }
            }
            className={cn(
              "border-b border-line last:border-0",
              ROW_HEIGHT[density],
              onRowClick === undefined ? undefined : "cursor-pointer hover:bg-sunken",
            )}
          >
            {columns.map((column) => (
              <td
                key={column.id}
                className={cn(
                  "px-4 text-body text-ink",
                  column.align === "end" && "text-right",
                  column.numeric === true && "font-mono text-mono-data tabular-nums",
                )}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
