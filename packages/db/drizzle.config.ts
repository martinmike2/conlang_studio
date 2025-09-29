import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./schema",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "app",
        password: process.env.DB_PASSWORD || "dev",
        database: process.env.DB_NAME || "conlang_studio"
    }
})