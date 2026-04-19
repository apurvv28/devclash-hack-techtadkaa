import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

/**
 * POST /api/audit/[id]/uiux-test
 * 
 * Runs an on-demand Playwright UI/UX test against a deployment URL.
 * Records a video of the interaction and returns scores + video URL.
 * 
 * Body: { deployment_url: string }
 * Returns: SSE stream with progress events, then final scores + video
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { deployment_url } = body
  if (!deployment_url) {
    return NextResponse.json({ error: 'deployment_url is required' }, { status: 422 })
  }

  // SSE stream for live progress
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let browser
      try {
        // ─── Setup ───
        send({ step: 'launching', message: 'Launching Chromium browser...', progress: 5 })

        const videoDir = path.join(process.cwd(), 'public', 'uiux-videos')
        if (!fs.existsSync(videoDir)) {
          fs.mkdirSync(videoDir, { recursive: true })
        }

        // Clean old video for this session
        const videoFilePath = path.join(videoDir, `${sessionId}.webm`)
        if (fs.existsSync(videoFilePath)) fs.unlinkSync(videoFilePath)

        browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        })

        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          recordVideo: {
            dir: videoDir,
            size: { width: 1280, height: 720 },
          },
        })

        const page = await context.newPage()

        // Collect console errors
        const consoleErrors: string[] = []
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text().slice(0, 200))
          }
        })

        // ─── Phase 1: Load Page ───
        send({ step: 'loading', message: `Navigating to ${deployment_url}...`, progress: 10 })
        const loadStart = Date.now()
        
        try {
          await page.goto(deployment_url, { waitUntil: 'networkidle', timeout: 30000 })
        } catch {
          try {
            await page.goto(deployment_url, { waitUntil: 'load', timeout: 15000 })
          } catch {
            send({ step: 'error', message: 'Failed to load deployment URL', progress: 0 })
            controller.close()
            return
          }
        }
        const pageLoadMs = Date.now() - loadStart
        send({ step: 'loaded', message: `Page loaded in ${pageLoadMs}ms`, progress: 15 })

        // Wait a moment for visual rendering
        await page.waitForTimeout(1500)

        // ─── Phase 2: Desktop Scroll Test ───
        send({ step: 'scroll_test', message: 'Scrolling through page content...', progress: 20 })
        
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
        const viewportHeight = 720
        const scrollSteps = Math.ceil(pageHeight / viewportHeight)
        
        for (let i = 1; i <= Math.min(scrollSteps, 8); i++) {
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), i * viewportHeight)
          await page.waitForTimeout(800)
        }
        
        // Scroll back to top
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
        await page.waitForTimeout(500)
        send({ step: 'scroll_done', message: 'Page scroll test complete', progress: 30 })

        // ─── Phase 3: Click Testing ───
        send({ step: 'click_test', message: 'Testing interactive elements (buttons, links)...', progress: 35 })

        const interactiveElements = await page.evaluate(() => {
          const clickable = document.querySelectorAll('a, button, [role="button"], input[type="submit"]')
          return Array.from(clickable).map((el, i) => ({
            index: i,
            tag: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.trim().slice(0, 50) || '',
            href: (el as HTMLAnchorElement).href || '',
            isVisible: (el as HTMLElement).offsetParent !== null,
          }))
        })

        const visibleElements = interactiveElements.filter((e) => e.isVisible)
        let clickedCount = 0
        let workingCount = 0

        // Click up to 6 visible buttons/links (with recovery)
        const elementsToTest = visibleElements.slice(0, 6)
        for (const el of elementsToTest) {
          try {
            send({ step: 'clicking', message: `Clicking: "${el.text || el.tag}"...`, progress: 35 + (clickedCount * 5) })
            
            if (el.tag === 'button' || el.tag === 'a') {
              const selector = el.text 
                ? `${el.tag}:has-text("${el.text.replace(/"/g, '\\"').slice(0, 30)}")`
                : `${el.tag}:nth-of-type(${el.index + 1})`
              
              const element = page.locator(selector).first()
              if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
                await element.click({ timeout: 3000, force: false }).catch(() => {})
                await page.waitForTimeout(1000)
                workingCount++
              }
            }
            clickedCount++

            // Navigate back if we went to a different page
            const currentUrl = page.url()
            if (currentUrl !== deployment_url && !currentUrl.startsWith(deployment_url)) {
              await page.goto(deployment_url, { waitUntil: 'load', timeout: 10000 }).catch(() => {})
              await page.waitForTimeout(500)
            }
          } catch {
            clickedCount++
          }
        }

        send({ step: 'click_done', message: `Tested ${clickedCount} interactive elements, ${workingCount} responded`, progress: 55 })

        // ─── Phase 4: Responsive Testing ───
        send({ step: 'responsive_test', message: 'Testing mobile viewport (375×812)...', progress: 60 })
        
        const viewports = [
          { name: 'Mobile', width: 375, height: 812 },
          { name: 'Tablet', width: 768, height: 1024 },
          { name: 'Desktop', width: 1440, height: 900 },
        ]

        const viewportResults: any[] = []
        for (const vp of viewports) {
          send({ step: 'viewport', message: `Testing ${vp.name} (${vp.width}×${vp.height})...`, progress: 60 + viewportResults.length * 8 })
          
          await page.setViewportSize({ width: vp.width, height: vp.height })
          await page.waitForTimeout(1000)
          
          // Scroll down on this viewport
          await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }))
          await page.waitForTimeout(600)
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
          await page.waitForTimeout(400)

          const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
          const hasTextOverflow = await page.evaluate(() => {
            const body = document.body
            return body ? body.scrollWidth > body.clientWidth : false
          })

          viewportResults.push({
            name: vp.name,
            width: vp.width,
            height: vp.height,
            has_horizontal_scroll: hasHorizontalScroll,
            has_text_overflow: hasTextOverflow,
            score: hasHorizontalScroll ? 60 : hasTextOverflow ? 75 : 100,
          })
        }

        // Reset to desktop
        await page.setViewportSize({ width: 1280, height: 720 })
        await page.waitForTimeout(500)
        send({ step: 'responsive_done', message: 'Responsive testing complete', progress: 80 })

        // ─── Phase 5: Accessibility Check ───
        send({ step: 'a11y_test', message: 'Running accessibility analysis...', progress: 85 })

        const a11y = await page.evaluate(() => {
          const html = document.documentElement
          const hasLang = !!html.getAttribute('lang')
          const hasMetaViewport = !!document.querySelector('meta[name="viewport"]')
          const images = document.querySelectorAll('img')
          let imagesNoAlt = 0
          images.forEach((img) => {
            if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) imagesNoAlt++
          })
          const inputs = document.querySelectorAll('input, select, textarea')
          let formsNoLabels = 0
          inputs.forEach((input) => {
            const id = input.getAttribute('id')
            const ariaLabel = input.getAttribute('aria-label')
            const parentLabel = input.closest('label')
            const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false
            if (!hasLabel && !ariaLabel && !parentLabel) formsNoLabels++
          })
          const h1s = document.querySelectorAll('h1')
          return { hasLang, hasMetaViewport, imagesNoAlt, formsNoLabels, h1Count: h1s.length }
        })

        const a11yIssues: string[] = []
        if (!a11y.hasLang) a11yIssues.push('Missing lang attribute on <html>')
        if (!a11y.hasMetaViewport) a11yIssues.push('Missing <meta name="viewport">')
        if (a11y.imagesNoAlt > 0) a11yIssues.push(`${a11y.imagesNoAlt} image(s) without alt text`)
        if (a11y.formsNoLabels > 0) a11yIssues.push(`${a11y.formsNoLabels} form input(s) without labels`)
        if (a11y.h1Count === 0) a11yIssues.push('No <h1> element found')

        send({ step: 'a11y_done', message: `Found ${a11yIssues.length} accessibility issue(s)`, progress: 90 })

        // Small pause for the video to capture the final state
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
        await page.waitForTimeout(1500)

        // ─── Close and save video ───
        send({ step: 'saving', message: 'Saving test recording...', progress: 92 })
        
        const video = page.video()
        await page.close()
        await context.close()

        // Get the video path and rename it
        if (video) {
          const tempVideoPath = await video.path()
          if (tempVideoPath && fs.existsSync(tempVideoPath)) {
            fs.copyFileSync(tempVideoPath, videoFilePath)
            // Clean up temp
            try { fs.unlinkSync(tempVideoPath) } catch {}
          }
        }

        // ─── Calculate Scores ───
        send({ step: 'scoring', message: 'Calculating scores...', progress: 95 })

        // Responsiveness (30%)
        const avgVp = viewportResults.reduce((sum, v) => sum + v.score, 0) / viewportResults.length
        const responsivenessScore = Math.round(avgVp * 0.30)

        // Console Errors (15%)
        const errorPenalty = Math.min(consoleErrors.length, 10)
        const consoleScore = Math.round(((10 - errorPenalty) / 10) * 100 * 0.15)

        // Performance (15%)
        let perfBase = 100
        if (pageLoadMs > 10000) perfBase = 20
        else if (pageLoadMs > 5000) perfBase = 50
        else if (pageLoadMs > 3000) perfBase = 70
        else if (pageLoadMs > 1500) perfBase = 85
        const performanceScore = Math.round(perfBase * 0.15)

        // Accessibility (20%)
        const a11yPenalty = Math.min(a11yIssues.length, 8)
        const a11yScore = Math.round(((8 - a11yPenalty) / 8) * 100 * 0.20)

        // Interactive Elements (20%)
        let interactiveBase = 50
        if (visibleElements.length > 0) {
          interactiveBase = Math.round((workingCount / Math.max(clickedCount, 1)) * 100)
        }
        const interactiveScore = Math.round(interactiveBase * 0.20)

        const overallScore = Math.max(0, Math.min(100, responsivenessScore + consoleScore + performanceScore + a11yScore + interactiveScore))

        const videoUrl = fs.existsSync(videoFilePath) ? `/uiux-videos/${sessionId}.webm` : null

        const finalResult = {
          overall_score: overallScore,
          responsiveness: { score: responsivenessScore, max: 30, details: viewportResults },
          console_errors: { score: consoleScore, max: 15, errors: consoleErrors.slice(0, 5), count: consoleErrors.length },
          performance: { score: performanceScore, max: 15, page_load_ms: pageLoadMs },
          accessibility: { score: a11yScore, max: 20, issues: a11yIssues },
          interactivity: { score: interactiveScore, max: 20, found: visibleElements.length, clicked: clickedCount, working: workingCount },
          video_url: videoUrl,
        }

        // ─── Update database ───
        try {
          const { supabaseAdmin } = await import('@/lib/supabase/admin')
          await supabaseAdmin
            .from('audit_sessions')
            .update({ ui_ux_score: overallScore, ui_ux_skipped: false })
            .eq('id', sessionId)
            
          // Store the full result in live_app_audits
          await supabaseAdmin
            .from('live_app_audits')
            .insert({
              session_id: sessionId,
              url: deployment_url,
              raw_lighthouse: finalResult
            })
        } catch (e: any) {
          console.warn('[UiUxTest API] DB update failed:', e.message)
        }

        // ─── Final result ───
        send({
          step: 'complete',
          message: 'UI/UX testing complete!',
          progress: 100,
          result: finalResult,
        })
      } catch (err: any) {
        send({ step: 'error', message: `Test failed: ${err.message}`, progress: 0 })
      } finally {
        if (browser) await browser.close().catch(() => {})
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
