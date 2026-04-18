import axios from 'axios'
import type { JobMatch } from '@/types/index'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RawJob {
  title: string
  company: string
  location: string
  url: string
  tags: string[]
  salary?: string
  date_posted?: string
  description?: string
}

// ─── Redis Cache (Upstash REST) ──────────────────────────────────────────────

async function cacheGet(key: string): Promise<string | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const res = await axios.get(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000,
    })
    return res.data?.result ?? null
  } catch {
    return null
  }
}

async function cacheSet(key: string, value: string, ttlSeconds = 86400): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return

  try {
    await axios.post(
      `${url}/set/${encodeURIComponent(key)}`,
      { value, ex: ttlSeconds },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 3000 }
    )
  } catch {
    // Non-fatal - cache is best-effort
  }
}

// ─── Remotive Jobs ───────────────────────────────────────────────────────────

export async function fetchRemotiveJobs(
  skillTier: string,
  topSkills: string[]
): Promise<RawJob[]> {
  const CACHE_KEY = 'remotive:jobs:all'

  // Try cache first
  const cached = await cacheGet(CACHE_KEY)
  if (cached) {
    console.log('[Market:Remotive] Cache hit — returning cached jobs')
    return JSON.parse(cached) as RawJob[]
  }

  console.log('[Market:Remotive] Cache miss — fetching from API...')

  try {
    const response = await axios.get(
      'https://remotive.com/api/remote-jobs?category=software-dev&limit=100',
      { timeout: 15000 }
    )

    const jobs = response.data?.jobs ?? []
    const mapped: RawJob[] = jobs.map((j: any) => ({
      title: j.title ?? '',
      company: j.company_name ?? '',
      location: j.candidate_required_location ?? 'Remote',
      url: j.url ?? '',
      tags: Array.isArray(j.tags) ? j.tags : (j.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
      salary: j.salary ?? undefined,
      date_posted: j.publication_date ?? undefined,
      description: j.description ?? '',
    }))

    // Cache for 24 hours
    await cacheSet(CACHE_KEY, JSON.stringify(mapped), 86400)
    console.log(`[Market:Remotive] Fetched ${mapped.length} jobs and cached`)
    return mapped
  } catch (err: any) {
    console.warn('[Market:Remotive] Fetch failed:', err.message)
    return []
  }
}

// ─── Jooble Jobs ─────────────────────────────────────────────────────────────

export async function fetchJoobleJobs(params: {
  keywords: string[]
  max_results?: number
  locations?: string[]
}): Promise<RawJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY
  if (!apiKey) {
    console.warn('[Market:Jooble] No JOOBLE_API_KEY in environment — skipping')
    return []
  }

  const keywordStr = params.keywords.join(' ') || 'developer'
  // Default to Indian Tech Hubs priority ordered as requested
  const locationsToSearch = params.locations && params.locations.length > 0 
    ? params.locations 
    : ['Pune', 'Mumbai', 'Hyderabad', 'Bangalore', 'India']

  const allJobs: RawJob[] = []
  const seenUrls = new Set<string>()

  for (const location of locationsToSearch) {
    if (allJobs.length >= (params.max_results ?? 50)) break; // Stop if we have enough jobs
    
    const CACHE_KEY = `jooble:jobs:${keywordStr}:${location}`
    
    const cached = await cacheGet(CACHE_KEY)
    if (cached) {
      console.log(`[Market:Jooble] Cache hit for "${keywordStr}" in "${location}"`)
      const cachedJobs = JSON.parse(cached) as RawJob[]
      for (const job of cachedJobs) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url)
          allJobs.push(job)
        }
      }
      continue
    }

    try {
      const url = `https://jooble.org/api/${apiKey}`
      const response = await axios.post(url, {
        keywords: keywordStr,
        location: location
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      })

      const jobs = response.data?.jobs ?? []
      const mapped: RawJob[] = jobs.map((j: any) => ({
        title: j.title ?? 'Software Engineer',
        company: j.company ?? 'Unknown',
        location: j.location ?? location,
        url: j.link ?? '',
        tags: [],
        salary: j.salary && j.salary.trim() !== '' ? j.salary : undefined,
        description: j.snippet ?? ''
      }))

      await cacheSet(CACHE_KEY, JSON.stringify(mapped), 86400)
      console.log(`[Market:Jooble] Fetched ${mapped.length} jobs for "${keywordStr}" in "${location}"`)
      
      for (const job of mapped) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url)
          allJobs.push(job)
        }
      }
    } catch (err: any) {
      console.warn(`[Market:Jooble] Fetch failed for "${location}":`, err.message)
    }
  }

  return allJobs
}

// ─── Shared: Extract skills from job text ─────────────────────────────────────

export function extractSkillsFromJD(text: string): string[] {
  const patterns = [
    /\b(TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|Ruby|Swift|Kotlin|Scala|PHP)\b/gi,
    /\b(React|Next\.js|Vue|Angular|Express|FastAPI|Django|Spring|Rails|NestJS|Svelte)\b/gi,
    /\b(AWS|GCP|Azure|Docker|Kubernetes|Terraform|CI\/CD|GitHub Actions|Helm)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Supabase|Prisma)\b/gi,
    /\b(microservices|REST|GraphQL|gRPC|TDD|DDD|CQRS|event.driven|WebSockets)\b/gi,
    /\b(Node\.js|Bun|Deno|webpack|Vite|Jest|Vitest|Playwright|Cypress)\b/gi,
  ]

  const skills = new Set<string>()
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      skills.add(match[0].toLowerCase().replace('node.js', 'node').replace('next.js', 'nextjs'))
    }
  }
  return Array.from(skills)
}

// ─── Legacy: backward-compat wrapper for market-fetcher ───────────────────────

export async function fetchJobListings(params: {
  keywords: string[]
  max_results?: number
}): Promise<JobMatch[]> {
  // Try Remotive (free, no key needed)
  const remotiveJobs = await fetchRemotiveJobs('Mid', params.keywords)
  const total = remotiveJobs.slice(0, params.max_results ?? 50)

  return total.map(j => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary_range: j.salary,
    url: j.url,
    match_percent: 0,
    missing_skills: j.tags,
  }))
}
