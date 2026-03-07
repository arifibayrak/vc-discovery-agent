# VC Discovery Agent

An AI-powered VC deal screening platform. Startups submit their pitch deck, the agent extracts structured data using Claude AI, validates it, asks follow-up questions for any gaps, and generates an investor-ready summary.

## Features

- **Startup submission form** (`/apply`) — manual or REST API submission
- **AI pitch deck extraction** — Claude reads PDFs/PPTX and extracts 19 structured fields
- **Pitch deck validation** — checks sections, website reachability, numeric ranges
- **Follow-up questions** — auto-generated for missing or invalid fields
- **Investor summary** — scored executive summary with strengths/risks
- **VC admin dashboard** (`/admin`) — review submissions, view PDFs, email founders

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase Postgres |
| Storage | Supabase Storage |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Validation | Zod |
| Deployment | Vercel |

---

## Local Development

### 1. Clone & install

```bash
git clone <your-repo-url>
cd vc-discovery-agent
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Get Supabase keys from: **Supabase Dashboard → Project Settings → API**

Get Anthropic key from: **console.anthropic.com**

### 3. Database setup

Run both migrations in your **Supabase SQL Editor** (Dashboard → SQL Editor):

**Migration 1** — `supabase/migrations/00001_initial_schema.sql`

**Migration 2** — `supabase/migrations/00002_extraction_metadata.sql`

### 4. Storage bucket

In **Supabase Dashboard → Storage**, create a bucket named:

```
submission-files
```

Leave it as **private** (the app generates signed URLs for access).

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Seed demo data (optional)

```bash
npm run db:seed
```

Creates sample submissions in various pipeline states for testing the admin dashboard.

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

### 2. Import project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** (it will fail — environment variables not set yet)

### 3. Add environment variables

In **Vercel Dashboard → Your Project → Settings → Environment Variables**, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key | Production, Preview |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production, Preview |

### 4. Redeploy

**Vercel Dashboard → Deployments → (latest) → ⋯ → Redeploy**

Your app is now live at `https://your-project.vercel.app`.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                              # Hero / landing page
│   ├── apply/page.tsx                        # Startup submission form
│   ├── admin/page.tsx                        # VC admin dashboard
│   └── api/submissions/
│       ├── route.ts                          # POST create, GET list
│       └── [id]/
│           ├── route.ts                      # GET full detail, DELETE
│           ├── status/route.ts               # PATCH update status
│           ├── files/
│           │   ├── route.ts                  # POST upload, GET list
│           │   └── [fileId]/route.ts         # GET signed URL for viewing
│           ├── extract/route.ts              # POST trigger AI extraction
│           ├── validate/route.ts             # POST run validation + follow-ups
│           ├── follow-ups/
│           │   ├── route.ts                  # GET list questions
│           │   ├── [questionId]/route.ts     # PATCH answer one question
│           │   └── batch/route.ts            # POST answer multiple questions
│           └── summary/route.ts              # POST generate, GET retrieve
├── dal/                                      # Data access layer (Supabase queries)
│   ├── submissions.ts
│   ├── uploads.ts
│   ├── extractions.ts
│   ├── validations.ts
│   ├── follow-ups.ts
│   └── summaries.ts
├── schemas/                                  # Zod schemas
│   ├── submission.ts
│   ├── upload.ts
│   ├── extraction.ts
│   ├── validation.ts
│   ├── follow-up.ts
│   └── summary.ts
├── services/                                 # Business logic
│   ├── extraction.ts                         # Auto-selects Claude or mock
│   ├── claude-extraction.ts                  # Claude AI extraction service
│   ├── website-validator.ts                  # Website reachability check
│   ├── validation.ts                         # Rule engine
│   ├── follow-up.ts                          # Question generation
│   └── summary.ts                            # Investor summary generation
└── lib/
    ├── supabase.ts                           # Supabase client factory
    ├── claude-client.ts                      # Anthropic client singleton
    ├── document-parser.ts                    # PDF / PPTX / image parser
    └── errors.ts                             # Error types + response helper

