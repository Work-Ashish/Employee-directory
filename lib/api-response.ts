import { NextResponse } from "next/server"
import { logContext } from "@/lib/logger"

/**
 * Standardized API Response Envelope
 */
export interface ApiResponse<T = unknown> {
    data?: T
    error?: {
        code: string
        message: string
        details?: unknown
    }
    meta?: {
        total?: number
        page?: number
        limit?: number
        perPage?: number  // Django pagination alias
        totalPages?: number
        requestId?: string
        timestamp?: string
        [key: string]: unknown
    }
}

/**
 * Global API Error Codes
 */
export enum ApiErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    CONFLICT = "CONFLICT",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    BAD_REQUEST = "BAD_REQUEST",
    RATE_LIMITED = "RATE_LIMITED",
}

/**
 * Helper to create a success response
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
    const context = logContext.getStore()
    const response: ApiResponse<T> = {
        data,
        meta: {
            requestId: context?.requestId,
            timestamp: new Date().toISOString(),
            ...meta
        }
    }
    return NextResponse.json(response, { status })
}

/**
 * Helper to create an error response
 */
export function apiError(message: string, code: ApiErrorCode | string, status = 400, details?: unknown) {
    const context = logContext.getStore()
    const response: ApiResponse = {
        error: {
            code,
            message,
            details
        },
        meta: {
            requestId: context?.requestId,
            timestamp: new Date().toISOString()
        }
    }
    return NextResponse.json(response, { status })
}
