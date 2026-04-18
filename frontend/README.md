<div align="center">
  <img src="/logo.png" alt="DevCareer Intelligence Logo" width="120" />
  <h1>DevCareer Intelligence Platform</h1>

<p>
    <strong>A next-generation, brutally honest developer auditing & intelligence platform designed to cut through resume fluff, verify actual code contributions, and generate evidence-based hiring profiles.</strong>
  </p>

<p>
    <img src="https://img.shields.io/badge/Status-Hackathon_Winner_Ready-success.svg" alt="Status" />
    <img src="https://img.shields.io/badge/Framework-Next.js_14-black.svg" alt="Next.js" />
    <img src="https://img.shields.io/badge/Database-Supabase-green.svg" alt="Supabase" />
    <img src="https://img.shields.io/badge/AI-Groq_%2F_Gemini-orange.svg" alt="AI Models" />
    <img src="https://img.shields.io/badge/Queue-BullMQ-red.svg" alt="BullMQ" />
  </p>
</div>

<br />

![Main Dashboard Preview](/dashboard.png)

## 📌 Context: The Problem

The technology industry faces a severe crisis of credential inflation and resume-padding. Junior developers often claim "Senior System Architecture" experience after merely cloning a weather app tutorial, while algorithmic automated ATS (Applicant Tracking Systems) blindly rank these fraudulent candidates higher due to keyword-stuffing.

Conversely, highly skilled, uniquely talented engineers who struggle with resume hyperbole are sidelined because their resumes lack the "buzzwords" that recruiters depend on.

Technical recruiters and engineering managers currently solve this by spending hundreds of hours reading through scattered GitHub commits, or paying thousands of dollars for generic algorithm testing platforms like LeetCode, which test rote memorization rather than actual software engineering, architecture, testing, and security principles.

## 💡 The Solution: DevCareer Intelligence

**DevCareer Intelligence** flips the hiring market on its head by implementing a "Trust, but strictly Verify" paradigm.

Instead of an ATS scanning for keywords, our platform acts as an **Automated Principal Engineer**. It physically clones the applicant's GitHub projects, chunks their code, dynamically cross-references commit authorship to prevent plagiarism and tutorial cloning, and mathematically hashes out an undeniably verified "Developer Skill DNA".

We bridge the gap between candidate claims and objective reality by strictly evaluating structural complexity, test coverage, and enterprise patterns. Based on this indisputable matrix, we programmatically rewrite their resume, generate a tactical 90-day learning roadmap, and accurately query real-world job markets to align candidates with roles they actually qualify for.

---

## 🚀 Key Features

### 1. Evidence-Based Codebase Auditing

Using large context window LLMs (Groq Llama variants) combined with AST chunking algorithms, the platform evaluates entire repository structures.

- **Security & Flaw Detection:** Analyzes poor configuration, exposed secrets, or SQL injection vectors, extracting the exact filename and line number to present inside the UI.
- **Architectural Scaling:** Classifies projects strictly from `Tier 1 (Trivial CRUD)` to `Tier 5 (Enterprise/Distributed)`.

![Audit Execution](/demo1.gif)

### 2. The "Resume Damage Report" Engine

The system parses unstructured dense PDFs using native byte-boundary isolation. Once text is extracted, the AI compares the physical code evidence against the applicant's written bullets.

- If a user claims *“Architected scalable backend infrastructure”*, but the system observes a 1-file Node.js server with 4 HTTP routes...
- **The system ruthlessly "damages" the tier** and generates a side-by-side rewriting highlighting the unverified claim, assigning a "Low Confidence" badge, and rewriting the bullet point to reflect objective reality.

![Resume Rewriter](/demo2.gif)

### 3. Anti-Plagiarism & Tutorial Clone Penalties

The modern era is littered with cloned boilerplate projects. We fight back through the **TutorialDetector** matrix.

- Evaluates specific file combinations inside standard directories (`components/WeatherCard.tsx`).
- Identifies unusually low commit-to-file ratios indicative of cloning.
- A "plagiarism" flag fundamentally halts the user's overall verified tier from advancing beyond Junior stages, preventing inflated job matches.

### 4. Dynamic 90-Day Skill Prescriptions

The platform isn't just about harsh auditing; it acts as a mentor. Based strictly on the mathematical delta between current capacity and target career goals, the system constructs an incredibly detailed 13-week JSON roadmap spanning from architectural theory to concrete integration assignments to fix missing knowledge pools.

### 5. Multi-Agent Background Workflows

To prevent blocking client interactions over heavy large-language-model inference, the entire system is cleanly decoupled utilizing native `BullMQ` asynchronous pipelines. Clients receive tokenized stream responses via Next.js routes, completely isolated from worker-thread failures, providing massive orchestration scaling at enterprise tiers.

---

## 🛠️ Technology Stack & Architecture

