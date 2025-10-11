// Seed sample rule data for RuleGraph UI demo
// Usage: pnpm tsx scripts/seed-rulegraph-demo.ts

import { getDb } from '../packages/db/client';
import {
  languages,
  loanRulesets,
  loanRules,
  stylePolicies,
  variantOverlays,
  ruleDependencies
} from '../packages/db/schema/core';

import { eq } from 'drizzle-orm';

async function main() {
  const db = getDb();

  // Use provided language ID (2)
  const [lang] = await db.select().from(languages).where(eq(languages.id, 2));
  if (!lang) {
    throw new Error('Language with ID 2 not found. Please create it first.');
  }
  console.log('Using language:', lang);

  // Create a loan ruleset
  const [ruleset] = await db.insert(loanRulesets).values({
    name: 'Demo Ruleset',
    description: 'Demo ruleset for RuleGraph',
    active: true
  }).returning();

  // Create loan rules
  const loanRuleRows = [
    { rulesetId: ruleset.id, priority: 1, pattern: 'p > b', replacement: 'b', notes: 'Demo rule 1' },
    { rulesetId: ruleset.id, priority: 2, pattern: 't > d', replacement: 'd', notes: 'Demo rule 2' }
  ];
  const loanRulesInserted = await db.insert(loanRules).values(loanRuleRows).returning();

  // Create style policy
  const stylePolicyRules = [
    {
      id: 'no-slang',
      description: 'Avoid slang expressions',
      forbidWords: ["ain't", "gonna"],
      allowedRegisters: ["formal", "official"],
      requireTags: ["public"],
      maxSentenceLength: 40,
      minFormality: 0.6,
      metadata: {}
    }
  ];
  const [policy] = await db.insert(stylePolicies).values({
    name: 'Demo Style Policy',
    description: 'Demo style policy for RuleGraph',
    languageId: lang.id,
    rules: stylePolicyRules
}).returning();

  // Create variant overlay
  const overlayOps = [
    { action: 'replace', target: 'suffix', value: '-demo' }
  ];
  const [overlay] = await db.insert(variantOverlays).values({
    name: 'Demo Overlay',
    languageId: lang.id,
    ops: overlayOps
}).returning();

  // Create rule dependency (loan rule 1 -> loan rule 2)
  await db.insert(ruleDependencies).values({
    languageId: lang.id,
    ruleType: 'loan_rule',
    ruleId: loanRulesInserted[0].id,
    dependsOnType: 'loan_rule',
    dependsOnId: loanRulesInserted[1].id,
    relationType: 'priority',
    explanation: 'Demo dependency',
    weight: 1
  });

  console.log('Seeded demo rulegraph data for language:', lang.id);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
