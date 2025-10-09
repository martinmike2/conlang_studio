# Style Policies

Style policies describe the stylistic guardrails for a conlang in a structured JSON format. Each policy contains one or more rules that express allow/deny constraints. The new Register & Style audit panel consumes these rules to flag issues in candidate samples.

## Rules

Each rule supports the following optional fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Stable identifier used in evaluation output. |
| `description` | string | Human readable description (rendered in the UI). |
| `forbidWords` | string[] | Case-insensitive words that should never appear. |
| `forbidPatterns` | string[] | Regular expressions (JavaScript syntax) treated as disallowed patterns. Invalid expressions are surfaced as violations so that policy authors can fix them quickly. |
| `allowedRegisters` | string[] | Limit evaluation to samples whose `register` value is included. If set, providing no register is treated as a violation. |
| `requireTags` | string[] | Tags that must be present in the sample’s `tags` array. |
| `maxSentenceLength` | number | Maximum token count (space-delimited). |
| `minFormality` | number | Formality score threshold between `0` (informal) and `1` (formal). Missing formality values fail the rule. |

## Evaluations

Submitting a POST request to `/api/register/audit` with a payload shaped like:

```json
{
  "policyId": 1,
  "samples": [
    {
      "id": "sample-1",
      "text": "We cordially invite you to join us.",
      "register": "formal",
      "tags": ["public"],
      "formality": 0.9
    }
  ]
}
```

returns a response documenting per-sample violations. Samples without an explicit `id` automatically receive sequential identifiers (e.g. `sample-1`). The UI reuses this output to hydrate past evaluations for iteration.

## Maintenance Tips

* Add new policies directly to the `style_policies` table (see migration `0007_style_policies.sql`).
* Keep `forbidPatterns` small and specific—wide expressions can become expensive to evaluate in the browser.
* If a new dimension is needed (e.g. max paragraph count), extend `StylePolicyRuleSchema` in `packages/core/register/types.ts` and surface the new field in the audit panel.
