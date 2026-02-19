"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ChevronDownIcon, MagnifyingGlassIcon, ChevronUpIcon, CaretSortIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

interface FilterField {
    id: string
    label: string
    options: string[]
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey: string
    filterFields?: FilterField[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    filterFields = [],
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-[12px] flex-wrap">
                <div className="relative flex-1 max-w-[340px]">
                    <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--text4)]">
                        <MagnifyingGlassIcon className="w-4 h-4" />
                    </span>
                    <input
                        placeholder={`Search by ${searchKey}...`}
                        value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn(searchKey)?.setFilterValue(event.target.value)
                        }
                        className="w-full pl-[38px] pr-[14px] py-[9px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text)] outline-none transition-all duration-200 shadow-sm focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]"
                    />
                </div>

                {filterFields.map((field) => (
                    <div key={field.id} className="relative">
                        <select
                            className="p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] cursor-pointer outline-none transition-all duration-200 shadow-sm hover:border-[var(--border2)] pr-8 appearance-none"
                            onChange={(e) => {
                                const value = e.target.value === "All" ? "" : e.target.value;
                                table.getColumn(field.id)?.setFilterValue(value);
                            }}
                        >
                            <option value="All">All {field.label}</option>
                            {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text3)] pointer-events-none" />
                    </div>
                ))}
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <th key={header.id} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="p-[13px_18px]">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-[var(--text3)] text-[13px]">
                                    No results.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-[12.5px] text-[var(--text3)]">
                    Showing {table.getRowModel().rows.length} rows
                </div>
                <div className="space-x-2">
                    <button
                        className={cn("px-3 py-1 text-[12px] border border-[var(--border)] rounded-md hover:bg-[var(--bg2)] disabled:opacity-50", !table.getCanPreviousPage() && "pointer-events-none opacity-50")}
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </button>
                    <button
                        className={cn("px-3 py-1 text-[12px] border border-[var(--border)] rounded-md hover:bg-[var(--bg2)] disabled:opacity-50", !table.getCanNextPage() && "pointer-events-none opacity-50")}
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
