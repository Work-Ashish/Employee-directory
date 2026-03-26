/**
 * /api/departments/[id] — Local handler for department delete.
 *
 * Since departments are just a CharField on Django's Employee model,
 * "deleting" a department only removes it from the frontend's local store.
 * Employees with this department string in Django are unaffected.
 */
import { NextResponse } from "next/server"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleDELETE(
    _req: Request,
    context: AuthContext
) {
    const { id } = context.params
    return NextResponse.json({ data: { id, deleted: true } })
}

export const DELETE = withAuth({ module: Module.EMPLOYEES, action: Action.DELETE }, handleDELETE)
