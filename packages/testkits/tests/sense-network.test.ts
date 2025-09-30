import { describe, it, expect, afterEach } from "vitest"

import { clearSemanticsEventSubscribers, buildSenseNetwork } from "@core/semantics"
import { clearActivitySubscribers } from "@core/activity"
import { senseRelations } from "../../db/schema/core"
import { createSemanticsTestHarness } from "./utils/semanticsTestUtils"

describe("Sense network adaptor", () => {
  afterEach(() => {
    clearSemanticsEventSubscribers()
    clearActivitySubscribers()
  })

  it("builds a network for a frame including related senses across frames", async () => {
    const { service, db, dispose } = await createSemanticsTestHarness()

    const frameA = await service.createFrame({
      name: "Harvesting",
      slug: "harvesting",
      domain: "agriculture",
      description: "Harvest-related frames",
      roles: [
        { name: "AGENT", cardinality: "1" },
        { name: "PATIENT", cardinality: "1" }
      ]
    })

    const frameB = await service.createFrame({
      name: "Processing",
      slug: "processing",
      domain: "manufacturing",
      description: "Processing actions",
      roles: []
    })

    const senseA = await service.createSense({
      frameId: frameA.id,
      gloss: "to reap",
      definition: "Cut grain or similar crops"
    })

    const senseB = await service.createSense({
      frameId: frameA.id,
      gloss: "to gather",
      definition: "Collect harvested items"
    })

    const senseC = await service.createSense({
      frameId: frameB.id,
      gloss: "to grind",
      definition: "Process crops into flour"
    })

    await db.insert(senseRelations).values([
      {
        sourceSenseId: senseA.id,
        targetSenseId: senseB.id,
        relationType: "synonym"
      },
      {
        sourceSenseId: senseA.id,
        targetSenseId: senseC.id,
        relationType: "sequence"
      }
    ])

    const network = await buildSenseNetwork({ frameId: frameA.id }, db as any)

    expect(network.stats.nodeCount).toBe(3)
    expect(network.stats.primaryCount).toBe(2)
    expect(network.stats.edgeCount).toBe(2)

    const primaryNodeIds = network.nodes.filter((node) => node.primary).map((node) => node.id)
    expect(primaryNodeIds.sort()).toEqual([senseA.id, senseB.id].sort())

    const bridgeNode = network.nodes.find((node) => node.id === senseC.id)
    expect(bridgeNode?.primary).toBe(false)
    expect(bridgeNode?.frameId).toBe(frameB.id)

    expect(network.edges).toEqual([
      {
        id: expect.any(Number),
        sourceSenseId: senseA.id,
        targetSenseId: senseB.id,
        relationType: "synonym"
      },
      {
        id: expect.any(Number),
        sourceSenseId: senseA.id,
        targetSenseId: senseC.id,
        relationType: "sequence"
      }
    ])

    const filtered = await buildSenseNetwork(
      { frameId: frameA.id, relationTypes: ["synonym"] },
      db as any
    )
    expect(filtered.edges).toHaveLength(1)
    expect(filtered.edges[0]).toMatchObject({ relationType: "synonym" })
    expect(filtered.nodes.filter((node) => node.primary)).toHaveLength(2)

    await dispose()
  })
})
