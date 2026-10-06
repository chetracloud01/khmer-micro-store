# Khmio

Micro-merchant e-commerce PWA for Cambodia: Bakong KHQR + ABA PayWay,
Telegram alerts, Khmer/English. Full plan: docs/blueprint.md

## How I work (follow this order)
1. Design first: build screens as real pages in apps/web/app/mockup/ with
   mock data, from design/screens.md. No backend until I approve a screen.
2. Then build backend features one at a time, per docs/blueprint.md roadmap.
3. Always propose a plan and wait for my OK before writing code.
4. After coding: run lint, typecheck, tests; fix failures; summarize changes.
5. Never commit unless I ask.

## Stack
pnpm + Turborepo monorepo. apps/web Next.js App Router + Tailwind +
shadcn/ui + next-intl (km default, en). apps/api NestJS. apps/worker pg-boss
(jobs kept in PostgreSQL).
packages/shared Zod schemas. packages/db Prisma + PostgreSQL.
packages/payments provider adapters. Local database: PostgreSQL 16 installed on
Windows (one-time setup: infra/setup-local-db.cmd), or `pnpm db:up` with Docker.
NestJS injection uses explicit tokens (@Inject(TOKEN)), never constructor types.
Shop data goes through packages/db AppDb + withContext() (row-level security);
SystemDb only for login, sessions, creating a store, the worker and admin.
Admin routes: AdminGuard + @AdminPermissionNeeded(...) from packages/shared/admin-roles.ts on every route;
admin login is Telegram then a TOTP code (ADMIN_SECRETS_KEY encrypts the secrets); never log either.
Every new table with store_id must enable RLS in its migration.

## Commands
pnpm db:up (start Postgres) | pnpm dev | pnpm lint | pnpm typecheck | pnpm test |
pnpm db:migrate (new migration) | pnpm db:deploy (apply migrations)
pnpm admin:add-owner -- --telegram-id <id> --name "<name>" (make/reset a platform owner; resets their 2FA)

## Rules
- Prices are integers: price_usd_cents, price_khr (riel). A product may have
  one or both. Buyer picks ONE currency for the whole order at checkout, not
  per item. Missing-currency lines convert via the store's usd_to_khr_rate
  (clamped to a platform-allowed band) at checkout time; round each line
  first, then sum — never convert-then-round the total. Freeze
  exchange_rate_used onto the order. Payment verification never re-converts:
  accept only an exact integer match on currency + total_minor. Full
  rationale: docs/blueprint.md "Multi-currency pricing and totals".
- Phone: accept 012 345 678 and 097 123 4567, +855 or 855 prefix; strip spaces,
  prefix and leading 0; 8-9 digits remain; save as 855XXXXXXXX(X).
- Every merchant query filters by store_id. No `any`. Zod on every input.
- Plan features/limits only from packages/shared/plans.ts; enforce in the API,
  not just the UI. Downgrade/pause locks data, never deletes it. Full rules:
  docs/blueprint.md "Subscription tiers".
- No hard-coded text: use messages/km.json and messages/en.json.
- Payment providers only through packages/payments. Never trust a callback
  alone: always confirm with the provider's status API.
- Mobile-first 360px, tap targets 44px, Khmer font Kantumruy Pro, line-height 1.5+.
- Brand and project name: Khmio (formerly Khmer Micro-Store — database names
  and users still say khmer_micro_store, by design); mascot Mio, drawn only by the
  Mio component in packages/ui. Brand, colours, fonts, marketing:
  design/brand-guide.md. Doc map, prompts, error playbook: docs/handbook.md.
- Never print, log or commit secrets. Never edit an old migration.
