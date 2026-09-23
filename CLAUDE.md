# Khmer Micro-Store

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
shadcn/ui + next-intl (km default, en). apps/api NestJS. apps/worker BullMQ.
packages/shared Zod schemas. packages/db Prisma + PostgreSQL.
packages/payments provider adapters. Local: docker compose (Postgres 16, Redis 7).

## Commands
pnpm dev | pnpm lint | pnpm typecheck | pnpm test | pnpm db:migrate

## Rules
- Prices are integers: price_usd_cents, price_khr (riel). A product may have
  one or both. Buyer picks USD or KHR at checkout.
- Phone: accept 012 345 678 and 097 123 4567, +855 or 855 prefix; strip spaces,
  prefix and leading 0; 8-9 digits remain; save as 855XXXXXXXX(X).
- Every merchant query filters by store_id. No `any`. Zod on every input.
- No hard-coded text: use messages/km.json and messages/en.json.
- Payment providers only through packages/payments. Never trust a callback
  alone: always confirm with the provider's status API.
- Mobile-first 360px, tap targets 44px, Khmer font Kantumruy Pro, line-height 1.5+.
- Never print, log or commit secrets. Never edit an old migration.
