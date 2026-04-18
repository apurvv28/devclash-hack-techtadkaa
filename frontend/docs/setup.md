# 🛠️ Enterprise Installation & Deployment Manual

This documentation provides an exhaustive walkthrough for bootstrapping the **DevCareer Intelligence** platform within professional engineering environments. It covers everything from initial environment configuration to advanced background worker orchestration and production scaling strategies.

---

## 1. System Requirements & Baseline Infrastructure

Ensure your host machine or deployment container meets the following specifications to handle parallel GitHub cloning and high-density AI inference streams.

### Hardware Prerequisites
- **CPU:** Minimum 2 Cores (Recommended: 4+ Cores for high-concurrency auditing).
- **RAM:** Minimum 4GB (Recommended: 8GB to buffer large repository file trees in memory).
- **Disk Space:** Minimum 10GB of temporary block storage (Used for transient source-level cloning before analysis and purge).
- **Network:** Enterprise-grade egress to prevent timeouts during large repository clones.

### Software Dependencies
- **Node.js:** `v18.17.x LTS` or higher.
- **Package Manager:** `npm` (v9+) or `pnpm` (v8+).
- **Redis:** Required for production-grade `BullMQ` cluster persistence.
- **Supabase Account:** Required for PostgreSQL hosting and Row-Level Security management.

---

## 2. API Keychain & Secret Management

The platform behaves as an orchestrator across multiple external intelligence and data providers. Populating the following keychain is mandatory:

### 2.1 Web Inference Engines
- **GROQ_API_KEY:** The primary engine for high-speed codebase analysis (>800 tokens/sec).
- **GEMINI_API_KEY:** Acts as a resilient fallback for synthesis tasks if Groq rate limits are encountered.

### 2.2 Source & Market Adapters
- **GITHUB_TOKEN:** Required for authenticated repo cloning and metadata extraction.
- **JOOBLE_API_KEY:** Used to query live localized job vacancies for market alignment.

### 2.3 Storage Layer
- **NEXT_PUBLIC_SUPABASE_URL & ANON_KEY:** Found in your Supabase Project Settings.
- **SUPABASE_SERVICE_ROLE_KEY:** **CRITICAL.** This key is used by background workers to bypass RLS and write results directly to the database. NEVER expose this in client-side code blocks.

---

## 3. Environment Configuration (.env.local)

Create a secure `.env.local` in the `/frontend` directory. Ensure there are no leading or trailing whitespace characters.

```bash
# ==============================================================================
#                      DEVCAREER INTELLIGENCE SECRETS
# ==============================================================================

# ─── App URLs ───
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Supabase Configuration ───
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...

# ─── AI Inference Keys ───
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# ─── External Adapters ───
GITHUB_TOKEN=ghp_...
JOOBLE_API_KEY=...
REMOTIVE_API_URL=https://remotive.com/api/remote-jobs
```

---

## 4. Database Schema Migration

The system relies on a strictly typed relational schema. To initialize:

1. Open your Supabase Dashboard SQL Editor.
2. Initialize a "New Query".
3. Copy the contents of `frontend/supabase/migrations/001_initial_schema.sql`.
4. Run the migration.

---

## 5. Development & Bootstrapping

Dependencies must be installed prior to the boot-loop initialization:

```bash
# Navigate to web root
cd frontend

# Install package dependencies
npm install

# Start concurrent Next.js + BullMQ worker orchestration
npm run dev
```

### Instrumentation Lifecycle:
This project utilizes Next.js `instrumentation.ts` to boot background workers *inside* the development process. You will see a console confirmation:
> `[Dev] Started in-memory orchestrator inside Next.js process.`

---

## 6. Operational Troubleshooting & FAQ

### Q1: Handling PDF Parsing Warnings ("DOMMatrix is not defined").
**A:** This is a known warning from the `@napi-rs/canvas` dependency. DevCareer Intelligence uses a **Regex-based Fallback** extractor that pulls raw text buffers directly from the PDF stream, bypassing the need for a canvas renderer. These warnings can be safely ignored.

### Q2: Why is the synthesis report returning null values?
**A:** This typically indicates a thermal cooling period or rate-limit on your `GROQ_API_KEY`. The system is designed to perform an automatic fallback to Google Gemini to preserve the audit lifecycle. Ensure both keys are valid.

### Q3: Worker logic changes are not reflecting in the UI.
**A:** Because background workers are booted during the instrumentation lifecycle, they often bypass standard React hot-reloading. You MUST restart the `npm run dev` process to apply changes to `worker/jobs/*.ts` files.

---

## 7. Production Deployment & Scaling

- **External Redis:** Transition from the in-memory fallback to a managed Redis instance (e.g. Upstash) for production-grade reliability.
- **Microservice Workers:** While integrated for convenience, background workers should be deployed as separate Node.js processes in high-traffic environments to isolate CPU usage from the main web process.
- **Secrets Management:** Use environment-specific secrets management (e.g., Vercel Secrets or AWS Parameter Store) for the `SUPABASE_SERVICE_ROLE_KEY`.

---

![Architecture](/arch.jpeg)
