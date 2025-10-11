This folder contains a lightweight collaboration provider for the web app.

What we added

- `CollabProvider` dynamically imports `yjs` and `y-websocket` at runtime to initialize a Y.Doc + WebsocketProvider when available.
- If the dynamic import or provider connection fails, the provider falls back to a BroadcastChannel-backed mock (useful for local multi-window dev and tests).

How to enable the real websocket provider

- Set NEXT_PUBLIC_COLLAB_WS_URL to the websocket server URL (e.g. `wss://collab.example.com`) in your environment.
- Install `yjs` and `y-websocket` in `apps/web` (already added as dependencies in this branch).
- The provider will attempt to dynamically import and connect. If unavailable, it will return the mock.

Server options

1) Run a separate `y-websocket` server process (recommended for now):
   - The project `y-websocket` includes a server you can run via `pnpm dlx y-websocket --port 1234`
   - Or use the repo helper: `scripts/collab/run-y-websocket.sh 1234` (calls `pnpm dlx y-websocket` under the hood)
   - Point `NEXT_PUBLIC_COLLAB_WS_URL` to `ws://localhost:1234`

2) Integrate the websocket server into your hosted architecture (recommended for production):
   - For cloud deployments the recommended approach is to run a dedicated websocket service (e.g. a small Node service running `y-websocket` or the project's own collab process) behind an authenticated gateway.
   - The collab server should validate session cookies or tokens and issue short-lived room-scoped tokens for clients to use when opening websocket connections.
   - Example server endpoints the client expects (optional but recommended):
     - `GET /api/collab/token?room=...` — returns { token } scoped to the room and user session.
     - `GET /api/collab/whoami` — returns current user's { id, name } for presence/awareness.
    
      - Dev helpers: this repository includes simple demo implementations for both endpoints under `apps/web/app/api/collab/`.
         - These are intended for local testing and CI only. In production you should replace them with secure implementations that validate the user's session and sign ephemeral tokens.
   - The client populates awareness with `provider.awareness.setLocalStateField('user', { id, name })` and subscribes to `awareness.on('update')` to build a presence list.

Notes on server placement and scaling

 - You can run a standalone `y-websocket` process (recommended for simplicity). Put it behind an authenticated reverse proxy if you need to restrict access to authenticated users.
 - For large scale you may want to run a stateless websocket front with a persistence or sticky-session layer (or use managed WebSocket services that support pub/sub).

Next steps

- Wire awareness/presence to the provider and propagate presence via `CollabProvider` state.
- Add server-side persistence (if desired) and authentication for rooms.
- Convert the existing BroadcastChannel-based Playwright e2e test to use a running `y-websocket` server for more realistic multi-browser tests.

Notes

- The provider uses dynamic imports so the app can run without `yjs` installed; the mock remains available.
- The mock is intentionally simple — when moving to production-grade collaboration we should replace the mock with an explicit test-only helper.
