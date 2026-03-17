/**
 * DEPRECATED — Auth is now handled by Django SimpleJWT (Sprint 12).
 *
 * This file is kept as a stub for backward compatibility with test files
 * that still import { auth } from "@/lib/auth". The real server-side
 * session resolution lives in lib/auth-server.ts (getServerSession).
 *
 * TODO: Remove this file once all test imports are updated.
 */
import { getServerSession, type ServerSession } from "@/lib/auth-server"

/** @deprecated Use getServerSession() from lib/auth-server instead. */
export const auth = getServerSession

/** @deprecated Auth is handled by Django. These are no-ops. */
export async function signIn() { throw new Error("Use Django /api/v1/auth/login/ instead") }
export async function signOut() { throw new Error("Use Django /api/v1/auth/logout/ instead") }
