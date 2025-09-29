import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const languages = pgTable("languages", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull()
})