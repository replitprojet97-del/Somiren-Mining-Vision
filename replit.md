# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Running on Replit

- Start the managed `artifacts/api-server: API Server` and `artifacts/somiren: web` workflows.
- API startup runs the idempotent `@workspace/db` migration before accepting requests, including in published environments.
- The public website is served at `/`; the private collaborator sign-in is at `/sign-in`.
- The collaborator workspace is at `/espace-collaborateur` and requires Clerk authentication plus an exact server-side match with `NURIA_EMAIL`.
- Public sign-up is intentionally not exposed. Collaborator accounts are created and managed by the administrator.
- Declarative schema changes use `pnpm --filter @workspace/db run push` during development. Keep the idempotent SQL migration in `lib/db/src/migrate.ts` in sync because API startup uses it in every environment.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
