# Core Installation & Deployment Workflow

This extensive setup manual outlines precisely how to clone, configure, build, and maintain the **DevCareer Intelligence** platform on a localized development environment while preserving the necessary isolation required for heavy background processing clusters. 

Whether you are evaluating the platform as a technical judge, an open-source contributor, or an enterprise DevOps engineer seeking to scale out the worker arrays across external nodes, this documentation will cleanly dictate the deployment methodology.

---

## 1. System Requirements & Prerequisites

The platform relies heavily on modern asynchronous architecture natively utilizing Node.js streams, Redis (or native JS-bound memory loops for dev), and external Language Models. You must ensure the overarching baseline infrastructure is accessible:

- **Runtime Environment:** `Node.js` (Preferably `v18.17.x` or higher to effectively handle the native `crypto.randomUUID()` modules and efficient Next.js App Router streaming responses).
- **Package Manager:** Standard `npm` (Node Package Manager). Alternatively, `pnpm` or `Yarn` operate identically as there are no obscure package linking routines.
- **Relational Database Management:** PostgreSQL via the Supabase cloud framework (or a locally Dockerized instance). The database must be capable of ingesting high volumes of JSONB tree inserts during inference mapping.
- **Hardware Profile:** Multi-Agent LLM inference operates across external API boundaries (Groq), so local compute overhead is relatively negligible. However, downloading parallel GitHub repositories during the `github-fetcher` stage requires localized network stability and small I/O buffer memory allocations.

---

## 2. Acquiring Core Application Secrets & API Keys

Before initiating a boot-loop, the server orchestrator must securely attach to external compute APIs. Obtain these keys:

