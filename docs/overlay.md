# Variant Overlays

This document describes the Variant Overlay API and runtime invariants.

## Overlay format
An overlay is a JSON object persisted in the `variant_overlays` table. Minimal shape:

{
  "id": 123,
  "languageId": 1, // optional
  "name": "My overlay",
  "ops": [ ... ],
  "meta": { ... },
  "createdAt": "2025-10-02T...Z"
}

## Ops schema
Each op in `ops` is an object with one of the following actions:

- add
  - { action: "add", pattern: string, replacement: string, priority?: number, meta?: {} }
  - If `id` is omitted, an in-memory id is assigned when applying overlays.
- update
  - { action: "update", id: number, pattern?: string, replacement?: string, priority?: number, meta?: {} }
- remove
  - { action: "remove", id: number }

Notes:
- `pattern` is expected to be a string representing a regular expression. The engine will attempt to compile it.
- `replacement` is a string used for replacement.
- `priority` is a number; lower numbers run earlier.

## ID assignment
- The overlay engine is in-memory and will not allocate persistent ids for `add` ops. When an `id` is required but not provided, the engine assigns a temporary positive id computed as `Math.max(0, ...existingIds) + 1`.
- Persistence occurs via `createOverlay`, which stores the `ops` JSON as-is; any temporary ids remain in the JSON unless the client post-processes them.

## Conflict detection
Conflicts are returned as an array of { opIndex, reason, op } indicating which ops failed and why. Typical reasons:
- add missing pattern or replacement
- duplicate pattern at same priority
- update/remove: target id does not exist

## API
- GET /api/overlays — list overlays
- POST /api/overlays — create overlay

Security:
- If `API_KEY` environment variable is set in the web app, the POST endpoint requires an `X-API-KEY` header matching that value.

## Examples
Apply overlay in UI: paste base rules and overlay ops into the VariantOverlayDiff tool, click "Apply overlay". To persist, use "Save overlay" and confirm.

## Edge cases and recommendations
- Very large `ops` arrays should be batched when applying to very large rule-sets.
- Consider adding DB indexes on `language_id` and `created_at` if querying frequently.
- For production, add proper auth & permission checks for overlay creation and modification.
