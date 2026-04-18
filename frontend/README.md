<div align="center">
  <h1>DevCareer Intelligence Platform</h1>

  <p>
    <strong>A precision-engineering technical assessment platform designed for automated codebase auditing and verified skill-tier identification.</strong>
  </p>

  <p>
    Status: Production Stable |
    Framework: Next.js 14 (App Router) |
    Database: Supabase (PostgreSQL) |
    AI: Groq (Llama-3) & Google Gemini (Flash) |
    Queue: BullMQ (Redis)
  </p>
</div>

<br />

---

## 📌 1. Platform Philosophy

In a technical landscape increasingly saturated with boilerplate code and AI-assisted generation, DevCareer Intelligence provides a objective verification layer for engineering leadship.

The platform physically clones, parses, and identifies code authorship, generating a "Verified Skill DNA" based on empirical evidence rather than static resume claims.

### Key Problems Solved:
- **Credential Inflation:** Resumes often inflate simple tutorial projects into "Senior-level" accomplishments. Our auditing engine identifies these tutorial patterns and adjusts tiers accordingly.
- **Screening Latency:** Automates the initial code-review phase by identifying security flaws, architectural patterns, and modularity issues before a human interview takes place.
- **Evidence-Based Hiring:** Provides engineering managers with a "Brutally Honest" audit report that separates valid claims from unverified hyperbole.

---

## 💡 2. Core Feature Engine

### 2.1 Automated Codebase Auditing
Using massive context window LLMs combined with AST chunking algorithms, the platform evaluates entire repository structures.
- **Security Scrutiny:** Analyzes source for hardcoded secrets, SQL injection vectors, and insecure state management.
- **Architectural Scaling:** Classifies projects based on structural complexity, identifying the difference between generic CRUD apps and enterprise-grade distributed systems.

### 2.2 Resume Verification Engine
Parses candidate PDFs and compares the text against the verified code evidence. 
- **The Debunker:** Flags professional claims that are not supported by the physical repository submissions.
- **Evidence Formatting:** Re-writes bullet points to include verified citations from the audit (e.g., "Verified: Optimized SQL queries in /server/models/post.go").

### 2.3 Tutorial-Clone Detection
Identifies common boilerplate and tutorial structures. If a repository is identified as a clone, the system applies a weighting penalty to the overall Verified Tier to prevent inflated career matches.

### 2.4 Skill Evolution Roadmap
Generates a prescriptive 13-week learning roadmap (90 days) based on the specific architectural and security voids identified during the audit.

---

## 🏗️ 3. System Architecture

![Architecture](/arch.jpeg)

DevCareer Intelligence utilizes a decoupled, asynchronous multi-agent pipeline:

1. **Source Fetcher:** Handles secure temporary cloning and filtered file ingestion.
2. **Scout Analyzer:** Executes parallel inference audits across the codebase tree.
3. **Synthesis Engine:** Fuses resume input and codebase audits into a unified profile.
4. **Market Registry Aligner:** Queries real-time job indices to match candidates with verified-tier opportunities.

---

## 🏁 4. Setup & Implementation

For full installation details, refer to the **[Installation Guide](./docs/setup.md)**.

```bash
# Install dependencies
npm install

# Start production-ready development server
npm run dev
```

---

## 📖 5. Documentation Directory

Detailed technical specifications are available within the `/docs` path:
- [**Architecture Deep-Dive**](./docs/architecture.md)
- [**Feature Specification**](./docs/features.md)
- [**Deployment Guide**](./docs/setup.md)

---

<p align="center">
  <i>"Verifying engineering reality." — DevCareer Intelligence</i>
</p>
