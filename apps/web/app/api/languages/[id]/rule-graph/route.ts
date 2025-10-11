import { NextRequest, NextResponse } from "next/server";
import { computeRuleDependencyGraph } from "@core/graph";
import { computeGraphInputSchema } from "@core/graph/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const languageId = parseInt(id, 10);
    if (isNaN(languageId)) {
      return NextResponse.json({ error: "Invalid language ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const ruleTypesParam = searchParams.get("ruleTypes");
    const ruleTypes = ruleTypesParam ? ruleTypesParam.split(",") : undefined;
    const includeComputed = searchParams.get("includeComputed") !== "false";
    const includeDiagnostics = searchParams.get("includeDiagnostics") === "true";

    // Validate input
    const input = computeGraphInputSchema.parse({
      languageId,
      ruleTypes,
      includeComputed,
      includeDiagnostics,
    });

    // Compute graph
    const graph = await computeRuleDependencyGraph(input);

    return NextResponse.json(graph);
  } catch (error) {
    console.error("Error computing rule dependency graph:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input parameters", details: error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to compute rule dependency graph",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
