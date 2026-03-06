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
import { ChevronDownIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Button } from "./Button"
import { EmptyState } from "./EmptyState"

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
    actions?: React.ReactNode
    pageCount?: number
    pageIndex?: number
    onPageChange?: (pageIndex: number) => void
    totalRows?: number
    loading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    filterFields = [],
    actions,
    pageCount,
    pageIndex,
    onPageChange,
    totalRows,
    loading,
    emptyTitle = "No results",
    emptyDescription,
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
        manualPagination: pageCount !== undefined,
        pageCount: pageCount,
    })

    const handlePrevious = React.useCallback(() => {
        if (onPageChange && pageIndex !== undefined) onPageChange(pageIndex - 1)
        else table.previousPage()
    }, [onPageChange, pageIndex, table])

    const handleNext = React.useCallback(() => {
        if (onPageChange && pageIndex !== undefined) onPageChange(pageIndex + 1)
        else table.nextPage()
    }, [onPageChange, pageIndex, table])

    const canPrevious = pageIndex !== undefined ? pageIndex > 0 : table.getCanPreviousPage()
    const canNext = pageIndex !== undefined && pageCount !== undefined
        ? pageIndex < pageCount - 1
        : table.getCanNextPage()

    const currentPage = (pageIndex ?? table.getState().pagination.pageIndex) + 1
    const totalPages = pageCount ?? table.getPageCount()

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-[340px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4">
                        <MagnifyingGlassIcon className="w-4 h-4" />
                    </span>
                    <input
                        placeholder={`Search by ${searchKey}...`}
                        value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn(searchKey)?.setFilterValue(event.target.value)
                        }
                        className="input-base pl-10 pr-4 py-2 bg-surface"
                    />
                </div>

                {filterFields.map((field) => (
                    <div key={field.id} className="relative">
                        <select
                            className="input-base appearance-none py-2 pr-9 pl-3.5 bg-surface cursor-pointer w-auto"
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
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-3 pointer-events-none" />
                    </div>
                ))}

                {actions && (
                    <div className="flex items-center gap-2 ml-auto">
                        {actions}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-xs overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-border bg-surface-2">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    {columns.map((_, ci) => (
                                        <td key={ci} className="px-4 py-3.5">
                                            <div className="h-4 bg-bg-2 rounded animate-pulse w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="group hover:bg-accent/[0.03] transition-colors duration-150 border-b border-border/30 last:border-0"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3.5 text-base text-text">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length}>
                                    <EmptyState
                                        title={emptyTitle}
                                        description={emptyDescription}
                                        className="py-10"
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text-3">
                    {totalRows !== undefined
                        ? `Page ${currentPage} of ${totalPages} (${totalRows} total)`
                        : `${table.getRowModel().rows.length} rows`}
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handlePrevious}
                        disabled={!canPrevious}
                    >
                        Previous
                    </Button>

                    {/* Page numbers */}
                    {totalPages > 1 && totalPages <= 7 && (
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => onPageChange ? onPageChange(i) : table.setPageIndex(i)}
                                    className={cn(
                                        "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                                        currentPage === i + 1
                                            ? "bg-accent text-white"
                                            : "text-text-3 hover:bg-bg-2"
                                    )}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleNext}
                        disabled={!canNext}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
