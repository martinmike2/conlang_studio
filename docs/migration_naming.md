## Migration Naming Convention

Format: `YYYYMMDDHHMM__area__action__summary`

Examples:
- `202509292330__core__init__languages_table`
- `202509300915__semantics__add__semantic_frames`

Rules:
1. Timestamp is in UTC (yyyyMMddHHmm) for lexical ordering.
2. `area` is one of: `core`, `semantics`, `morph`, `borrow`, `metrics`, `evolution`, `security`.
3. `action` is one of: `init`, `add`, `alter`, `drop`, `seed`.
4. Summary uses lowercase snake_case.
5. For destructive changes, append `_breaking`.

Rationale: predictable ordering, easy grepping, phase alignment.

During generation via drizzle-kit you may rename the produced file to conform before committing.
