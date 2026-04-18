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
 * Extract visible text from PDF without needing canvas.
 * Uses raw PDF text objects as fallback.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Strategy: try dynamic import of pdf-parse with custom render 
   try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer, {
      pagerender: function () { return '' },
    })
    return data?.text || ''
  } catch (err: any) {
    console.warn('[Resume Parser] pdf-parse failed:', err.message)
  }

  // Fallback: extract text from decompressed streams
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
      // TJ array of strings
      const tjArrayPattern = /\[([^\]]+)\]\s*TJ/gi
      while ((m = tjArrayPattern.exec(stream)) !== null) {
        const inner = m[1]
        const strPattern = /\(([^)]*)\)/g
        let s
        while ((s = strPattern.exec(inner)) !== null) {
          textParts.push(s[1].replace(/\\/g, ''))
        }
      }
    }
    return textParts.join(' ')
  } catch {
    return ''
  }
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

    // Debug log
    console.log(`[Resume Parser] All URLs found in PDF (${allBufferUrls.length}):`)
    allBufferUrls.forEach(url => console.log(`  → ${url}`))
    console.log(`[Resume Parser] GitHub from buffer: ${githubBufferLinks.length}, from text: ${textMatches.length}`)

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

    return NextResponse.json({
      links: matches,
      skills: skillsExtracted,
      text: visibleText,
      total_found: matches.length,
      from_text: textMatches.length,
      from_hyperlinks: githubBufferLinks.length,
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
