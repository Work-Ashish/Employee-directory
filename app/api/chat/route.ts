import { NextResponse } from "next/server"

export async function POST() {
    return NextResponse.json({ error: "Chat endpoint not configured" }, { status: 501 })
}
