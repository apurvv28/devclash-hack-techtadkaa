/**
 * Gemini AI — FALLBACK provider.
 * Used only when Groq (primary) fails.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AuditFlawFinding, SecurityIssue, ResumeRecommendation } from '@/types/index'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

function extractJSON(text: string): string {
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const arrStart = cleaned.indexOf('[')
  const objStart = cleaned.indexOf('{')
  const start = arrStart >= 0 && (objStart < 0 || arrStart < objStart) ? arrStart : objStart
  if (start < 0) return cleaned
  const isArray = cleaned[start] === '['
  const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
  if (end < 0) return cleaned
  return cleaned.slice(start, end + 1)
}

export async function geminiFlawNarration(params: {
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
  try {
    const prompt = `You are a senior staff engineer. Review this code and return the top 3 issues as a JSON array.
File: ${params.filename}, Repo: ${params.repo_name}
Security Issues: ${JSON.stringify(params.security_issues)}
Code: ${params.code_chunk}

Return JSON array: [{"file":"...","line_start":0,"line_end":0,"repo_name":"...","github_permalink":"...","what_it_is":"...","why_it_matters":"...","what_fixing_unlocks":"...","severity":"critical|high|medium","career_impact":"..."}]`

    const result = await model.generateContent(prompt)
    const parsed = JSON.parse(extractJSON(result.response.text()))
    if (Array.isArray(parsed)) return parsed as AuditFlawFinding[]
  } catch (err) {
    console.warn('[Gemini:FlawNarration] Fallback also failed:', (err as Error).message)
  }
  return []
}

// ─── Resume Recommendation (Fallback: Gemini) ────────────────────────────────────
export async function geminiResumeRecommendations(params: {
  resume_text: string
  audit_evidence: {
    repo_name: string
    complexity_tier: number
    weighted_score: number
    top_skills: string[]
    security_issues_count: number
    has_tests: boolean
    languages: string[]
  }[]
  overall_tier: string
  github_username: string
}): Promise<ResumeRecommendation[]> {
  const prompt = `You are a technical recruiter with 10 years experience serving as a developer career coach.
  
Developer GitHub: ${params.github_username}
Verified Overall Tier: ${params.overall_tier}
Audit Evidence: ${JSON.stringify(params.audit_evidence)}

Original resume text (raw):
${params.resume_text.slice(0, 2000)}

Provide exactly 3 to 4 actionable, hard-hitting recommendations on how the developer can make their resume stronger and upgrade their projects to "production level". Ground the feedback BOTH in what you see structurally wrong/weak in the resume text, and what the code audit evidence shows they are lacking.

Respond ONLY with a valid JSON array matching this format:
[{"title":"...","recommendation":"...","evidence_source":"...","priority":"high|medium|low"}]`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const raw = result.response.text()
      const parsed = JSON.parse(extractJSON(raw))
      if (Array.isArray(parsed)) return parsed as ResumeRecommendation[]
    } catch (err) {
      console.warn(`[Gemini:ResumeRecommendations] Attempt ${attempt + 1} failed:`, (err as Error).message)
    }
  }
  return []
}
