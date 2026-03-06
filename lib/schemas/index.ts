import { z } from "zod"

export const employeeSchema = z.object({
    employeeCode: z.string().min(1, "Employee code is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional().nullable(),
    designation: z.string().min(1, "Designation is required"),
    departmentId: z.string().min(1, "Department is required"),
    dateOfJoining: z.coerce.date(),
    salary: z.coerce.number().positive("Salary must be positive"),
    status: z.enum(["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
    address: z.string().optional().nullable(),
    managerId: z.string().optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
})

export const leaveSchema = z.object({
    type: z.enum(["CASUAL", "SICK", "EARNED", "MATERNITY", "PATERNITY", "UNPAID"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().min(5, "Reason must be at least 5 characters"),
    employeeId: z.string().optional(), // Can be inferred from session
})

export const updateLeaveSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
})

export const ticketSchema = z.object({
    subject: z.string().min(5, "Subject must be at least 5 characters"),
    description: z.string().min(10, "Description must be at least 10 characters").optional().nullable(),
    category: z.enum(["IT", "HR", "FACILITIES", "OTHER"]),
    priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    employeeId: z.string().optional(), // Can be inferred from session
})

export const updateTicketSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
})

export const attendanceSchema = z.object({
    date: z.coerce.date().optional(),
    checkIn: z.coerce.date().optional().nullable(),
    checkOut: z.coerce.date().optional().nullable(),
    workHours: z.coerce.number().optional().nullable(),
    status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "WEEKEND"]).default("PRESENT"),
    employeeId: z.string().optional(), // Can be inferred from session
})

export const departmentSchema = z.object({
    name: z.string().min(2, "Department name must be at least 2 characters"),
    color: z.string().optional().nullable(),
})

export const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    start: z.string().or(z.date()),
    end: z.string().or(z.date()),
    allDay: z.boolean().default(false),
    type: z.enum(["EVENT", "MEETING", "HOLIDAY"]).default("EVENT"),
})

export const announcementSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    author: z.string().min(1, "Author is required"),
    category: z.enum(["EVENT", "POLICY", "MEETING", "SYSTEM", "GENERAL"]),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    isPinned: z.boolean().default(false),
})

export const assetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["HARDWARE", "SOFTWARE", "ACCESSORY"]),
    serialNumber: z.string().min(1, "Serial number is required"),
    purchaseDate: z.coerce.date(),
    value: z.coerce.number().positive("Value must be positive"),
    image: z.string().url().optional().nullable(),
    assignedToId: z.string().optional().nullable(),
})

export const documentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    category: z.enum(["POLICY", "CONTRACT", "PAYSLIP", "TAX", "IDENTIFICATION"]),
    url: z.string().url("Must be a valid URL"),
    size: z.string().optional().nullable(),
    isPublic: z.boolean().default(false),
    employeeId: z.string().optional().nullable(), // Nullable for public docs
})

export const payrollSchema = z.object({
    month: z.string().min(1, "Month is required"),
    basicSalary: z.coerce.number().positive("Basic salary must be positive"),
    allowances: z.coerce.number().nonnegative().default(0),
    arrears: z.coerce.number().nonnegative().default(0),
    reimbursements: z.coerce.number().nonnegative().default(0),
    loansAdvances: z.coerce.number().nonnegative().default(0),
    pfDeduction: z.coerce.number().nonnegative().default(0),
    tax: z.coerce.number().nonnegative().default(0),
    otherDed: z.coerce.number().nonnegative().default(0),
    netSalary: z.coerce.number().positive("Net salary must be positive"),
    status: z.enum(["PENDING", "PROCESSED", "PAID"]).default("PENDING"),
    employeeId: z.string().min(1, "Employee ID is required"),
})

export const performanceReviewSchema = z.object({
    rating: z.coerce.number().min(0).max(5),
    progress: z.coerce.number().min(0).max(100).default(0),
    comments: z.string().optional().nullable(),
    reviewDate: z.coerce.date().optional(),
    status: z.enum(["PENDING", "COMPLETED", "EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT"]).default("PENDING"),
    employeeId: z.string().min(1, "Employee ID is required"),
    reviewerId: z.string().optional().nullable(),
    reviewType: z.enum(["MANAGER", "SELF", "PEER"]).default("MANAGER"),
    reviewPeriod: z.string().optional().nullable(),
})

export const teamSchema = z.object({
    name: z.string().min(2, "Team name must be at least 2 characters"),
    description: z.string().optional().nullable(),
    leadId: z.string().min(1, "Team lead is required"),
})

export const teamMemberSchema = z.object({
    teamId: z.string().min(1, "Team ID is required"),
    employeeId: z.string().min(1, "Employee ID is required"),
})

export const feedbackSchema = z.object({
    toEmployeeId: z.string().min(1, "Target employee is required"),
    content: z.string().min(10, "Feedback must be at least 10 characters"),
    rating: z.coerce.number().int().min(1).max(5),
    isAnonymous: z.boolean().default(false),
    period: z.string().min(1, "Period is required"), // e.g. "2026-Q1"
})

export const candidateSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional().nullable(),
    role: z.string().min(1, "Role is required"),
    status: z.enum(["NEW", "SCHEDULED", "EVALUATED", "PENDING", "ACCEPTED", "REJECTED"]).default("NEW"),
    stage: z.enum(["APPLICATION", "SCREENING", "INTERVIEW", "TECHNICAL_ROUND", "OFFER", "HIRED", "REJECTED"]).default("APPLICATION"),
    departmentId: z.string().optional().nullable(),
    interviewDate: z.string().or(z.date()).optional().nullable(),
    notes: z.string().optional().nullable(),
})

export const resignationSchema = z.object({
    reason: z.string().min(10, "Reason must be at least 10 characters"),
    lastDay: z.string().or(z.date()),
    employeeId: z.string().optional(), // Can be inferred from session
})

export const trainingSchema = z.object({
    name: z.string().min(3, "Training name must be at least 3 characters"),
    type: z.enum(["TECHNICAL", "COMPLIANCE", "SOFT_SKILLS", "ONBOARDING", "OTHER"]),
    description: z.string().optional().nullable(),
    dueDate: z.string().or(z.date()).optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
    participants: z.number().nonnegative().default(0),
})

export const providentFundSchema = z.object({
    month: z.string().min(1, "Month is required"),
    basicSalary: z.coerce.number().positive("Basic salary must be positive"),
    accountNumber: z.string().min(1, "Account number is required"),
    employeeContribution: z.coerce.number().nonnegative(),
    employerContribution: z.coerce.number().nonnegative(),
    totalContribution: z.coerce.number().nonnegative(),
    status: z.string().default("Credited"),
    employeeId: z.string().min(1, "Employee ID is required"),
})
