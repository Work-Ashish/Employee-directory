import { NextResponse } from "next/server"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST() {
    return NextResponse.json({ error: "Seeding is now handled by Django management commands" }, { status: 410 })
}

export const POST = withAuth({ module: Module.SETTINGS, action: Action.CREATE }, handlePOST)
