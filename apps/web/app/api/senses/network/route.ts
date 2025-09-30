import { NextRequest } from "next/server"
import { buildSenseNetwork } from "@core/semantics"
import { success, jsonError } from "../../_util/respond"

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const frameIdParam = params.get("frameId")
  let frameId: number | undefined

  if (frameIdParam !== null) {
    const parsed = Number(frameIdParam)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return jsonError("frameId must be a positive integer", 400)
    }
    frameId = parsed
  }

  const relationTypes = params
    .getAll("relationType")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const network = await buildSenseNetwork({
    frameId,
    relationTypes: relationTypes.length ? relationTypes : undefined
  })

  return success(network)
}
