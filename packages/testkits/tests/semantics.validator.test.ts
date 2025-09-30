import { describe, it, expect, afterEach } from "vitest"

import { clearSemanticsEventSubscribers, validateIncompleteRoleFilling, validateOrphanSenses } from "@core/semantics"
import { clearActivitySubscribers } from "@core/activity"
import { senseRelations } from "../../db/schema/core"
import { createSemanticsTestHarness } from "./utils/semanticsTestUtils"

describe("Semantics validators", () => {
  afterEach(() => {
    clearSemanticsEventSubscribers()
    clearActivitySubscribers()
  })

  it("passes when every sense participates in at least one relation", async () => {
    const { service, db, dispose } = await createSemanticsTestHarness()

    const frame = await service.createFrame({
      name: "Harvesting",
      slug: "harvesting",
      domain: "agriculture",
      description: "Harvest-related frames",
      roles: []
    })

    const senseA = await service.createSense({
      frameId: frame.id,
      gloss: "to reap",
      definition: "Cut grain or similar crops"
    })

    const senseB = await service.createSense({
      frameId: frame.id,
      gloss: "to gather",
      definition: "Collect harvested items"
    })

    await db.insert(senseRelations).values({
      sourceSenseId: senseA.id,
      targetSenseId: senseB.id,
      relationType: "synonym"
    })

    const result = await validateOrphanSenses(db as any)

    expect(result.status).toBe("pass")
    expect(result.orphanCount).toBe(0)
    expect(result.findings).toHaveLength(0)
    expect(result.totalSenses).toBe(2)

    await dispose()
  })

  it("flags senses without relations", async () => {
    const { service, db, dispose } = await createSemanticsTestHarness()

    const frame = await service.createFrame({
      name: "Processing",
      slug: "processing",
      domain: "manufacturing",
      description: "Processing actions",
      roles: []
    })

    const linked = await service.createSense({
      frameId: frame.id,
      gloss: "to mill",
      definition: "Reduce grains to powder"
    })

    const orphan = await service.createSense({
      frameId: frame.id,
      gloss: "to chaff",
      definition: "Separate seed from husk"
    })

    await db.insert(senseRelations).values({
      sourceSenseId: linked.id,
      targetSenseId: linked.id,
      relationType: "self"
    })

    const result = await validateOrphanSenses(db as any)

    expect(result.status).toBe("fail")
    expect(result.orphanCount).toBe(1)
    expect(result.findings).toHaveLength(1)

    const finding = result.findings[0]
    expect(finding.senseId).toBe(orphan.id)
    expect(finding.frameId).toBe(frame.id)
    expect(finding.gloss).toBe("to chaff")
    expect(typeof finding.createdAt).toBe("string")
    expect(new Date(finding.createdAt).toString()).not.toBe("Invalid Date")

    await dispose()
  })

  it("passes when required roles are covered in sample relations", async () => {
    const { service, db, dispose } = await createSemanticsTestHarness()

    const frame = await service.createFrame({
      name: "Harvesting",
      slug: "harvesting",
      domain: "agriculture",
      description: "Harvest-related frame",
      roles: [
        { name: "AGENT", cardinality: "1" },
        { name: "PATIENT", cardinality: "1" }
      ]
    })

    const predicate = await service.createSense({
      frameId: frame.id,
      gloss: "to harvest",
      definition: "Gather crops"
    })

    const agent = await service.createSense({
      frameId: frame.id,
      gloss: "farmer",
      definition: "Person who farms"
    })

    const patient = await service.createSense({
      frameId: frame.id,
      gloss: "grain",
      definition: "Harvested grain"
    })

    await db.insert(senseRelations).values([
      {
        sourceSenseId: predicate.id,
        targetSenseId: agent.id,
        relationType: "role:AGENT"
      },
      {
        sourceSenseId: predicate.id,
        targetSenseId: patient.id,
        relationType: "role:PATIENT"
      }
    ])

    const result = await validateIncompleteRoleFilling(db as any)

    expect(result.status).toBe("pass")
    expect(result.missingAssignments).toBe(0)
    expect(result.findings).toHaveLength(0)
    expect(result.framesChecked).toBe(1)

    await dispose()
  })

  it("detects missing required role assignments", async () => {
    const { service, db, dispose } = await createSemanticsTestHarness()

    const frame = await service.createFrame({
      name: "Processing",
      slug: "processing",
      domain: "manufacturing",
      description: "Processing actions",
      roles: [
        { name: "AGENT", cardinality: "1" },
        { name: "PATIENT", cardinality: "1..n" }
      ]
    })

    const predicate = await service.createSense({
      frameId: frame.id,
      gloss: "to grind",
      definition: "Process crops"
    })

    const agent = await service.createSense({
      frameId: frame.id,
      gloss: "miller",
      definition: "Person who grinds"
    })

    await db.insert(senseRelations).values({
      sourceSenseId: predicate.id,
      targetSenseId: agent.id,
      relationType: "role:AGENT"
    })

    const result = await validateIncompleteRoleFilling(db as any)

    expect(result.status).toBe("fail")
    expect(result.framesChecked).toBe(1)
    expect(result.missingAssignments).toBe(1)
    expect(result.findings).toHaveLength(1)

    const missing = result.findings[0]
    expect(missing.frameId).toBe(frame.id)
    expect(missing.requiredRole).toBe("PATIENT")

    await dispose()
  })
})
