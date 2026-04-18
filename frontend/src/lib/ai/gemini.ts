/**
 * Gemini AI — FALLBACK provider.
 * Used only when Groq (primary) fails.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AuditFlawFinding, SecurityIssue, ResumeBullet } from '@/types/index'

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

export async function geminiResumeRewrite(params: {
  original_bullets: string[]
  audit_evidence: any[]
  overall_tier: string
  github_username: string
}): Promise<ResumeBullet[]> {
  try {
    const prompt = `Rewrite these resume bullets grounded in audit evidence.
Tier: ${params.overall_tier}, Evidence: ${JSON.stringify(params.audit_evidence)}
Bullets: ${params.original_bullets.join('\n')}

Return JSON array: [{"original":"...","rewritten":"...","evidence_source":"...","confidence":"high|medium|low"}]`

    const result = await model.generateContent(prompt)
    const parsed = JSON.parse(extractJSON(result.response.text()))
    if (Array.isArray(parsed)) return parsed as ResumeBullet[]
  } catch (err) {
    console.warn('[Gemini:ResumeRewrite] Fallback also failed:', (err as Error).message)
  }
  return []
}
