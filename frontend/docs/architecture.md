# 🏗️ Enterprise Architecture & Multi-Agent Pipelines

The architectural backbone of **DevCareer Intelligence** is a purpose-built asynchronous orchestration cluster. It is designed to solve the "Long-Horizon Inference" problem—where analyzing vast multi-file enterprise code repositories requires dozens of chained API calls that exceed standard 30-second HTTP timeout boundaries.

---

## 1. High-Level Topological Overview

The system is split into three decoupled specialized subsystems that communicate via a state-managed PostgreSQL backbone.

### 1.1 The Client-Experience Layer (Next.js 14)
The frontend utilizes **React Server Components (RSC)** for the landing experience and **Client Components** for the live-polling dashboard.
- **Bi-Directional State Polling:** Instead of expensive WebSockets, we utilize a high-frequency polling strategy against the Supabase `audit_sessions` table. This provides a resilient "Terminal" experience that survives page refreshes.
- **Framer Motion Interactivity:** All radar graphs and timeline nodes are dynamically rendered based on the serialized JSONB output of the AI synthesizer.

### 1.2 The State Backbone (Supabase PostgreSQL)
Supabase acts as the shared memory for the stateless Next.js app and the background workers.
- **Relational Integrity:** We use PostgreSQL foreign keys to ensure that an `audit_session` cannot be deleted if it has associated `repo_analyses`.
- **JSONB Indexing:** Multi-dimensional skill maps are stored as flattened JSONB objects to allow for rapid, schema-less updates during the analysis phase.

### 1.3 The Execution Cluster (BullMQ & Redis)
The platform uses **BullMQ** to orchestrate four distinct worker stages. 
- **Worker Isolation:** If the `code-analyzer` runs out of memory on a massive repo, the `github-fetcher` and `market-fetcher` remain unaffected.
- **Concurrency Strategy:** Workers are configured with a `concurrency: 5` setting to prevent API rate-limit exhaustion on a single IP.

---

## 2. Advanced Data Modeling

All developer DNA is persisted through a normalized relational schema.

### 2.1 Audit Session Lifecycle
The `audit_sessions` table tracks the global state machine:
```sql
CREATE TYPE audit_status AS ENUM ('queued', 'fetching', 'analyzing', 'synthesizing', 'market', 'complete', 'failed');

CREATE TABLE audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_handle TEXT,
    resume_text TEXT,
    status audit_status DEFAULT 'queued',
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Deep Skill Profiling
The `skill_profiles` table stores the "Verified vs Claimed" delta.
- **Verifications:** List of specific code files that prove a skill.
- **Flaws:** List of security/structural risks found.

---

## 3. The 4-Stage Multi-Agent Pipeline Walkthrough

### 3.1 Stage 1: The Retrieval Engine (`github-fetcher.ts`)
This stage converts a URL into a local semantic tree.
- **Node-Git Integration:** Parallel clones are triggered to a `/tmp` directory.
- **Filtering Logic:** 
    - `IGNORE_PATTERNS`: `node_modules`, `dist`, `build`, `vendor`, `.git`.
    - `TARGET_EXTENSIONS`: `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.cpp`.
- **Authorship Verification:** 
    We query the GitHub `/commits` API to ensure the candidate actually wrote the files being analyzed.

### 3.2 Stage 2: The Analytic Scout (`code-analyzer.ts`)
The heaviest computational stage. It performs semantic chunking.
- **Prompt Architecture:**
    ```text
    SYSTEM: You are a Principal Security Architect. 
    TASK: Analyze the provided code for:
    1. Input Validation Quality (0-10)
    2. Modular Design Pattern (MVC/Service/Spaghetti)
    3. Error Handling Coverage
    4. Security Vulnerabilities (OWASP Top 10)
    ```

### 3.3 Stage 3: The Synthesizer (`ai-synthesizer.ts`)
Fuses the code audit with the resume.
- **Resume Parsing:** Solves the "210 encoding" issue by pre-processing PDF buffers before LLM ingestion.
- **Bullet Rewriting:** Maps original resume bullets to "Audited Realities".
  - *Input:* "Managed scalable AWS infrastructure."
  - *Audit Finding:* Code only contains local file-system writes.
  - *Output:* Rewrite bullet to reflect reality or flag as unverified.

### 3.4 Stage 4: Market Realignment (`market-fetcher.ts`)
Translates the "Verified Tier" into candidate opportunity.

---

## 4. Operational Scaling & Edge Resilience

### 4.1 Failover & Fallback
If the Groq cluster (Llama-3-70b) returns a `429` or `5xx`, the worker catch-block automatically dispatches the task to **Google Gemini 2.5 Flash**. This ensures the user never sees a failure during peak throughput.

### 4.2 Distributed Workers
In production, we recommend deploying workers with a shared Redis:
- **Worker Node A:** Handles `github-fetcher` (High I/O).
- **Worker Node B:** Handles `code-analyzer` (High CPU/Network).
- **Worker Node C:** Handles `market-fetcher` & `ai-synthesizer`.

---

## 5. Security & Isolation

- **Isolated Audits:** Each repo is cloned into a unique UUID-based folder to prevent cross-contamination.
- **Service Secret Security:** The `service_role` key never leaks to the client, protecting the database from unauthorized writes.
- **Stateless Analysis:** No code is permanently indexed; we only store the *abstract findings* (metadata), ensuring the candidate's intellectual property remains their own.

---

![Architecture](/arch.jpeg)
