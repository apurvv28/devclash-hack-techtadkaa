import Groq from 'groq-sdk'
import type { Roadmap, SalaryGapSkill, ResumeBullet, AuditFlawFinding, SecurityIssue } from '@/types/index'
import { supabaseAdmin } from '@/lib/supabase/admin'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

// ─── Rate Limiter ──────────────────────────────────────────────────────────────

class GroqRateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests = 28
  private readonly windowMs = 60000

  async waitIfNecessary() {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)
    if (this.timestamps.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.timestamps[0])
      if (waitTime > 0) {
        console.log(`[Groq] Rate limit approaching. Pausing ${Math.ceil(waitTime / 1000)}s...`)
        await new Promise(r => setTimeout(r, waitTime))
      }
      this.timestamps = []
    }
    this.timestamps.push(Date.now())
  }
}

const groqLimiter = new GroqRateLimiter()

// ─── Helper: call Groq with retry ──────────────────────────────────────────────

async function callGroq(prompt: string, maxTokens = 4000): Promise<string> {
  await groqLimiter.waitIfNecessary()
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.3,
  })
  return completion.choices[0]?.message?.content ?? ''
}

function extractJSON(text: string): string {
  // Strip markdown fences
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  // Find the first [ or { and last ] or }
  const arrStart = cleaned.indexOf('[')
  const objStart = cleaned.indexOf('{')
  const start = arrStart >= 0 && (objStart < 0 || arrStart < objStart) ? arrStart : objStart
  if (start < 0) return cleaned
  const isArray = cleaned[start] === '['
  const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
  if (end < 0) return cleaned
  return cleaned.slice(start, end + 1)
}

// ─── Flaw Narration (Primary: Groq) ────────────────────────────────────────────

export async function generateFlawNarration(params: {
  code_chunk: string
  filename: string
  line_start: number
  line_end: number
  repo_name: string
  branch_name: string
  github_username: string
  complexity_tier: number
  career_tier: string
  security_issues: SecurityIssue[]
  dimension_scores: Record<string, number>
}): Promise<AuditFlawFinding[]> {
  const prompt = `You are a senior staff engineer conducting a brutal but fair code review.

Developer GitHub: ${params.github_username}
Repository: ${params.repo_name}, Branch: ${params.branch_name}
File: ${params.filename}, Lines: ${params.line_start}-${params.line_end}
Project Complexity Tier: ${params.complexity_tier}/5
Developer's Verified Career Tier: ${params.career_tier}
Pre-detected Security Issues: ${JSON.stringify(params.security_issues)}

Code to review:
${params.code_chunk}

Strictly identify the top 3 most impactful *negative* issues. You must be brutal, highly critical, and objectively enforce production-grade enterprise standards. Do not sugarcoat. Base your findings ONLY on the provided code evidence. Ignore positive aspects. If the user's setup matches tutorial boilerplates, punish them for lacking architectural depth. FRAME each issue as a critical flaw of the user's specific bad approach.

Respond ONLY with a valid JSON array matching this format:
[
  {
    "file": "${params.filename}",
    "line_start": ${params.line_start},
    "line_end": ${params.line_end},
    "repo_name": "${params.repo_name}",
    "github_permalink": "https://github.com/${params.github_username}/${params.repo_name}/blob/${params.branch_name}/${params.filename}#L${params.line_start}-L${params.line_end}",
    "what_it_is": "<one sentence>",
    "why_it_matters": "<one sentence>",
    "what_fixing_unlocks": "<one sentence>",
    "severity": "<critical|high|medium>",
    "career_impact": "<Junior to Mid|Mid to Senior>"
  }
]`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(prompt, 2000)
      const parsed = JSON.parse(extractJSON(raw))
      if (Array.isArray(parsed)) return parsed as AuditFlawFinding[]
    } catch (err) {
      console.warn(`[Groq:FlawNarration] Attempt ${attempt + 1} failed:`, (err as Error).message)
    }
  }
  return []
}

// ─── Resume Rewrite (Primary: Groq) ────────────────────────────────────────────

