/**
 * /api/departments/[id] — Local handler for department delete.
 *
 * Since departments are just a CharField on Django's Employee model,
 * "deleting" a department only removes it from the frontend's local store.
 * Employees with this department string in Django are unaffected.
 */
import { NextResponse } from "next/server"

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    return NextResponse.json({ data: { id, deleted: true } })
}
