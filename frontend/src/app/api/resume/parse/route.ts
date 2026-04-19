import { NextRequest, NextResponse } from 'next/server'
import { inflateSync } from 'zlib'

export const dynamic = 'force-dynamic'

/**
 * Decompress all FlateDecode streams in a PDF buffer.
 * LaTeX, Word, Chrome, etc. compress PDF objects with zlib.
 */
function decompressPdfStreams(buffer: Buffer): string[] {
  const raw = buffer.toString('binary')
  const decompressed: string[] = []
  const streamPattern = /stream\r?\n([\s\S]*?)endstream/g
  let match: RegExpExecArray | null

  while ((match = streamPattern.exec(raw)) !== null) {
    const streamBuf = Buffer.from(match[1], 'binary')
    try {
      const inflated = inflateSync(streamBuf)
      decompressed.push(inflated.toString('utf-8'))
    } catch {
      // Not compressed — use raw
      decompressed.push(match[1])
    }
  }
  return decompressed
}

/**
 * Extracts ALL URLs from a PDF buffer using multiple strategies.
 */
function extractAllUrlsFromPdfBuffer(buffer: Buffer): string[] {
  const links = new Set<string>()
  const sources: string[] = []

  // Source 1: Raw buffer
  sources.push(buffer.toString('latin1'))
  sources.push(buffer.toString('utf-8'))

  // Source 2: Decompressed streams (critical for LaTeX PDFs)
  try {
    const streams = decompressPdfStreams(buffer)
    sources.push(...streams)
    console.log(`[Resume Parser] Decompressed ${streams.length} PDF streams`)
  } catch (err: any) {
    console.warn('[Resume Parser] Stream decompression error:', err.message)
  }

  for (const text of sources) {
    let match: RegExpExecArray | null

    // /URI (url)
    const uriPattern = /\/URI\s*\(\s*(https?:\/\/[^)\s]+)\s*\)/gi
    while ((match = uriPattern.exec(text)) !== null) {
      links.add(match[1].replace(/\\/g, '').trim())
    }

    // /URI(url) — no space
    const uriNoSpace = /\/URI\((https?:\/\/[^)\s]+)\)/gi
    while ((match = uriNoSpace.exec(text)) !== null) {
      links.add(match[1].replace(/\\/g, '').trim())
    }

    // /S /URI /URI (url)
    const uriAction = /\/S\s*\/URI\s*\/URI\s*\((https?:\/\/[^)\s]+)\)/gi
    while ((match = uriAction.exec(text)) !== null) {
      links.add(match[1].replace(/\\/g, '').trim())
    }

    // Hex-encoded URI
    const uriHex = /\/URI\s*<([0-9a-fA-F]+)>/gi
    while ((match = uriHex.exec(text)) !== null) {
      try {
        const decoded = Buffer.from(match[1], 'hex').toString('utf-8')
        if (decoded.startsWith('http')) links.add(decoded)
      } catch { /* skip */ }
    }

    // Raw HTTP sweep
    const rawHttp = /https?:\/\/[a-zA-Z0-9._\-\/~%+?&#=@:]+/gi
    while ((match = rawHttp.exec(text)) !== null) {
      let url = match[0].replace(/[)>\]]+$/, '').replace(/\.+$/, '')
      if (url.length > 15) links.add(url)
    }
  }

  return Array.from(links)
}

/**
 * Checks if a URL looks like a deployment/live app link.
 */
const DEPLOYMENT_DOMAINS = [
  'vercel.app', 'netlify.app', 'netlify.com', 'railway.app',
  'render.com', 'onrender.com', 'fly.dev', 'fly.io',
  'heroku.com', 'herokuapp.com', 'github.io', 'pages.dev',
  'surge.sh', 'firebase.app', 'firebaseapp.com', 'web.app',
  'cloudflare.com', 'workers.dev', 'deno.dev', 'repl.co',
  'glitch.me', 'stackblitz.io', 'codesandbox.io',
  'amplifyapp.com', 'azurewebsites.net', 'azurestaticapps.net',
]

function isDeploymentUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    // Check known deployment platforms
    if (DEPLOYMENT_DOMAINS.some(d => hostname.endsWith(d))) return true
    // Custom domains: if not github.com, linkedin.com, or other non-deployment sites
    const nonDeployment = [
      'github.com', 'linkedin.com', 'twitter.com', 'x.com',
      'medium.com', 'dev.to', 'stackoverflow.com', 'npmjs.com',
      'pypi.org', 'crates.io', 'docs.google.com', 'drive.google.com',
      'youtube.com', 'discord.com', 'discord.gg', 'slack.com',
      'figma.com', 'notion.so', 'reddit.com',
    ]
    if (nonDeployment.some(d => hostname.endsWith(d))) return false
    // Could be a custom deployment domain — include it as a candidate
    return false
  } catch {
    return false
  }
}

/**
 * Normalize garbled PDF-extracted text.
 * PDF text operators often produce character-level spacing artifacts
 * like "De v eloped a medic al manag ement" instead of proper words.
 * This function reconstructs the text by:
 * 1. Removing single-char spacing artifacts
 * 2. Fixing word boundaries
 * 3. Cleaning up encoding noise (e.g. "034" artifacts)
 */
function normalizeExtractedText(raw: string): string {
  if (!raw || raw.length < 5) return raw

  // Step 1: Remove PDF artifact codes like "034" (octal special chars that leaked)
  let text = raw.replace(/(?<![a-zA-Z])0[0-7]{2}(?![0-9a-zA-Z])/g, '')

  // Step 2: Fix character-level spacing — "D e v e l o p e d" => "Developed"
  // Detect lines where most words are 1 or 2 chars (garbled)
  const lines = text.split('\n')
  const fixedLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { fixedLines.push(''); continue }

    // Count single-char and two-char tokens
    const tokens = trimmed.split(/\s+/)
    const shortTokens = tokens.filter(t => t.length <= 2 && /[a-zA-Z]/.test(t)).length
    const ratio = tokens.length > 0 ? shortTokens / tokens.length : 0

    if (ratio > 0.4 && tokens.length > 4) {
      // This line is likely garbled — reconstruct by joining chars
      // Heuristic: join all chars, then re-split using dictionary/camelCase boundaries
      let joined = trimmed.replace(/\s+/g, '')
      // Insert spaces back at likely word boundaries:
      // Before uppercase letters that follow lowercase
      joined = joined.replace(/([a-z])([A-Z])/g, '$1 $2')
      // Before common word starts after certain patterns
      joined = joined.replace(/([a-zA-Z])(and|the|for|with|from|that|this|have|has|was|were|are|not|but|can|will|its|our|they|their|into|also|been|such|each|some|when|than|then|made|over|like|just|used|use|new|all|may|any|had|out|one|two|get|got|set|her|his|him|did|let|say|she|see|now|way|who|how|own|too|its|few)([A-Z])/gi, '$1 $2 $3')
      // Space before certain suffixes that got merged
      joined = joined.replace(/(tion|ment|ness|able|ible|ical|ence|ance|ious|eous|ship|ward|like|less|full|ness|ally|ized)([A-Z])/g, '$1 $2')
      fixedLines.push(joined)
    } else {
      // Fix partial garbling: spaces within words like "De v eloped"
      // Approach: find sequences of single-char tokens and join them
      let fixed = trimmed
      // Match patterns like: "x y z" (single-char separated by spaces) and join
      fixed = fixed.replace(/\b([a-zA-Z]) ([a-zA-Z]) ([a-zA-Z])(?= [a-zA-Z]\b| [a-zA-Z] )/g, (match) => {
        return match.replace(/ /g, '')
      })
      // Broader pass: join any remaining single-char-space-single-char sequences
      let prev = ''
      while (prev !== fixed) {
        prev = fixed
        fixed = fixed.replace(/\b([a-zA-Z]) ([a-zA-Z])\b/g, '$1$2')
      }
      // Fix cases like "Certi034c" -> strip numeric artifacts in words
      fixed = fixed.replace(/([a-zA-Z])\d{2,3}([a-zA-Z])/g, '$1$2')
      fixedLines.push(fixed)
    }
  }

  text = fixedLines.join('\n')

  // Step 3: Clean up multiple spaces and weird punctuation spacing
  text = text.replace(/\s{2,}/g, ' ')
  text = text.replace(/\s+([.,;:!?)])/g, '$1')
  text = text.replace(/([,(])\s+/g, '$1')

  // Step 4: Remove lines that are just noise (very short, just numbers, etc)
  const cleaned = text.split('\n')
    .filter(l => l.trim().length > 2)
    .join('\n')

  return cleaned.trim()
}

