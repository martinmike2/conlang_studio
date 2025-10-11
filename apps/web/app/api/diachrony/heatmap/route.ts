import { NextResponse } from "next/server"
import { diachronyService } from "@core/diachrony"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const languageId = searchParams.get("languageId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const groupBy = searchParams.get("groupBy") || "month"
    const semanticFields = searchParams.get("semanticFields")

    if (!languageId) {
      return NextResponse.json(
        { error: "languageId is required" },
        { status: 400 }
      )
    }

    if (!["month", "quarter", "year"].includes(groupBy)) {
      return NextResponse.json(
        { error: "groupBy must be one of: month, quarter, year" },
        { status: 400 }
      )
    }

    const heatmap = await diachronyService.getDriftHeatmap({
      languageId: parseInt(languageId, 10),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy: groupBy as "month" | "quarter" | "year",
      semanticFields: semanticFields ? semanticFields.split(",") : undefined
    })

    return NextResponse.json(heatmap)
  } catch (error) {
    console.error("Failed to fetch drift heatmap:", error)
    return NextResponse.json(
      { error: "Failed to fetch drift heatmap" },
      { status: 500 }
    )
  }
}
