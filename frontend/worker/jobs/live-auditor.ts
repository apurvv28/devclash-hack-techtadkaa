import type { Job } from 'bullmq'
import { chromium } from 'playwright'
import axios from 'axios'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getQueue, QUEUE_NAMES } from '@/lib/queue/client'
import type { RepoAnalysis } from '@/types/index'

export interface LiveAppAuditResult {
  url: string
  session_id: string
  is_reachable: boolean
  has_ssl: boolean
  performance_score?: number
  accessibility_score?: number
  seo_score?: number
  best_practices_score?: number
  fcp_ms?: number
  lcp_ms?: number
  tti_ms?: number
  cls_score?: number
  broken_links?: string[]
  viewport_results?: ViewportResult[]
  raw_lighthouse?: any
}

export interface ViewportResult {
  name: string
  width: number
  height: number
  has_horizontal_scroll: boolean
  text_overflow: boolean
  screenshot_url?: string
}

export class LiveAppAuditor {
  async auditUrl(params: { url: string; session_id: string }): Promise<LiveAppAuditResult> {
    const { url, session_id } = params
    console.log(`[LiveAuditor] Starting full audit for ${url}...`)

    const result: LiveAppAuditResult = { url, session_id, is_reachable: false, has_ssl: false }

    // ─── Step 1: Validate URL ───
    try {
      await axios.head(url, { timeout: 10000 })
      result.is_reachable = true
      result.has_ssl = url.startsWith('https://')
    } catch (err: any) {
      console.warn(`[LiveAuditor] URL ${url} is not reachable.`)
      return result
    }

    // ─── Step 2: Lighthouse Audit ───
    try {
      console.log(`[LiveAuditor] Running Lighthouse for ${url}...`)
      // Dynamic import in case lighthouse is ESM-only
      // Use eval to prevent Next.js from statically analyzing and attempting to bundle these Node-only native modules
      const lighthouseModule = await eval('import("lighthouse")')
      const lighthouse = lighthouseModule.default || lighthouseModule
      
      const chromeLauncherModule = await eval('import("chrome-launcher")')
      const chromeLauncher = chromeLauncherModule.default || chromeLauncherModule

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] })
      const options = {
        logLevel: 'error' as const,
        output: 'json' as const,
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      }

      const runnerResult: any = await lighthouse(url, options)
      await chrome.kill()

      const lhr = runnerResult.lhr
      result.performance_score = Math.round((lhr.categories.performance?.score || 0) * 100)
      result.accessibility_score = Math.round((lhr.categories.accessibility?.score || 0) * 100)
      result.seo_score = Math.round((lhr.categories.seo?.score || 0) * 100)
      result.best_practices_score = Math.round((lhr.categories['best-practices']?.score || 0) * 100)

      result.fcp_ms = lhr.audits['first-contentful-paint']?.numericValue || 0
      result.lcp_ms = lhr.audits['largest-contentful-paint']?.numericValue || 0
      result.tti_ms = lhr.audits['interactive']?.numericValue || 0
      result.cls_score = lhr.audits['cumulative-layout-shift']?.numericValue || 0

      // Truncate raw lighthouse to 50kb max string size if we keep it
      const rawString = JSON.stringify(lhr)
      result.raw_lighthouse = rawString.length > 50000 
        ? JSON.parse(rawString.slice(0, 50000) + '"}') // rough truncation
        : lhr

    } catch (err: any) {
      console.error(`[LiveAuditor] Lighthouse failed:`, err.message)
    }

    // ─── Step 3: Playwright Viewport Checks ───
    console.log(`[LiveAuditor] Running Playwright Viewports for ${url}...`)
    const viewports = [
      { name: 'mobile-s', width: 320, height: 568 },
      { name: 'mobile-l', width: 414, height: 896 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'laptop', width: 1024, height: 768 },
      { name: 'desktop', width: 1440, height: 900 },
    ]

    result.viewport_results = []
    let browser
    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] })

      for (const vp of viewports) {
        const page = await browser.newPage()
        await page.setViewportSize({ width: vp.width, height: vp.height })
        
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 30000 })
        } catch {
          // ignore timeout errors
        }

        const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 })
        const screenshot_base64 = screenshot.toString('base64')

        const has_horizontal_scroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        const text_overflow = await page.evaluate(() => {
          const elements = document.querySelectorAll('*')
          let overflow = false
          elements.forEach((el) => {
            if (el.scrollWidth > el.clientWidth) overflow = true
          })
          return overflow
        })

        // ── Step 5 prep: Upload to Supabase Storage ──
        let storageUrl = ''
        try {
          const fileName = `${session_id}/${vp.name}.jpg`
          const { error } = await supabaseAdmin.storage
            .from('audits')
            .upload(fileName, screenshot, { contentType: 'image/jpeg', upsert: true })

          if (!error) {
            const { data } = supabaseAdmin.storage.from('audits').getPublicUrl(fileName)
            storageUrl = data.publicUrl
          }
        } catch(e: any) {
           console.warn(`[LiveAuditor] Storage upload failed (non-fatal):`, e.message)
           storageUrl = `data:image/jpeg;base64,${screenshot_base64}` // Fallback
        }

        result.viewport_results.push({
          name: vp.name,
          width: vp.width,
          height: vp.height,
          has_horizontal_scroll,
          text_overflow,
          screenshot_url: storageUrl, // use storage URL or base64 fallback
        })

        await page.close()
      }

      // ─── Step 4: Broken Link Check ───
      console.log(`[LiveAuditor] Checking broken links...`)
      const page = await browser.newPage()
      await page.goto(url, { timeout: 30000 }).catch(()=>null)
      const links = await page.$$eval('a[href]', (els) => els.map((el) => (el as HTMLAnchorElement).href))
      const internalLinks = links.filter((l) => l.startsWith(url)).slice(0, 20)
      
      const broken_links: string[] = []
      for (const link of internalLinks) {
        try {
           await axios.head(link, { timeout: 5000 })
        } catch {
           broken_links.push(link)
        }
      }
      result.broken_links = broken_links

      await page.close()
    } catch (err: any) {
      console.error(`[LiveAuditor] Playwright failed:`, err.message)
    } finally {
      if (browser) await browser.close()
    }

    // ─── Step 5: Save to Supabase ───
    try {
      await supabaseAdmin.from('live_app_audits').upsert({
        id: crypto.randomUUID(),
        session_id: result.session_id,
        url: result.url,
        is_reachable: result.is_reachable,
        has_ssl: result.has_ssl,
        performance_score: result.performance_score,
        accessibility_score: result.accessibility_score,
        seo_score: result.seo_score,
        best_practices_score: result.best_practices_score,
        fcp_ms: result.fcp_ms,
        lcp_ms: result.lcp_ms,
        tti_ms: result.tti_ms,
        cls_score: result.cls_score,
        viewport_results: result.viewport_results,
        broken_links: result.broken_links,
      })
    } catch (err: any) {
      console.warn(`[LiveAuditor] DB Upsert failed (non-fatal):`, err.message)
    }

    return result
  }
}