supabase/migrations/
├── 00001_initial_schema.sql                  # Full DB schema
└── 00002_extraction_metadata.sql             # Pitch deck + website columns

scripts/
├── seed.ts                                   # Demo data seeder
└── check-db.ts                               # DB column verification helper
```

---

## API Reference

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/submissions` | Create a new submission |
| `GET` | `/api/submissions` | List submissions (`?status=&limit=&offset=`) |
| `GET` | `/api/submissions/:id` | Full submission with all related data |
| `DELETE` | `/api/submissions/:id` | Delete a submission |
| `PATCH` | `/api/submissions/:id/status` | Update submission status |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/submissions/:id/files` | Upload a file (multipart, field: `file`) |
| `GET` | `/api/submissions/:id/files` | List uploaded files |
| `GET` | `/api/submissions/:id/files/:fileId` | Get 5-min signed URL for viewing |

### Processing Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/submissions/:id/extract` | Run AI extraction on uploaded files |
| `POST` | `/api/submissions/:id/validate` | Run validation + generate follow-up questions |

### Follow-ups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/submissions/:id/follow-ups` | List follow-up questions |
| `PATCH` | `/api/submissions/:id/follow-ups/:questionId` | Answer a question |
| `POST` | `/api/submissions/:id/follow-ups/batch` | Answer multiple questions |

### Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/submissions/:id/summary` | Generate investor summary |
| `GET` | `/api/submissions/:id/summary` | Retrieve generated summary |

---

## Submission Lifecycle

```
draft → submitted → extracting → extracted → validating →
  ├── validated (no gaps) → summarizing → completed
  └── follow_up_pending → [founder answers] → follow_up_received → summarizing → completed
```

At any point a submission can transition to `failed`.

---

## AI Extraction

When `ANTHROPIC_API_KEY` is set, the extraction pipeline uses `ClaudeExtractionService`. Without it, falls back to `MockExtractionService` for development.

**Extracted fields (19 total):**

| Field | Description |
|-------|-------------|
| `industry` | Industry/sector |
| `stage` | Funding stage (Pre-seed → Series C+) |
| `funding_ask_usd` | Funding amount requested |
| `revenue_annual_usd` | Annual revenue |
| `burn_rate_monthly_usd` | Monthly burn |
| `team_size` | Number of full-time employees |
| `founded_year` | Year founded |
| `location` | HQ location |
| `problem_statement` | Problem being solved |
| `solution_description` | Product/solution |
| `target_market` | Target market description |
| `business_model` | Revenue model |
| `traction_summary` | Traction / growth metrics |
| `competitive_landscape` | Competition analysis |
| `use_of_funds` | How funding will be used |
| `website_url` | Company website |
| `is_pitch_deck` | Whether document is a real pitch deck |
| `pitch_deck_confidence` | Classification confidence (0–1) |
| `sections_found` | Detected sections (problem, solution, market, etc.) |

**Supported file types:** PDF, PPTX, PPT, PNG, JPEG, TXT, CSV

---

## Validation Rules

- **Pitch deck check** — fails if document is not classified as a pitch deck
- **Required sections** — problem, solution, market, business model must be present
- **Recommended sections** — traction, competition, use of funds, team, ask (warnings)
- **Required fields** — industry, stage, funding ask, problem, solution, market, model
- **Numeric ranges** — funding ($100K–$500M), burn (positive), team (1–10K), year (1900–present)
- **Cross-field** — revenue vs burn (profitability), funding vs burn (runway ≥12 months)
- **Website** — URL format check + live reachability fetch

---

## Agent Integration

The platform is fully accessible via REST API — no browser required. An AI agent can:

```
POST /api/submissions          # create
POST /api/submissions/:id/files  # upload pitch deck
POST /api/submissions/:id/extract
POST /api/submissions/:id/validate
PATCH /api/submissions/:id/follow-ups/:qid  # answer follow-ups
POST /api/submissions/:id/summary
```
