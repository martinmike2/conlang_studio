import { eq, type InferInsertModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { semanticFrames, lexemeSenses, idioms } from "../../db/schema/core"
import type { SemanticFrameRecord, LexemeSenseRecord, IdiomRecord } from "./types"
import { emitSemanticsEvent, type SemanticEventAction, type SemanticEntity, type SemanticEventPayloadMap } from "./events"
import { normalizeFrameRoles, type FrameRoleInput, type FrameRole } from "./roles"
import { recordActivity } from "@core/activity"

type DbClient = ReturnType<typeof getDb>

export type SemanticFrame = SemanticFrameRecord
export type LexemeSense = LexemeSenseRecord
export type Idiom = IdiomRecord

type FrameInsert = InferInsertModel<typeof semanticFrames>
type SenseInsert = InferInsertModel<typeof lexemeSenses>
type IdiomInsert = InferInsertModel<typeof idioms>

export interface CreateFrameInput {
	name: string
	slug: string
	domain?: string | null
	description?: string | null
	roles?: FrameRoleInput[]
}

export type UpdateFrameInput = Partial<CreateFrameInput>

export interface CreateSenseInput {
	frameId: number
	gloss: string
	definition?: string | null
}

export type UpdateSenseInput = Partial<Omit<CreateSenseInput, "frameId">> & {
	frameId?: number
}

export interface CreateIdiomInput {
	frameId?: number | null
	text: string
	notes?: string | null
}

export type UpdateIdiomInput = Partial<CreateIdiomInput>

export interface SemanticsService {
	listFrames(): Promise<SemanticFrame[]>
	getFrameById(id: number): Promise<SemanticFrame | null>
	createFrame(input: CreateFrameInput): Promise<SemanticFrame>
	updateFrame(id: number, patch: UpdateFrameInput): Promise<SemanticFrame | null>
	deleteFrame(id: number): Promise<boolean>

	listSensesByFrame(frameId: number): Promise<LexemeSense[]>
	getSenseById(id: number): Promise<LexemeSense | null>
	createSense(input: CreateSenseInput): Promise<LexemeSense>
	updateSense(id: number, patch: UpdateSenseInput): Promise<LexemeSense | null>
	deleteSense(id: number): Promise<boolean>

	listIdiomsByFrame(frameId: number): Promise<Idiom[]>
	getIdiomById(id: number): Promise<Idiom | null>
	createIdiom(input: CreateIdiomInput): Promise<Idiom>
	updateIdiom(id: number, patch: UpdateIdiomInput): Promise<Idiom | null>
	deleteIdiom(id: number): Promise<boolean>
}

function sentenceCase(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

function extractDisplayLabel<E extends SemanticEntity>(entity: E, data: SemanticEventPayloadMap[E]): string {
	if (entity === "frame") {
		const frame = data as SemanticEventPayloadMap["frame"]
		return frame.name ?? `#${frame.id}`
	}
	if (entity === "sense") {
		const sense = data as SemanticEventPayloadMap["sense"]
		return sense.gloss ?? `#${sense.id}`
	}
	if (entity === "idiom") {
		const idiom = data as SemanticEventPayloadMap["idiom"]
		return idiom.textValue ?? `#${idiom.id}`
	}
	return `#${(data as { id: number }).id}`
}

function toPlainJson<T>(value: T): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value ?? {}))
}

async function logSemanticActivity<E extends SemanticEntity>(
	entity: E,
	action: SemanticEventAction,
	data: SemanticEventPayloadMap[E],
	db: DbClient
) {
	const label = extractDisplayLabel(entity, data)
	const summary = `${sentenceCase(entity)} “${label}” ${action}`
	const isDeletion = action === "deleted"
	let frameId: number | null = null
	let senseId: number | null = null
	let idiomId: number | null = null

	if (entity === "frame") {
		const frame = data as SemanticEventPayloadMap["frame"]
		frameId = isDeletion ? null : frame.id
	} else if (entity === "sense") {
		const sense = data as SemanticEventPayloadMap["sense"]
		frameId = sense.frameId ?? null
		senseId = isDeletion ? null : sense.id
	} else if (entity === "idiom") {
		const idiom = data as SemanticEventPayloadMap["idiom"]
		frameId = idiom.frameId ?? null
		idiomId = isDeletion ? null : idiom.id
	}

	await recordActivity({
		scope: "semantics",
		entity,
		action,
		summary,
		frameId,
		senseId,
		idiomId,
		payload: toPlainJson(data)
	}, db)
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(value).filter(([, v]) => v !== undefined)
	) as Partial<T>
}

function prepareFrameInsert(input: CreateFrameInput): FrameInsert {
	return {
		name: input.name,
		slug: input.slug,
		domain: input.domain ?? null,
		description: input.description ?? null,
		roles: normalizeFrameRoles(input.roles)
	}
}

function prepareSenseInsert(input: CreateSenseInput): SenseInsert {
	return {
		frameId: input.frameId,
		gloss: input.gloss,
		definition: input.definition ?? null
	}
}

function prepareIdiomInsert(input: CreateIdiomInput): IdiomInsert {
	return {
		frameId: input.frameId ?? null,
		textValue: input.text,
		notes: input.notes ?? null
	}
}

