export function buildInfo() {
    return {
        sha: process.env.GIT_SHA || "dev",
        ts: new Date().toISOString()
    }
}