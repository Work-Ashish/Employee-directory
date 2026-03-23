/**
 * File-backed salary store.
 *
 * Django's Employee model has no salary field. This module persists
 * salary data to a JSON file so it survives server restarts and
 * Next.js hot reloads. For production, back with a database.
 */
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const SALARY_FILE = join(process.cwd(), ".salary-data.json")

function loadFromDisk(): Map<string, number> {
    const map = new Map<string, number>()
    try {
        if (existsSync(SALARY_FILE)) {
            const raw = readFileSync(SALARY_FILE, "utf-8")
            const data = JSON.parse(raw) as Record<string, number>
            for (const [id, salary] of Object.entries(data)) {
                map.set(id, salary)
            }
        }
    } catch { /* file missing or corrupt — start fresh */ }
    return map
}

function saveToDisk(map: Map<string, number>): void {
    try {
        const data: Record<string, number> = {}
        for (const [id, salary] of map) {
            data[id] = salary
        }
        writeFileSync(SALARY_FILE, JSON.stringify(data, null, 2), "utf-8")
    } catch { /* non-critical — will retry on next write */ }
}

// Load once on module init, then keep in sync
const _store = loadFromDisk()

/**
 * Reload from disk to pick up writes from other module instances
 * (Next.js dev mode can have multiple instances of this module).
 */
function reloadFromDisk(): void {
    try {
        if (existsSync(SALARY_FILE)) {
            const raw = readFileSync(SALARY_FILE, "utf-8")
            const data = JSON.parse(raw) as Record<string, number>
            _store.clear()
            for (const [id, salary] of Object.entries(data)) {
                _store.set(id, salary)
            }
        }
    } catch { /* proceed with in-memory data */ }
}

export const salaryStore = {
    get(employeeId: string): number | undefined {
        reloadFromDisk()
        return _store.get(employeeId)
    },
    set(employeeId: string, salary: number): void {
        reloadFromDisk()
        _store.set(employeeId, salary)
        saveToDisk(_store)
    },
    getAll(): Record<string, number> {
        reloadFromDisk()
        const data: Record<string, number> = {}
        for (const [id, salary] of _store) {
            data[id] = salary
        }
        return data
    },
    setBatch(entries: Array<{ employeeId: string; salary: number }>): void {
        reloadFromDisk()
        for (const entry of entries) {
            _store.set(entry.employeeId, entry.salary)
        }
        saveToDisk(_store)
    },
}