// ─── BullMQ Worker Handler ───
export async function handleLiveAudit(job: Job): Promise<void> {
  const { session_id, repo_analyses, live_urls = [] } = job.data as any
  
  await updateSessionStatus(session_id, 'auditing_live', 70)

  const auditor = new LiveAppAuditor()
  const allResults: LiveAppAuditResult[] = []

  let progress = 70
  for (let i = 0; i < live_urls.length; i++) {
    const url = live_urls[i]
    if (!url) continue
    
    // Fallback scheme checking
    const validUrl = url.startsWith('http') ? url : `https://${url}`
    
    // Timeout safeguard for the whole URL audit
    try {
       const auditPromise = auditor.auditUrl({ url: validUrl, session_id })
       // 120 second timeout per URL
       const result = await Promise.race([
          auditPromise,
          new Promise<LiveAppAuditResult>((_, reject) => setTimeout(() => reject(new Error('Audit Timeout > 120s')), 120000))
       ])
       allResults.push(result)
    } catch(err: any) {
       console.warn(`[LiveAuditor] Skip / Timeout for ${validUrl}:`, err.message)
    }
    
    progress = 70 + Math.round(((i + 1) / live_urls.length) * 8)
    await updateSessionStatus(session_id, 'auditing_live', progress)
  }

  await updateSessionStatus(session_id, 'auditing_live', 78)
  await new Promise(r => setTimeout(r, 300))
  await updateSessionStatus(session_id, 'synthesizing_ai', 80)

  // Enqueue AI synthesis
  const synthesisQueue = getQueue(QUEUE_NAMES.AI_SYNTHESIS)
  await synthesisQueue.add('synthesize-profile', {
    session_id,
    repo_analyses,
    lighthouse_results: allResults, // Passed downward for potential synthesis usage
  })
}

async function updateSessionStatus(sessionId: string, status: string, progress: number) {
  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update({ status, progress_percent: progress })
    .eq('id', sessionId)
  if (error) console.error(`[LiveAuditor] DB UPDATE FAILED:`, error.message)
}
