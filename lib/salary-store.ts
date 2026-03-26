/**
 * File-backed salary store.
 *
 * Django's Employee model has no salary field. This module persists
 * salary data to a JSON file so it survives server restarts and
 * Next.js hot reloads. For production, back with a database.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync } from "fs"
import { join } from "path"

const SALARY_FILE = join(process.cwd(), ".salary-data.json")
const LOCK_PATH = join(process.cwd(), ".salary-data.lock")

function acquireLock(): boolean {
    try { mkdirSync(LOCK_PATH); return true; } catch { return false; }
}

function releaseLock(): void {
    try { rmdirSync(LOCK_PATH); } catch { /* lock already released */ }
}

/** Spin-wait to acquire the file lock (max ~500ms) */
function waitForLock(): boolean {
    for (let i = 0; i < 50; i++) {
        if (acquireLock()) return true
        // Synchronous busy-wait ~10ms (acceptable for file-backed store)
        const end = Date.now() + 10
        while (Date.now() < end) { /* spin */ }
    }
    return false
}

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
        const locked = waitForLock()
        try {
            reloadFromDisk()
            return _store.get(employeeId)
        } finally {
            if (locked) releaseLock()
        }
    },
    set(employeeId: string, salary: number): void {
        const locked = waitForLock()
        try {
            reloadFromDisk()
            _store.set(employeeId, salary)
            saveToDisk(_store)
        } finally {
            if (locked) releaseLock()
        }
    },
    getAll(): Record<string, number> {
        const locked = waitForLock()
        try {
            reloadFromDisk()
            const data: Record<string, number> = {}
            for (const [id, salary] of _store) {
                data[id] = salary
            }
            return data
        } finally {
            if (locked) releaseLock()
        }
    },
    setBatch(entries: Array<{ employeeId: string; salary: number }>): void {
        const locked = waitForLock()
        try {
            reloadFromDisk()
            for (const entry of entries) {
                _store.set(entry.employeeId, entry.salary)
            }
            saveToDisk(_store)
        } finally {
            if (locked) releaseLock()
        }
    },
}