### A. The Groq Inference Engine (`GROQ_API_KEY`)
The primary analytic driver mapping multi-thousand-line GitHub code-trees is powered by Groq's high-speed inference layer (specifically targeted towards Meta Llama 3 / 4 variants utilized in the agentic codebase).
1. Navigate to the [Groq Console](https://console.groq.com/).
2. Create an account, generate an API Key, and securely harbor it.

### B. Google Gemini Fallback Orchestrator (`GEMINI_API_KEY`)
To guarantee absolute 99.9% uptime across our AI-Synthesizer if Groq clusters experience throughput blocking or token limits, the platform gracefully switches load back to Google's Gemini Flash tier models.
1. Navigate to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Generate an active API configuration key.

### C. Standard GitHub Access Token (`GITHUB_TOKEN`)
Because cloning hundreds of public folders routinely using unauthorized HTTP headers will immediately result in harsh GitHub IP rate limitation bans (403 limits), standard scraping must be avoided. We utilize explicit Authenticated API Requests hitting the `api.github.com/repos` boundaries to rapidly extract metadata.
1. Head to your [GitHub Developer Settings](https://github.com/settings/tokens).
2. Create heavily restricted, scope-less (since we only read public repos) fine-grained or classic access tokens.

### D. Supabase Core Clusters (`NEXT_PUBLIC_SUPABASE_URL` & Keys)
1. Initialize a new project within [Supabase](https://supabase.com).
2. Gather the `Project URL`, the `Anon/Public Key`, and the critically important `Service Role Key` (utilized server-side natively to bypass UI Row-Level Security during background ingestion states).

### E. Market Query Endpoints (`JOOBLE_API_KEY`)
1. Obtain an API key from [Jooble's Developer Platform](https://jooble.org/api/about) to query real-time external salaries. Remotive, the secondary platform, currently offers a globally open JSON API which requires no specialized tokens!

---

## 3. Environment Variable Binding (.env.local)

Upon retrieving the keys, construct a completely isolated `.env.local` dictionary sitting exactly in the root of the `/frontend/` workspace container. DO NOT COMMIT THIS FILE TO VERSION CONTROL.

```bash
# ==============================================================================
#                      DEVCAREER INTELLIGENCE ENVIRONMENT
# ==============================================================================

# ─── Framework Boundaries ───
# Directs localized redirects and Oauth bindings across the Next.js routes.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Relational Storage Interfaces ───
# The fully scalable PostgreSQL arrays handling JSONB and audit states.
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...

# ─── LLM Cognitive Architecture Interfaces ───
# Used during the 'code-analyzer' and 'ai-synthesizer' BullMQ sequences.
GROQ_API_KEY=gsk_rZ3qM...
GEMINI_API_KEY=AIzaSyA...

# ─── Codebase Scraping Metrics ───
# Secures extended rate boundaries when extracting 100+ files per audit.
GITHUB_TOKEN=ghp_Wp2...

# ─── Live Market Resolution Integration ───
# Connects the matched user-skills back to authentic recruiter datasets.
REMOTIVE_API_URL=https://remotive.com/api/remote-jobs
JOOBLE_API_KEY=55cc...
```

---

## 4. Deep Database Schematic Loading (Schema Management)

The platform rejects simple key-value pairings and strictly enforces heavily relational PostgreSQL constraints. Because background orchestrators like `market-fetcher` demand precise JSONB nesting, the database schema must be initialized effectively.

### Executing The Initialization Logic
1. Log into your Supabase Dashboard natively.
2. Open the embedded SQL Editor workspace.
3. Open the file located functionally at `frontend/supabase/migrations/001_initial_schema.sql` residing inside the codebase.
4. Copy the entire contents directly over and **Execute**.

### Expected Table Outcomes & Rationales
- **`audit_sessions`**: The absolute primary node representing a user's overarching submission context mapping the percentage-based loading pipeline.
- **`authorship_maps`**: The mathematical output generated explicitly to defeat "Tutorial Clone" padding by cross-indexing commit densities.
- **`repo_analyses`**: Normalization tables breaking individual projects into `complexity_tiers`, capturing specific syntax vulnerabilities and pattern violations inside `security_issues` JSON arrays.
- **`skill_profiles`**: Aggregates all separate repositories mapping frontend to backend tiers, maintaining "flaw findings" isolated natively from the user.
- **`roadmaps`**: Saves the explicitly generated LLM-bound 13-week JSON array tracking weekly tasks and milestone achievements.

---

## 5. Fetching Library Dependencies & Installing Contexts

This software architecture implements various modern libraries. Initialize the `npm` lockfile and download the active network binaries. Navigate strictly inside the `frontend` folder context:

```bash
cd frontend
npm install
```

### Known PDF Parsing Console Warnings
During installation or server executions, you may run into verbose standard error messages outlining failures around the `@napi-rs/canvas` registry or the core `pdf-parse` utility throwing:
> `Warning: Cannot polyfill DOMMatrix, rendering may be broken.`

**Why this happens:** Advanced modern PDF renderers usually construct internal simulated DOM mappings to pull images.
**Why it DOES NOT matter:** DevCareer intelligence implements aggressive, natively decoupled string-byte extractors handling the direct output text buffers. The AI Regex filters gracefully intercept explicit bullet encoded strings like `210` masking raw character blobs completely bypassing the internal HTML canvas breakdown natively. You may safely disregard these underlying canvas warnings entirely.

---

## 6. Execution Loop & Bootstrapping The Live Architecture

To trigger the `BullMQ` instance (which typically requires decoupled Redis container arrays when deployed on vast networks), the local environment securely instantiates Native In-Memory Queues tied natively to the `instrumentation.ts` bootstrap pipeline of Next.js.

By running the classic build loop, you spin up BOTH the incredibly responsive Tailwind Next App Server AND the underlying array of AI Job Processors:

```bash
npm run dev
```

### Process Monitoring
Observe the execution terminal closely. Proper bootstrapping generally emits statements signifying that the background orchestration logic has correctly established links and has injected state trackers:
> `[Dev] Started in-memory orchestrator inside Next.js process.`

When an end-user navigates to `localhost:3000` and dispatches a JSON payload bound by a PDF file and dual GitHub URLs against `/api/audit/start`, you will seamlessly observe the console explode linearly out through:
- `[GitHubFetcher] Extracting trees -> [CodeAnalyzer] Processing Groq Chunks -> [AISynthesizer] Fusing Roadmaps -> [MarketFetcher] Querying external API datasets.`

Congratulations, you are fundamentally ready to tear into the underlying truth behind resume-driven-development!

---

![Setup Completion GIF](/demo3.gif)

## 7. Operational Troubleshooting & Node Edge Cases

1. **"The Database Continually Yields 0 Rows or Null for Roadmaps!"**
Ensure you haven't rebooted or refreshed endpoints aggressively causing rapid multi-job firing for the same `session_id`. The fetcher logic is bound strictly by `.limit(1)` avoiding the `PGRST116 multiple rows returned` failure, but if you wipe databases consistently, remember to `DELETE CASCADE` explicitly.

2. **"Worker Logs Aren't Updating Code after Making Save Updates!"**
As `BullMQ` background nodes execute fundamentally deep inside the localized memory cluster allocated physically on Server Node Boot, standard React hot reloads **will completely ignore** worker code updates! If you rewrite the AI prompts or modify `ai-synthesizer.ts`, you MUST execute a complete shell interrupt (`Ctrl + C`) and restart the `npm run dev` pipeline sequentially!

3. **"Rate Limiting on Large Projects"**
If you pass the repository URI for immense systems (Ex. Torvalds's Linux core), the system truncates explicit file heuristics bypassing massively massive node depths limiting deep token explosions toward the overarching LLM endpoints protecting your account API bill limits drastically.
