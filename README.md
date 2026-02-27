# One Click Gift Chart

Production-ready Next.js web app for creating, editing, saving, and exporting capital campaign gift charts from a single campaign goal input.

## Stack

- Next.js 14 (App Router) + TypeScript + TailwindCSS
- PostgreSQL + Prisma ORM
- ExcelJS export
- react-hook-form + zod validation

## Features

- Dashboard with chart history and timestamps
- Gift chart editor with:
  - 3-tier (default) or 4-tier configuration
  - Editable gift counts
  - Lead gift adjustment panel
  - Deterministic rebalance algorithm
  - Guaranteed exact total equal to campaign goal
- Save + revision history
- Save and download formatted `.xlsx` workbook

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Set environment variables in `.env`:

- `DATABASE_URL`

4. Apply Prisma migration:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Run app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database model

Prisma models include:

- `User`, `Account`, `Session`, `VerificationToken` (NextAuth)
- `GiftChart` (main persisted chart)
- `GiftChartRevision` (audit trail snapshots)

Schema: `prisma/schema.prisma`
Migration SQL: `prisma/migrations/20260227000000_init/migration.sql`

## Excel export

Export endpoint:

- `GET /api/charts/:id/export`

Workbook formatting includes:

- Title row with project name + goal
- Dark table headers (white bold text)
- Tier column merged for each tier’s 3 levels
- Subtotal row per tier: “gifts yielding a total of”
- Final `TOTAL GIFTS` row
- Borders, currency formats, and print-friendly widths

Filename format:

- `OneClickGiftChart_<ProjectName>_<Goal>.xlsx`

## Tests

Logic tests for deterministic rebalancing:

```bash
npm run test
```

Test file: `tests/rebalance.test.ts`

## API routes

- `POST /api/charts` create
- `GET /api/charts` list charts
- `GET /api/charts/:id` fetch single chart
- `PUT /api/charts/:id` update chart
- `GET /api/charts/:id/export` download Excel