export async function generateResumeRewrite(params: {
  original_bullets: string[]
  audit_evidence: {
    repo_name: string
    complexity_tier: number
    weighted_score: number
    top_skills: string[]
    security_issues_count: number
    has_tests: boolean
    languages: string[]
  }[]
  is_tutorial_repos: string[]
  overall_tier: string
  github_username: string
}): Promise<ResumeBullet[]> {
  const prompt = `You are a technical recruiter with 10 years experience who also writes code.

Developer GitHub: ${params.github_username}
Verified Overall Tier: ${params.overall_tier}
Audit Evidence: ${JSON.stringify(params.audit_evidence)}
Tutorial clone repos (do NOT use as lead points): ${JSON.stringify(params.is_tutorial_repos)}

Original resume bullets:
${params.original_bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Rewrite each bullet grounded ONLY in the audit evidence. Be brutal and completely strict. Remove ALL unverified generic fluff, buzzwords, and vague claims. If the user claims 'Architected system' but the codebase is a tutorial clone or basic CRUD, explicitly debunk it and assign 'low' confidence. Base the analysis specifically on the user's verified contributions.

Respond ONLY with a valid JSON array:
[{"original":"...","rewritten":"...","evidence_source":"...","confidence":"high|medium|low"}]`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(prompt, 2000)
      const parsed = JSON.parse(extractJSON(raw))
      if (Array.isArray(parsed)) return parsed as ResumeBullet[]
    } catch (err) {
      console.warn(`[Groq:ResumeRewrite] Attempt ${attempt + 1} failed:`, (err as Error).message)
    }
  }
  return []
}

// ─── Roadmap Generation (Primary: Groq) ────────────────────────────────────────

export async function generateRoadmap(params: {
  session_id: string
  github_username: string
  overall_tier: string
  skill_gaps: { dimension: string; score: number; tier: string }[]
  strengths: { dimension: string; score: number; tier: string }[]
  highest_complexity_tier: number
  commit_archetype: string
  salary_gap_skills: SalaryGapSkill[]
  resume_bury_repos: string[]
  security_issues_count: number
  tutorial_penalty_applied: boolean
}): Promise<Roadmap> {
  const prompt = `You are a developer career coach who is also an experienced engineer.

Developer: ${params.github_username}
Current Verified Tier: ${params.overall_tier}
Commit Archetype: ${params.commit_archetype}
Highest Project Complexity: ${params.highest_complexity_tier}/5

Skill Gaps: ${params.skill_gaps.map(g => `${g.dimension}: ${g.score}/100`).join(', ')}
Strengths: ${params.strengths.map(s => `${s.dimension}: ${s.score}/100`).join(', ')}
Security issues found: ${params.security_issues_count}

${params.highest_complexity_tier <= 1 ? 'CRITICAL: Developer has only built simple CRUD apps. Include building a complexity tier 3+ project.' : ''}

Generate a 90-day (13-week) learning roadmap prioritized by career ROI.

Respond ONLY with valid JSON:
{"week_breakdown":[{"week":1,"title":"...","tasks":[{"title":"...","description":"...","resource_url":"...","resource_type":"docs|video|project|practice","estimated_hours":4}],"milestone":"..."}],"complexity_gap_prescription":"...","archetype_prescription":"..."}`

  let parsed: any = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(prompt, 4000)
      parsed = JSON.parse(extractJSON(raw))
      if (parsed?.week_breakdown) break
    } catch (err) {
      console.warn(`[Groq:Roadmap] Attempt ${attempt + 1} failed:`, (err as Error).message)
      parsed = null
    }
  }

  // Fallback if Groq fails completely
  if (!parsed || !parsed.week_breakdown) {
    console.warn('[Groq:Roadmap] All attempts failed. Using hardcoded fallback.')
    parsed = {
      week_breakdown: [
        { week: 1, title: 'Security Foundations', tasks: [{ title: 'Fix critical vulnerabilities', description: 'Address all high-severity security issues found in audit.', resource_url: 'https://owasp.org/www-project-top-ten/', resource_type: 'docs', estimated_hours: 6 }], milestone: 'Zero critical security issues' },
        { week: 2, title: 'Testing & Quality', tasks: [{ title: 'Add unit tests', description: 'Write tests for core business logic.', resource_url: 'https://jestjs.io/docs/getting-started', resource_type: 'docs', estimated_hours: 8 }], milestone: '50% test coverage' },
        { week: 3, title: 'Error Handling', tasks: [{ title: 'Implement error boundaries', description: 'Add structured error handling across the application.', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch', resource_type: 'docs', estimated_hours: 4 }], milestone: 'Consistent error handling' },
      ],
      complexity_gap_prescription: 'Build a full-stack app with auth, payments, and real-time features.',
      archetype_prescription: 'Commit daily, even small changes. Build consistency.'
    }
  }

  const roadmap: Roadmap = {
    id: crypto.randomUUID(),
    session_id: params.session_id,
    week_breakdown: parsed.week_breakdown,
    priority_skills: params.salary_gap_skills.slice(0, 5).map(s => s.skill),
    complexity_gap_prescription: parsed.complexity_gap_prescription || '',
    archetype_prescription: parsed.archetype_prescription || '',
    resume_lead_projects: [],
    resume_bury_projects: params.resume_bury_repos,
    rewritten_bullets: [] as ResumeBullet[],
  }

  // Save to DB (non-fatal if it fails)
  const { error } = await supabaseAdmin.from('roadmaps').upsert(roadmap)
  if (error) console.warn('[Groq:Roadmap] Failed to save roadmap to DB:', error.message)

  return roadmap
}
