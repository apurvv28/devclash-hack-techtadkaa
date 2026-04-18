import { createWorker, WorkerJobHandlers } from '@/lib/queue/worker'
import { QUEUE_NAMES } from '@/lib/queue/client'
import { handleGitHubFetch } from './jobs/github-fetcher'
import { handleCodeAnalysis } from './jobs/code-analyzer'
import { handleLiveAudit } from './jobs/live-auditor'
import { handleUiUxTest } from './jobs/ui-ux-tester'
import { handleAISynthesis } from './jobs/ai-synthesizer'
import { handleMarketFetch } from './jobs/market-fetcher'
import type { Worker } from 'bullmq'
import type { MemoryWorker } from '@/lib/queue/memory-queue'

type AnyWorker = Worker | MemoryWorker

export interface AuditOrchestrator {
  workers: AnyWorker[]
  shutdown: () => Promise<void>
}

export function createAuditOrchestrator(): AuditOrchestrator {
  const workers: AnyWorker[] = []

  // Main audit queue — dispatches to sub-queues based on stage
  const auditHandlers: WorkerJobHandlers = {
    'start-audit': async (job) => {
      const { session_id, github_username, project_urls, deployment_url } = job.data

      // Update status to mark the next stage is ready
      await job.updateProgress(5)
      
      const { supabaseAdmin } = await import('@/lib/supabase/admin')
      await supabaseAdmin.from('audit_sessions').update({ status: 'fetching_github' }).eq('id', session_id)

      console.log(`[Orchestrator] Starting audit ${session_id} for @${github_username}. Enqueueing github-fetch...`)
      
      // Enqueue the next step
      const { getQueue, QUEUE_NAMES } = await import('@/lib/queue/client')
      await getQueue(QUEUE_NAMES.GITHUB_FETCH).add('fetch-repos', { session_id, github_username, project_urls, deployment_url }, { jobId: `github-${session_id}` })

      return { session_id, started_at: new Date().toISOString() }
    },
  }

  workers.push(createWorker(QUEUE_NAMES.AUDIT, auditHandlers))

  const githubHandlers: WorkerJobHandlers = {
    'fetch-repos': handleGitHubFetch,
  }
  workers.push(createWorker(QUEUE_NAMES.GITHUB_FETCH, githubHandlers, { concurrency: 3 }))

  const analysisHandlers: WorkerJobHandlers = {
    'analyze-repo': handleCodeAnalysis,
  }
  workers.push(createWorker(QUEUE_NAMES.CODE_ANALYSIS, analysisHandlers, { concurrency: 2 }))

  const liveAuditHandlers: WorkerJobHandlers = {
    'lighthouse-audit': handleLiveAudit,
  }
  workers.push(createWorker(QUEUE_NAMES.LIVE_AUDIT, liveAuditHandlers, { concurrency: 1 }))

  const uiUxHandlers: WorkerJobHandlers = {
    'test-ui-ux': handleUiUxTest,
  }
  workers.push(createWorker(QUEUE_NAMES.UI_UX_TEST, uiUxHandlers, { concurrency: 1 }))

  const synthesisHandlers: WorkerJobHandlers = {
    'synthesize-profile': handleAISynthesis,
  }
  workers.push(createWorker(QUEUE_NAMES.AI_SYNTHESIS, synthesisHandlers, { concurrency: 2 }))

  const marketHandlers: WorkerJobHandlers = {
    'fetch-market': handleMarketFetch,
  }
  workers.push(createWorker(QUEUE_NAMES.MARKET_FETCH, marketHandlers, { concurrency: 3 }))

  console.log(`[Orchestrator] ${workers.length} workers registered`)

  return {
    workers,
    shutdown: async () => {
      await Promise.all(workers.map((w) => w.close()))
    },
  }
}
