# 🚀 Proprietary Verification Engines & Feature Specifications

DevCareer Intelligence utilizes a suite of custom heuristics and multi-agent synthesis engines to perform high-fidelity technical assessments. This document outlines the technical logic and algorithmic boundaries of our core verification services.

---

## 1. The "Verified Tier" Algorithm

The platform calculates a verified engineering tier (Level 1 to Level 5) by aggregating multi-dimensional codebase metrics. This is designed to prevent "Keyword Stuffing" from artificially inflating a candidate's seniority.

### 1.1 Dimensional Weighting
The assessment prioritizes these four fundamental pillars:
- **Architectural Complexity (40%):** Evaluates the use of design patterns, project structural depth, and dependency management.
- **Security Posture (30%):** Scores based on the absence of common vulnerabilities (OWASP) and the presence of protective middleware.
- **Modularity & Error Handling (20%):** Analyzes function encapsulation, exception coverage, and state management logic.
- **Code Maintenance (10%):** Evaluates documentation strings, type-safety coverage (TypeScript), and naming conventions.

### 1.2 The Seniority Ceiling
If a repository is identified as a "Single-file script" or a "Basic CRUD boilerplate" without advanced abstractions, the algorithm applies a **Seniority Ceiling**. This prevents candidates from reaching "Senior" or "Lead" verification based on simple projects, regardless of their resume claims.

---

## 2. Advanced Tutorial & Clone Detection (Heuristic Engine)

To maintain the integrity of the assessment, we implement several layers of plagiarism and "Tutorial Clone" detection.

### 2.1 Structural Fingerprinting
The engine maintains a registry of file trees commonly found in high-traffic online tutorials (e.g., "MERN Stack Ecommerce Clone"). 
- **The Filter:** Files like `components/WeatherCard.tsx` or `context/CartContext.js` are cross-referenced with common tutorial distributions.
- **Flagging:** High-confidence matches trigger a "Boilerplate Detected" flag, significantly reducing the weighted contribution of that specific repository to the final audit.

### 2.2 Chronological Authorship Analysis
Instead of trusting the simple `git log`, we analyze the **Commit Density Pattern**. 
- **Organic Growth:** Genuine projects show an evolution of commits over days or weeks with varying message lengths.
- **Bulk Ingestion:** Tutorial clones often exhibit "Batch Commits" where 100+ files are added in a single burst with messages like "Initial Commit" or "Finished App".

---

## 3. Resume "Truth" Synthesis (The Damage Report)

The platform performs a literal "Code vs. Text" audit.

### 3.1 PDF Extraction (Buffer-Level Extraction)
We utilize a raw buffer extractor to pull text directly from the PDF stream. This bypasses the need for visual renderers and ensures we capture high-precision text even from obscure LaTeX-generated CVs.

### 3.2 Side-by-Side Synthesis
The synthesis agent (Stage 3) creates a mapping between the resume bullets and the verified features in the code.
- **Audited Bullet:** *“Implemented complex auth logic using JWT and OAuth2.”*
- **Verification Engine:** Searches the codebase for `@passportjs/` or `jsonwebtoken` usage.
- **Result:** If no such code is found, the system flags the bullet as **"Unverified Claim"** and provides a corrected version based on what *was* actually found in the code.

---

## 4. Market Alignment & Skill Trajectory GAP Analysis

The final output is a 13-week prescriptive curriculum.

### 4.1 The GAP Analysis Engine
It identifies the delta between the **Verified Current Tier** and the **Target Role Benchmarks**.
- **Example:** If the user is verified at Tier 2 (Intermediate) but wants a Tier 4 (Staff) role, the engine identifies the missing gaps (e.g., "Missing Distributed Caching / Redis experience").

### 4.2 Localized Job Querying
We utilize Jooble's REST API to match the verified skill-persona with high-relevancy vacancies. We strictly filter by the **Verified Tier**, ensuring the candidate does not waste time applying for roles for which they lack proven evidence.

---

![Architecture](/arch.jpeg)
