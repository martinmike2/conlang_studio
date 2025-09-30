import { defineConfig } from 'drizzle-kit'
import { ensureEnv } from '@core/env'

// Ensure environment variables are loaded from repo root
ensureEnv()

// Support DATABASE_URL override while retaining individual env vars.
// drizzle-kit only needs credentials object; we parse if URL provided.
function parseDatabaseUrl(url: string) {
    try {
        const u = new URL(url)
        return {
            host: u.hostname,
            port: Number(u.port || 5432),
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname.replace(/^\//, '')
        }
    } catch {
        return null
    }
}

const urlCreds = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null
const creds = {
    host: urlCreds?.host || process.env.DB_HOST || 'localhost',
    port: urlCreds?.port || Number(process.env.DB_PORT) || 5432,
    user: urlCreds?.user || process.env.DB_USER || 'app',
    password: urlCreds?.password || process.env.DB_PASSWORD || 'dev',
    database: urlCreds?.database || process.env.DB_NAME || 'conlang_studio'
}

function resolveSSL() {
    const raw = (process.env.DB_SSL_MODE || process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase()
    if (['require', 'true', '1', 'on'].includes(raw)) {
        return { mode: 'require', value: { rejectUnauthorized: false } as { rejectUnauthorized: boolean } }
    }
    if (['disable', 'false', '0', 'off'].includes(raw)) {
        return { mode: 'disable', value: false as const }
    }
    if (raw === '') {
        return { mode: 'auto', value: false as const } // default off for local unless explicitly enabled
    }
    return { mode: 'unknown', value: false as const }
}

const sslResolved = resolveSSL()
;(creds as any).ssl = sslResolved.value

if (process.env.MIGRATION_DEBUG) {
    const { password, ...rest } = creds
    // eslint-disable-next-line no-console
            console.log('[drizzle.config] Using credentials:', { ...rest, password: password ? '***' : undefined, ssl: sslResolved })
}

export default defineConfig({
    schema: './schema',
    out: './migrations',
    dialect: 'postgresql',
    dbCredentials: creds
})