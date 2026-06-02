---
name: DisClone architecture
description: Non-obvious constraints and decisions for the DisClone full-stack Discord replica.
---

## JWT auth
- Token stored in localStorage as `disclone_token`.
- `setAuthTokenGetter(() => useStore.getState().token)` wires it into every Orval-generated hook via `custom-fetch.ts`.
- Server signs with `SESSION_SECRET` env var; `verifyToken` returns `{ sub: number }` (cast `as unknown as { sub: number }` to satisfy TS).

## Socket.io path
- Server mounts Socket.io at `/api/socket.io` (not the default `/socket.io`).
- Client must connect with `io(origin, { path: "/api/socket.io", auth: { token } })`.
- The `artifact.toml` for api-server lists both `/api` and `/api/socket.io` in paths.

## TanStack Query v5 + Orval query options
- Passing `{ query: { enabled: bool } }` to generated hooks requires `as any` cast.
- Reason: `UseQueryOptions` in TQ v5 has `queryKey` as required; Orval fills it internally but the TypeScript type still demands it from callers.
- Pattern: `{ query: { enabled: !!token } as any }`

## Lib build order
- `lib/db` is a composite lib (emitDeclarationOnly). Must run `pnpm run typecheck:libs` BEFORE `pnpm --filter @workspace/api-server run typecheck` or table names won't resolve.

## Generated API types (from OpenAPI)
- `Message.editedAt` (nullable string) — NOT `updatedAt`
- `Member.userId` — NOT `Member.id`
- `FriendsData` = `{ friends: User[], incoming: User[], outgoing: User[], blocked: User[] }` — NOT an array
- `DMChannel.participants` = `User[]` (direct) — NOT `DmParticipant[]` with nested `.user`
- `useGetChannel(channelId, options)` — 2 args, NOT `(serverId, channelId, options)`
- `useCreateMessage` — NOT `useSendMessage`
- `useAcceptFriendRequest({ userId })`, `useDeclineFriendRequest({ userId })`, `useRemoveFriend({ userId })` — userId param, NOT friendshipId

**Why:** These type shapes match the OpenAPI spec exactly. Deviating from generated types causes runtime errors.