We specifically curated an aggressively fast, natively scalable ecosystem intended to support a vast amount of background AI inference processes concurrently.

### Core Stack

- **Framework:** Next.js (App Router) integrating React Server Components for SEO and fast First-Contentful-Paint metrics.
- **Styling:** TailWind CSS utilizing hyper-modern dynamic glassmorphism and animated components to invoke trust and professional enterprise aesthetics.
- **Database:** Supabase PostgreSQL executing Row-Level Security profiles, utilizing strictly typed `pg_vector` patterns, normalized JSONB relational trees, and natively scaling backend.

### Multi-Agent Intelligence

- **Inference Models:** Primary reasoning routed through `Groq` API utilizing Llama-3-based sub-models yielding >800 tokens a second for rapid cross-file codebase synthesis. Google `Gemini 2.5 Flash` serves as the structural fallback mechanism ensuring 99.9% uptime.
- **Worker Queues:** Redis-backed `BullMQ` natively mounted utilizing `instrumentation.ts` to allow memory-shared orchestrator polling directly bridging serverless functions.
- **Market Fetchers:** Axios-bound live query REST API adapters hitting standard Jooble and Remotive endpoints to deliver true regional active-market alignment.

![Tech Stack Diagram](/techstack.jpg)

---

## 📖 Deep-Dive Documentation Structure

To truly understand how to implement, maintain, and understand the core architectural decisions behind DevCareer Intelligence, please refer to the dedicated documentation within the `/docs` directory.

Each file contains extensive explanations of the underlying mathematical bounds and integration requirements:

| Document                                                         | Content Outline                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Setup & Deployment Phase**](./docs/setup.md)               | The ultimate installation guide. From configuring your PostgreSQL remote URL strings over Supabase, configuring the exact necessary environment secrets, solving PDF parsing edge-cases, and managing native background orchestrators.       |
| [**System Architecture & Pipelines**](./docs/architecture.md) | Explore the massive underlying state machine. Diagrams and explanations detailing the `audit_sessions` loop, the exact behavior of the robust 4-phase `BullMQ` pipeline, and database relational boundaries.                             |
| [**Features & Code Deep-Dive**](./docs/features.md)           | A brutal breakdown of the specific algorithms holding the platform together. Explains the logic behind the "Verified Tier Match", the "Tutorial Clone detector's" math, and the AI regex buffer isolation for dirty raw LaTeX-rendered PDFs. |

---

## 🎨 User Experience Journey

The UX is designed to be frictionless yet evoke the feeling of a heavy terminal-style execution.

1. **The Submission:** The user drops a PDF and their core GitHub URLs into a clean drop-zone on the landing dashboard.
2. **The Terminal State:** While BullMQ works in the background handling AI orchestration, the user evaluates a live-streaming, WebSocket-like terminal UI displaying specific file download phases, scanning logic, and vulnerability finding ticks.
3. **The Reveal:** Once evaluated, the user is transitioned instantly into the `ReportDashboardClient` where radar graphs, Tier Badging, Market Availability bars, and the Resume Rewriters natively construct the final developer intelligence layout.

![Terminal Loading Screen](/terminal_loading.gif)

---

## 📈 Impact & Scalability (Hackathon Value Proposition)

Hiring technical talent is widely considered the most expensive, time-consuming operation a software organization undertakes. The industry standard utilizes automated DSA (Data Structures & Algorithms) assessment software that has fundamentally drifted away from testing **engineering reality**.

DevCareer Intelligence directly targets the $30 Billion IT recruitment sector:

- **For Enterprises:** Radically slashes technical-screening interview hours. Instead of spending 5 hours doing code reviews on take-home assignments, this platform does extremely rigid automated auditing instantly.
- **For Junior Developers:** Destroys "Gatekeeping". By presenting unbiased verified tier matching, talented developers without Ivy-league degrees can actively prove their abilities via complex open source commits without having their resumes ignored by ATS keywords.
- **Monetization Angle:** Recruiter enterprise tier accesses, Premium AI detailed technical auditing bounds, AI Mock-Interviews against the detected codebase flaws, and candidate placement bounties.

---

## 🧑‍💻 Contributing & License

We passionately encourage pull requests ranging from enhancing the Tutorial Plagiarism RegEx, to optimizing the BullMQ worker batch metrics, or bridging new Market API adapters globally!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingAlgorithm`)
3. Commit your Changes (`git commit -m 'Added complex structural analysis capability'`)
4. Push to the Branch (`git push origin feature/AmazingAlgorithm`)
5. Open a Pull Request

**License:** Distributed universally under the MIT License. Open-source innovation fundamentally thrives when strictly verified code structures can be analyzed completely universally.

---

<p align="center">
  <i>"Verifying reality in a world of resumes." — DevCareer Intelligence</i>
</p>