/**
 * Extract visible text from PDF without needing canvas.
 * Uses raw PDF text objects as fallback.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let rawText = ''

  // Strategy: try dynamic import of pdf-parse with custom render 
   try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer, {
      pagerender: function () { return '' },
    })
    rawText = data?.text || ''
  } catch (err: any) {
    console.warn('[Resume Parser] pdf-parse failed:', err.message)
  }

  // Fallback: extract text from decompressed streams
  if (!rawText) {
    try {
      const streams = decompressPdfStreams(buffer)
      const textParts: string[] = []
      for (const stream of streams) {
        // PDF text operators: Tj, TJ, ' and "
        const tjPattern = /\(([^)]+)\)\s*Tj/g
        let m
        while ((m = tjPattern.exec(stream)) !== null) {
          textParts.push(m[1].replace(/\\/g, ''))
        }
        // TJ array of strings — reconstruct words properly
        const tjArrayPattern = /\[([^\]]+)\]\s*TJ/gi
        while ((m = tjArrayPattern.exec(stream)) !== null) {
          const inner = m[1]
          const parts: string[] = []
          const strPattern = /\(([^)]*)\)/g
          let s
          while ((s = strPattern.exec(inner)) !== null) {
            parts.push(s[1].replace(/\\/g, ''))
          }
          // TJ arrays concatenate string fragments without spaces
          // Only add space if there's a significant negative kern value between them
          textParts.push(parts.join(''))
        }
      }
      rawText = textParts.join(' ')
    } catch {
      rawText = ''
    }
  }

  // Apply normalization to fix garbled text
  return normalizeExtractedText(rawText)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('resume') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No resume file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Extract visible text
    const visibleText = await extractTextFromPdf(buffer)

    // Method 1: GitHub links in visible text
    const githubTextRegex = /https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_\.]+/gi
    const textMatches = visibleText.match(githubTextRegex) || []

    // Method 2: ALL URLs from raw + decompressed PDF buffer
    const allBufferUrls = extractAllUrlsFromPdfBuffer(buffer)
    
    // Filter to GitHub repo URLs
    const githubBufferLinks = allBufferUrls.filter(url =>
      /github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_\.]+/i.test(url)
    )

    // Extract deployment URLs from both visible text and buffer URLs
    const deploymentLinks: string[] = []
    // From visible text — look for deployment domain patterns
    const deploymentTextRegex = /https?:\/\/[a-zA-Z0-9._\-]+\.(?:vercel\.app|netlify\.app|netlify\.com|railway\.app|render\.com|onrender\.com|fly\.dev|fly\.io|herokuapp\.com|github\.io|pages\.dev|surge\.sh|web\.app|firebaseapp\.com|workers\.dev|amplifyapp\.com|azurewebsites\.net|azurestaticapps\.net)[a-zA-Z0-9._\-\/~%+?&#=@:]*/gi
    const textDeployments = visibleText.match(deploymentTextRegex) || []
    deploymentLinks.push(...textDeployments)
    
    // From buffer URLs
    const bufferDeployments = allBufferUrls.filter(url => isDeploymentUrl(url))
    deploymentLinks.push(...bufferDeployments)

    // Deduplicate deployment links  
    const uniqueDeployments = [...new Set(deploymentLinks.map(u => u.replace(/\/+$/, '')))]

    // Debug log
    console.log(`[Resume Parser] All URLs found in PDF (${allBufferUrls.length}):`)
    allBufferUrls.forEach(url => console.log(`  → ${url}`))
    console.log(`[Resume Parser] GitHub from buffer: ${githubBufferLinks.length}, from text: ${textMatches.length}`)
    console.log(`[Resume Parser] Deployment links found: ${uniqueDeployments.length}`)
    uniqueDeployments.forEach(url => console.log(`  🌐 ${url}`))

    // Combine and deduplicate
    const allLinks = new Set<string>()
    for (const link of [...textMatches, ...githubBufferLinks]) {
      let cleaned = link.replace(/[#\?].*$/, '').replace(/\/+$/, '').replace(/\.+$/, '')
      const repoMatch = cleaned.match(/(https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_]+)/i)
      if (repoMatch) allLinks.add(repoMatch[1])
    }

    const matches = Array.from(allLinks)
    console.log(`[Resume Parser] Final GitHub repo links: ${matches.length}`)
    matches.forEach(url => console.log(`  ✓ ${url}`))

    // Also extract skills/technologies from visible text for job matching
    const skillsExtracted = extractSkillsFromText(visibleText)

    // Extract resume bullet points with proper normalization
    const bulletPoints = extractBulletPoints(visibleText)

    return NextResponse.json({
      links: matches,
      deployment_links: uniqueDeployments,
      skills: skillsExtracted,
      text: visibleText,
      bullet_points: bulletPoints,
      total_found: matches.length,
      from_text: textMatches.length,
      from_hyperlinks: githubBufferLinks.length,
      deployment_count: uniqueDeployments.length,
      success: true
    })
  } catch (err: any) {
    console.error('PDF Parse Error:', err.message)
    return NextResponse.json({ error: 'Failed to process PDF', details: err.message }, { status: 500 })
  }
}

