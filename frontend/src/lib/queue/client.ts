import { Queue, QueueOptions } from 'bullmq'
import type IORedis from 'ioredis'
import { MemoryQueue } from './memory-queue'

export const QUEUE_NAMES = {
  AUDIT: 'audit',
  GITHUB_FETCH: 'github-fetch',
  CODE_ANALYSIS: 'code-analysis',
  LIVE_AUDIT: 'live-audit',
  UI_UX_TEST: 'ui-ux-test',
  AI_SYNTHESIS: 'ai-synthesis',
  MARKET_FETCH: 'market-fetch',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ─── Mode Detection ────────────────────────────────────────────────────────────

export function isMemoryMode(): boolean {
  return process.env.USE_MEMORY_QUEUE === 'true' ||
    (!process.env.REDIS_HOST && !process.env.REDIS_URL)
}

// Force memory mode (called after Redis connection test fails)
export function forceMemoryMode() {
  console.log('[Queue] Switched to in-memory queue mode')
}

// ─── Redis Connection ──────────────────────────────────────────────────────────

let redisConnection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (isMemoryMode()) {
    throw new Error('FATAL: Attempted to get Redis connection while in memory mode')
  }

  if (!redisConnection) {
    const IORedisLib = require('ioredis') as typeof IORedis
    const host = process.env.REDIS_HOST ?? 'localhost'
    const isUpstash = host.includes('upstash.io')

    redisConnection = new IORedisLib({
      host: host,
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isUpstash ? {} : undefined,
    })
  }
  return redisConnection
}

// ─── Queue Factory ─────────────────────────────────────────────────────────────

const queues = new Map<QueueName, Queue>()
const memQueues = new Map<QueueName, MemoryQueue>()

export function getQueue(name: QueueName): Queue | MemoryQueue {
  if (isMemoryMode()) {
    if (!memQueues.has(name)) {
      memQueues.set(name, new MemoryQueue(name))
    }
    return memQueues.get(name)!
  }

  if (!queues.has(name)) {
    const queueOptions: QueueOptions = {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    }
    queues.set(name, new Queue(name, queueOptions))
  }
  return queues.get(name)!
}

// ─── Public Helpers ────────────────────────────────────────────────────────────

export async function addAuditJob(
  sessionId: string,
  payload: {
    github_username: string
    project_urls: string[]
    deployment_url?: string
    resume_text?: string
    target_branch?: string
    target_module_path?: string
  }
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.AUDIT)
  const job = await queue.add(
    'start-audit',
    { session_id: sessionId, ...payload },
    { jobId: `audit-${sessionId}` }
  )
  return job.id!
}

export async function getJobStatus(queueName: QueueName, jobId: string) {
  const queue = getQueue(queueName)
  const job = await queue.getJob(jobId)
  if (!job) return null

  const state = await job.getState()
  const progress = typeof job.progress === 'number' ? job.progress : 0

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
}
