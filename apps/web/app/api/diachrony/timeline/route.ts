import { NextResponse } from "next/server"
import { diachronyService } from "@core/diachrony"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const languageId = searchParams.get("languageId")
    const limit = searchParams.get("limit")
    const before = searchParams.get("before")
    const since = searchParams.get("since")

    if (!languageId) {
      return NextResponse.json(
        { error: "languageId is required" },
        { status: 400 }
      )
    }

    const timeline = await diachronyService.getTimeline({
      languageId: parseInt(languageId, 10),
      limit: limit ? parseInt(limit, 10) : undefined,
      before: before ? new Date(before) : undefined,
      since: since ? new Date(since) : undefined
    })

    return NextResponse.json(timeline)
  } catch (error) {
    console.error("Failed to fetch timeline:", error)
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    )
  }
}