/**
 * Extract technology skills from resume text for job matching.
 */
function extractSkillsFromText(text: string): string[] {
  const patterns = [
    /\b(TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|Ruby|Swift|Kotlin|Scala|PHP|SQL)\b/gi,
    /\b(React|Next\.js|Vue|Angular|Express|FastAPI|Django|Spring|Rails|NestJS|Svelte|Flask)\b/gi,
    /\b(AWS|GCP|Azure|Docker|Kubernetes|Terraform|CI\/CD|GitHub Actions|Helm|Vercel)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Supabase|Prisma|Convex)\b/gi,
    /\b(microservices|REST|GraphQL|gRPC|TDD|DDD|CQRS|WebSockets|LangGraph|CrewAI)\b/gi,
    /\b(Node\.js|Bun|Deno|webpack|Vite|Jest|Vitest|Playwright|Cypress|MERN)\b/gi,
    /\b(Llama|GPT|LLM|RAG|LangChain|Hugging\s*Face|Sagemaker|Machine Learning|ML)\b/gi,
    /\b(Clerk|Auth0|Firebase|Tailwind|Bootstrap|Material UI|Chakra)\b/gi,
  ]
  const skills = new Set<string>()
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      skills.add(m[0])
    }
  }
  return Array.from(skills)
}

/**
 * Extract proper bullet points from resume text.
 * Handles various bullet point formats and cleans up extracted text.
 */
function extractBulletPoints(text: string): string[] {
  // Split by common bullet point delimiters
  let lines = text.split(/(?:\n|\r\n)/g)
  
  const bullets: string[] = []
  
  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    
    // Remove leading bullet characters
    line = line.replace(/^[•\-\*◦▪▸►➤❖✓✔☑→⟶\u2022\u2023\u25E6\u2043\u2219]+\s*/, '')
    // Remove leading numbers/letters like "1." "a)" "i."
    line = line.replace(/^\d+[.)\s]+/, '')
    line = line.replace(/^[a-zA-Z][.)\s]+(?=[A-Z])/, '')
    
    // Skip very short lines, headers, and noise
    if (line.length < 15) continue
    if (/^(education|experience|skills|projects|certifications|contact|summary|objective|references|awards|publications)$/i.test(line)) continue
    
    // Skip lines that look like dates, locations, or company headers only
    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(line)) continue
    if (/^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i.test(line) && line.length < 30) continue
    
    // This looks like a legit bullet point / achievement line
    if (line.length >= 15 && line.length < 800) {
      bullets.push(line)
    }
  }
  
  return bullets.slice(0, 20) // Cap at 20 bullets
}
