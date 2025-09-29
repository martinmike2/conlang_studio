import { spawnSync } from "node:child_process"

function run(cmd: string, args: string[]) {
    const r = spawnSync(cmd, args, {stdio: "inherit"})
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed with ${r.status}`)
}

try {
    run("pnpm", ["lint"])
    run("pnpm", ["typecheck"])
    run("pnpm", ["test"])
    console.log("Phase 0 exit validation: PASS")
} catch (e) { console.error(e); process.exit(1) }