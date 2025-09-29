import { NextResponse } from "next/server"
import { buildInfo } from "../../../lib/buildInfo"
import { metricsSnapshot } from "../../../lib/metricsStub"

export async function GET() {
    return NextResponse.json({
        status: "ok",
        build: buildInfo(),
        metrics: metricsSnapshot()
    })
}