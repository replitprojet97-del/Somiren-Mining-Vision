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

- Restore imported dependencies with `pnpm install --frozen-lockfile` from the workspace root.
- Start the managed `artifacts/api-server: API Server` and `artifacts/somiren: web` workflows.
- The public website and API can start without email or account-provisioning credentials. Collaborator sign-in requires `NURIA_INITIAL_PASSWORD` (at least 12 characters) for the configured `NURIA_EMAIL`; administrator sign-in requires `ADMIN_PASSWORD`. Contact-form delivery uses the connected Resend integration on Replit, or `RESEND_API_KEY` on external hosts. Set `RESEND_FROM_EMAIL` to an address on a verified Resend domain and `CONTACT_EMAIL` to the receiving mailbox. The default `onboarding@resend.dev` sender is for Resend sandbox testing only.
- Verify startup with `pnpm run typecheck` and `GET /api/healthz` through the shared preview proxy.
- API startup runs the idempotent `@workspace/db` migration before accepting requests, including in published environments.
- The public website is served at `/`; the private collaborator sign-in is at `/sign-in`.
- The collaborator workspace is at `/espace-collaborateur` and uses private PostgreSQL-backed sessions in secure `HttpOnly` cookies.
- Collaborator sessions expire after 30 minutes of inactivity and always expire after 12 hours.
- There is no public registration route. A collaborator must be pre-provisioned with `NURIA_EMAIL`; `NURIA_INITIAL_PASSWORD` is used only once to create the password hash and should then be deleted.
- The production PostgreSQL database is hosted by Neon and consumed by the Render deployment through `DATABASE_URL`.
- New features must remain compatible with the existing Render deployment. Do not add Replit-specific runtime modules or managed services.
- Supabase is approved for private file storage only. Preserve the existing PostgreSQL database for accounts and sessions; no database replacement or data migration is authorized.
- Only free solutions are approved for the new document, audio, video, transcription, and translation capabilities. Keep documentary AI generation unchanged and paused; do not introduce paid processing APIs.
- Prefer exposing the Render API through `https://api.somiren.com/api` and keep `COOKIE_CROSS_SITE` unset. If the frontend must call an `onrender.com` API directly, set `COOKIE_CROSS_SITE=true` and add that exact frontend origin through `EXTRA_ALLOWED_ORIGINS`.
- Public sign-up is intentionally not exposed. Collaborator accounts are created and managed by the administrator.
- Declarative schema changes use `pnpm --filter @workspace/db run push` during development. Keep the idempotent SQL migration in `lib/db/src/migrate.ts` in sync because API startup uses it in every environment.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
