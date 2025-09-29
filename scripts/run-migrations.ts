import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { Client } from "pg"
import * as schema from "../packages/db/schema/core"

async function main() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })
    await client.connect()
    const db = drizzle(client, { schema })
    await db.execute(`SELECT 1`)
    await client.end()
    console.log("Migration connectivity OK (schema generation handles via drizzle-kit).")
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})