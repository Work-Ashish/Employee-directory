"use client"
import * as React from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/Button"

/**
 * Reusable CSV / Excel Import Modal.
 * Props:
 *  - isOpen / onClose  -- visibility control
 *  - title             -- module name shown in the header
 *  - templateHeaders   -- column names shown in the download template
 *  - apiEndpoint       -- the POST URL that accepts { rows: Record<string, any>[] }
 *  - onSuccess         -- called after a successful import so the parent can refresh
 */
interface ImportModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    templateHeaders: string[]
    apiEndpoint: string
    onSuccess: () => void
}

type ImportState = "idle" | "parsing" | "preview" | "importing" | "done" | "error"

export function CsvImportModal({
    isOpen,
    onClose,
    title,
    templateHeaders,
    apiEndpoint,
    onSuccess,
}: ImportModalProps) {
    const [state, setState] = React.useState<ImportState>("idle")
    const [rows, setRows] = React.useState<Record<string, any>[]>([])
    const [errorMsg, setErrorMsg] = React.useState("")
    const [importResult, setImportResult] = React.useState<{ inserted: number; skipped: number } | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const fileRef = React.useRef<HTMLInputElement>(null)

    // Reset whenever modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setState("idle")
            setRows([])
            setErrorMsg("")
            setImportResult(null)
        }
    }, [isOpen])

    function parseFile(file: File) {
        setState("parsing")
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: "array" })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const parsed: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })
                if (parsed.length === 0) {
                    setState("error")
                    setErrorMsg("The file appears to be empty or has no data rows.")
                    return
                }
                setRows(parsed)
                setState("preview")
            } catch {
                setState("error")
                setErrorMsg("Could not parse the file. Please use a valid CSV or Excel (.xlsx) file.")
            }
        }
        reader.readAsArrayBuffer(file)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) parseFile(file)
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) parseFile(file)
    }

    async function handleImport() {
        setState("importing")
        try {
            const res = await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows }),
            })
            if (!res.ok) {
                let errorMsg = "Import failed."
                try { const errJson = await res.json(); errorMsg = errJson.error || errorMsg } catch {}
                setState("error")
                setErrorMsg(errorMsg)
                return
            }
            const json = await res.json()
            setImportResult({ inserted: json.inserted ?? rows.length, skipped: json.skipped ?? 0 })
            setState("done")
            onSuccess()
        } catch {
            setState("error")
            setErrorMsg("Network error during import. Please try again.")
        }
    }

    function downloadTemplate() {
        const ws = XLSX.utils.aoa_to_sheet([templateHeaders])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_template.xlsx`)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-lg">📥</div>
                        <div>
                            <h2 className="text-lg font-bold text-text">Import {title}</h2>
                            <p className="text-xs text-text-3">Upload a CSV or Excel file to bulk-import records</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-2 text-text-3 hover:text-text transition-colors text-lg">&times;</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* Idle / drag zone */}
                    {(state === "idle" || state === "parsing") && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${isDragging ? "border-accent bg-accent/[0.06]" : "border-border-2 hover:border-accent hover:bg-accent/[0.03]"}`}
                        >
                            <div className="text-4xl">{state === "parsing" ? "⏳" : "📂"}</div>
                            <p className="text-md font-semibold text-text">
                                {state === "parsing" ? "Parsing file..." : "Drop a CSV or Excel file here"}
                            </p>
                            <p className="text-sm text-text-3">or click to browse -- supports .csv, .xlsx, .xls</p>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
                        </div>
                    )}

                    {/* Template download */}
                    {state === "idle" && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg border border-border">
                            <span className="text-xl">📋</span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-text">Need a template?</p>
                                <p className="text-xs text-text-3">Download a pre-formatted Excel file with the correct column headers</p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={downloadTemplate}
                            >
                                ⬇ Template
                            </Button>
                        </div>
                    )}

                    {/* Preview */}
                    {state === "preview" && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-text">Preview -- {rows.length} row{rows.length !== 1 ? "s" : ""} detected</p>
                                <button onClick={() => { setState("idle"); setRows([]) }} className="text-xs text-text-3 hover:text-text underline">Choose another file</button>
                            </div>
                            <div className="overflow-auto max-h-[320px] rounded-xl border border-border">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 bg-surface-2">
                                        <tr>
                                            {Object.keys(rows[0]).map((k) => (
                                                <th key={k} className="px-3 py-2 text-left font-bold text-text-3 uppercase tracking-wide whitespace-nowrap border-b border-border">
                                                    {k}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.slice(0, 8).map((row, i) => (
                                            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg">
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} className="px-3 py-2 text-text-2 whitespace-nowrap max-w-[160px] truncate">
                                                        {String(v)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {rows.length > 8 && (
                                            <tr>
                                                <td colSpan={Object.keys(rows[0]).length} className="px-3 py-2 text-center text-text-3 font-medium">
                                                    ...and {rows.length - 8} more rows
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-text-3 bg-accent/[0.06] rounded-lg px-3 py-2 border border-accent/15">
                                Rows where a matching employee cannot be found will be skipped. All other validation errors will be reported after import.
                            </p>
                        </>
                    )}

                    {/* Importing */}
                    {state === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />
                            <p className="text-md font-semibold text-text">Importing {rows.length} records...</p>
                        </div>
                    )}

                    {/* Done */}
                    {state === "done" && importResult && (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <div className="text-5xl">✅</div>
                            <p className="text-lg font-bold text-text">Import Complete!</p>
                            <div className="flex gap-6 text-center">
                                <div className="px-5 py-3 rounded-xl bg-success/10 border border-success/20">
                                    <div className="text-2xl font-extrabold text-success">{importResult.inserted}</div>
                                    <div className="text-xs text-success font-semibold">Inserted</div>
                                </div>
                                {importResult.skipped > 0 && (
                                    <div className="px-5 py-3 rounded-xl bg-warning/10 border border-warning/20">
                                        <div className="text-2xl font-extrabold text-warning">{importResult.skipped}</div>
                                        <div className="text-xs text-warning font-semibold">Skipped</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {state === "error" && (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <div className="text-5xl">⚠️</div>
                            <p className="text-md font-semibold text-text">Import Failed</p>
                            <p className="text-sm text-center text-text-3 max-w-sm">{errorMsg}</p>
                            <Button variant="secondary" size="sm" onClick={() => setState("idle")}>
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface-2 rounded-b-2xl">
                    {state === "done" ? (
                        <Button onClick={onClose}>
                            Done
                        </Button>
                    ) : state === "preview" ? (
                        <>
                            <Button variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleImport} leftIcon={<span>📥</span>}>
                                Import {rows.length} Records
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
