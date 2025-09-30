export interface FrameRoleInput {
	name: string
	cardinality: string
	order?: number | null
}

export interface FrameRole {
	name: string
	cardinality: string
	order: number
}

export function normalizeFrameRoles(roles?: FrameRoleInput[]): FrameRole[] {
	return (roles ?? [])
		.map((role, index) => ({
			name: role.name,
			cardinality: role.cardinality,
			order: role.order ?? index
		}))
		.sort((a, b) => a.order - b.order)
}
