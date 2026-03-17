import { parse, differenceInMinutes, isSameDay } from "date-fns"

/**
 * Local type definitions replacing @prisma/client types.
 * These mirror the Django Shift, AttendancePolicy, and Holiday models.
 */
export interface Shift {
    id: string
    name: string
    startTime: string
    endTime: string
    workDays: number[]
    [key: string]: unknown
}

export interface AttendancePolicy {
    id: string
    lateGracePeriod: number
    earlyExitGrace: number
    otThreshold: number
    [key: string]: unknown
}

export interface Holiday {
    id: string
    date: Date
    name: string
    [key: string]: unknown
}

export interface AttendanceEvaluation {
    isLate: boolean
    isEarlyExit: boolean
    overtimeMinutes: number
    status: "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKEND" | "HOLIDAY"
}

/**
 * Evaluates a single attendance record against a shift and policy.
 */
export function evaluateAttendance(
    checkIn: Date | null,
    checkOut: Date | null,
    shift: Shift,
    policy: AttendancePolicy,
    holidays: Holiday[] = []
): AttendanceEvaluation {
    const today = checkIn || new Date()

    // 1. Check if Holiday
    const holiday = holidays.find(h => isSameDay(h.date, today))
    if (holiday) {
        return { isLate: false, isEarlyExit: false, overtimeMinutes: 0, status: "HOLIDAY" }
    }

    // 2. Check if Weekend
    const dayOfWeek = today.getDay() // 0-6
    if (!shift.workDays.includes(dayOfWeek)) {
        return { isLate: false, isEarlyExit: false, overtimeMinutes: 0, status: "WEEKEND" }
    }

    if (!checkIn) {
        return { isLate: false, isEarlyExit: false, overtimeMinutes: 0, status: "ABSENT" }
    }

    // Parse shift timings for today
    const shiftStart = parse(shift.startTime, "HH:mm", today)
    const shiftEnd = parse(shift.endTime, "HH:mm", today)

    // 3. Late Check
    const lateMinutes = differenceInMinutes(checkIn, shiftStart)
    const isLate = lateMinutes > policy.lateGracePeriod

    let isEarlyExit = false
    let overtimeMinutes = 0

    if (checkOut) {
        // 4. Early Exit Check
        const earlyMinutes = differenceInMinutes(shiftEnd, checkOut)
        isEarlyExit = earlyMinutes > policy.earlyExitGrace

        // 5. Overtime Check
        const extraMinutes = differenceInMinutes(checkOut, shiftEnd)
        if (extraMinutes > policy.otThreshold) {
            overtimeMinutes = extraMinutes
        }
    }

    return {
        isLate,
        isEarlyExit,
        overtimeMinutes,
        status: "PRESENT"
    }
}

/**
 * Helper to check if a specific date is a working day for an employee.
 */
export function isWorkingDay(date: Date, shift: Shift, holidays: Holiday[]): boolean {
    const isHoliday = holidays.some(h => isSameDay(h.date, date))
    if (isHoliday) return false

    return shift.workDays.includes(date.getDay())
}
