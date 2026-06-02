# DisClone

A full-stack Discord replica with real-time messaging, voice stubs, server/channel/DM/friend management, and the dark "Crimson Moon" theme.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/disclone run dev` — run the React frontend (port 19464)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui components, Zustand state, TanStack Query, Orval-generated hooks, wouter router, Socket.io client, Framer Motion
- API: Express 5 + Socket.io server
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (CJS bundle)
- Auth: JWT (Bearer tokens, stored in localStorage)

## Where things live

- `lib/db/src/schema/` — database schema (Drizzle, one file per table)
- `lib/api-spec/openapi.yaml` — OpenAPI 3 spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated hooks + types (DO NOT EDIT)
- `lib/api-client-react/src/custom-fetch.ts` — auth token injector
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + requireAuth middleware
- `artifacts/disclone/src/` — React frontend
  - `components/layout/` — main-layout, server-panel, dm-panel, user-status-bar
  - `components/chat/` — message-list, message-input
  - `components/dialogs/` — create-server dialog
  - `pages/` — login, register, friends, channel, dm, not-found
  - `store/useStore.ts` — Zustand store (user, token, selection, socket state)
  - `lib/socket.ts` — Socket.io client (connects to `/api/socket.io`)
  - `index.css` — Crimson Moon dark theme CSS variables

## Architecture decisions

- **Contract-first**: OpenAPI spec is written first, then Orval generates all React hooks and Zod schemas. Never edit `lib/api-client-react/src/generated/` manually.
- **JWT auth**: Tokens stored in localStorage as `disclone_token`, passed via `Authorization: Bearer` header. The `setAuthTokenGetter` call in App.tsx wires this into every generated API hook.
- **Socket.io path**: Server mounts at `/api/socket.io`; client connects with `{ path: "/api/socket.io" }`.
- **Lib build required**: `lib/db` is a composite lib — run `pnpm run typecheck:libs` before checking api-server types.
- **TanStack Query v5 + Orval**: Passing `{ query: { enabled: bool } }` to generated hooks requires `as any` cast because `UseQueryOptions` in v5 requires `queryKey` (handled internally by Orval). This is a known Orval/TQ5 type quirk.

## Product

- Full Discord-like layout: server rail, channel panel, member list, DM panel, friends list
- Real-time messaging via Socket.io (channel join/leave, typing indicators)
- Server & channel management (create/list/delete)
- DM conversations
- Friend system (send/accept/decline requests)
- Invite system with codes
- Crimson Moon dark theme (deep charcoal + crimson red accents)

## Demo accounts

- `demo@disclone.app` / `Demo1234!` — owns the OmniVoid server
- `alice@disclone.app` / `Demo1234!` — member of OmniVoid

## Gotchas

- Do NOT run `pnpm dev` at the workspace root — use workflows instead.
- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` — the db lib must emit declarations first.
- After changing OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks.
- After changing DB schema, run `pnpm --filter @workspace/db run push` (dev only) to apply migrations.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