export function createSemanticsService(db: DbClient = getDb()): SemanticsService {
	const service: SemanticsService = {
		async listFrames() {
			return db.select().from(semanticFrames).orderBy(semanticFrames.createdAt)
		},

		async getFrameById(id: number) {
			const [row] = await db.select().from(semanticFrames).where(eq(semanticFrames.id, id)).limit(1)
			return row ?? null
		},

		async createFrame(input: CreateFrameInput) {
			const [created] = await db.insert(semanticFrames).values(prepareFrameInsert(input)).returning()
			emitSemanticsEvent({ entity: "frame", action: "created", data: created })
			await logSemanticActivity("frame", "created", created, db)
			return created
		},

		async updateFrame(id: number, patch: UpdateFrameInput) {
			const updates = stripUndefined({
				name: patch.name,
				slug: patch.slug,
				domain: patch.domain !== undefined ? patch.domain : undefined,
				description: patch.description !== undefined ? patch.description : undefined
			}) as Partial<FrameInsert>

			if (patch.roles !== undefined) {
				updates.roles = normalizeFrameRoles(patch.roles)
			}

			if (Object.keys(updates).length === 0) {
				return service.getFrameById(id)
			}

			const [updated] = await db
				.update(semanticFrames)
				.set(updates)
				.where(eq(semanticFrames.id, id))
				.returning()

			if (updated) {
				emitSemanticsEvent({ entity: "frame", action: "updated", data: updated })
				await logSemanticActivity("frame", "updated", updated, db)
			}
			return updated ?? null
		},

		async deleteFrame(id: number) {
			const [deleted] = await db
				.delete(semanticFrames)
				.where(eq(semanticFrames.id, id))
				.returning()

			if (!deleted) {
				return false
			}

			emitSemanticsEvent({ entity: "frame", action: "deleted", data: deleted })
			await logSemanticActivity("frame", "deleted", deleted, db)
			return true
		},

		async listSensesByFrame(frameId: number) {
			return db
				.select()
				.from(lexemeSenses)
				.where(eq(lexemeSenses.frameId, frameId))
				.orderBy(lexemeSenses.createdAt)
		},

		async getSenseById(id: number) {
			const [row] = await db.select().from(lexemeSenses).where(eq(lexemeSenses.id, id)).limit(1)
			return row ?? null
		},

		async createSense(input: CreateSenseInput) {
			const [created] = await db.insert(lexemeSenses).values(prepareSenseInsert(input)).returning()
			emitSemanticsEvent({ entity: "sense", action: "created", data: created })
			await logSemanticActivity("sense", "created", created, db)
			return created
		},

		async updateSense(id: number, patch: UpdateSenseInput) {
			const updates = stripUndefined({
				frameId: patch.frameId,
				gloss: patch.gloss,
				definition: patch.definition !== undefined ? patch.definition : undefined
			})

			if (Object.keys(updates).length === 0) {
				return service.getSenseById(id)
			}

			const [updated] = await db
				.update(lexemeSenses)
				.set(updates)
				.where(eq(lexemeSenses.id, id))
				.returning()

			if (updated) {
				emitSemanticsEvent({ entity: "sense", action: "updated", data: updated })
				await logSemanticActivity("sense", "updated", updated, db)
			}
			return updated ?? null
		},

		async deleteSense(id: number) {
			const [deleted] = await db
				.delete(lexemeSenses)
				.where(eq(lexemeSenses.id, id))
				.returning()

			if (!deleted) {
				return false
			}

			emitSemanticsEvent({ entity: "sense", action: "deleted", data: deleted })
			await logSemanticActivity("sense", "deleted", deleted, db)
			return true
		},

		async listIdiomsByFrame(frameId: number) {
			return db
				.select()
				.from(idioms)
				.where(eq(idioms.frameId, frameId))
				.orderBy(idioms.createdAt)
		},

		async getIdiomById(id: number) {
			const [row] = await db.select().from(idioms).where(eq(idioms.id, id)).limit(1)
			return row ?? null
		},

		async createIdiom(input: CreateIdiomInput) {
			const [created] = await db.insert(idioms).values(prepareIdiomInsert(input)).returning()
			emitSemanticsEvent({ entity: "idiom", action: "created", data: created })
			await logSemanticActivity("idiom", "created", created, db)
			return created
		},

		async updateIdiom(id: number, patch: UpdateIdiomInput) {
			const updates = stripUndefined({
				frameId: patch.frameId !== undefined ? patch.frameId : undefined,
				textValue: patch.text,
				notes: patch.notes !== undefined ? patch.notes : undefined
			})

			if (Object.keys(updates).length === 0) {
				return service.getIdiomById(id)
			}

			const [updated] = await db
				.update(idioms)
				.set(updates)
				.where(eq(idioms.id, id))
				.returning()

			if (updated) {
				emitSemanticsEvent({ entity: "idiom", action: "updated", data: updated })
				await logSemanticActivity("idiom", "updated", updated, db)
			}
			return updated ?? null
		},

		async deleteIdiom(id: number) {
			const [deleted] = await db
				.delete(idioms)
				.where(eq(idioms.id, id))
				.returning()

			if (!deleted) {
				return false
			}

			emitSemanticsEvent({ entity: "idiom", action: "deleted", data: deleted })
			await logSemanticActivity("idiom", "deleted", deleted, db)
			return true
		}
	}

	return service
}

export const semanticsService = createSemanticsService()
