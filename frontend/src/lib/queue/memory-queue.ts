/**
 * In-memory queue system for local development when Redis TCP is unavailable.
 * Drop-in replacement for BullMQ's Queue + Worker API surface.
 */
import { EventEmitter } from 'events'

// ─── Job ───────────────────────────────────────────────────────────────────────

let jobCounter = 0

export class MemoryJob {
  id: string
  name: string
  data: Record<string, unknown>
  progress: number = 0
  returnvalue: unknown = null
  failedReason: string | null = null
  timestamp: number
  processedOn: number | null = null
  finishedOn: number | null = null

  constructor(name: string, data: Record<string, unknown>, id?: string) {
    this.id = id ?? `mem-${++jobCounter}`
    this.name = name
    this.data = data
    this.timestamp = Date.now()
  }

  async updateProgress(pct: number) {
    this.progress = pct
  }

  async getState(): Promise<string> {
    if (this.finishedOn) return this.failedReason ? 'failed' : 'completed'
    if (this.processedOn) return 'active'
    return 'waiting'
  }

  async log(msg: string) {
    console.log(`[MemoryJob:${this.id}] ${msg}`)
  }
}

// ─── Queue ─────────────────────────────────────────────────────────────────────

const bus = new EventEmitter()
bus.setMaxListeners(100)

const jobStore = new Map<string, MemoryJob>()

export class MemoryQueue {
  name: string

  constructor(name: string) {
    this.name = name
  }

  async add(
    jobName: string,
    data: Record<string, unknown>,
    opts?: { jobId?: string }
  ): Promise<MemoryJob> {
    const job = new MemoryJob(jobName, data, opts?.jobId)
    jobStore.set(job.id, job)
    // Emit asynchronously so the worker event loop picks it up
    setImmediate(() => bus.emit(`queue:${this.name}`, job))
    console.log(`[MemQ:${this.name}] Enqueued job ${job.id} (${jobName})`)
    return job
  }

  async getJob(jobId: string): Promise<MemoryJob | null> {
    return jobStore.get(jobId) ?? null
  }
}

// ─── Worker ────────────────────────────────────────────────────────────────────

export type MemoryJobHandler = (job: MemoryJob) => Promise<unknown>

export interface MemoryWorkerHandlers {
  [jobName: string]: MemoryJobHandler
}

export class MemoryWorker {
  name: string
  private handlers: MemoryWorkerHandlers
  private processing = 0
  private concurrency: number
  private active = true

  constructor(
    queueName: string,
    handlers: MemoryWorkerHandlers,
    opts?: { concurrency?: number }
  ) {
    this.name = queueName
    this.handlers = handlers
    this.concurrency = opts?.concurrency ?? 5

    bus.on(`queue:${queueName}`, (job: MemoryJob) => {
      if (!this.active) return
      this.processJob(job)
    })
  }

  private async processJob(job: MemoryJob) {
    if (this.processing >= this.concurrency) {
      // Re-emit after a short delay when at capacity
      setTimeout(() => bus.emit(`queue:${this.name}`, job), 200)
      return
    }

    const handler = this.handlers[job.name]
    if (!handler) {
      console.error(`[MemW:${this.name}] No handler for job type: ${job.name}`)
      return
    }

    this.processing++
    job.processedOn = Date.now()

    try {
      job.returnvalue = await handler(job)
      job.finishedOn = Date.now()
      console.log(`[MemW:${this.name}] Job ${job.id} (${job.name}) completed`)
    } catch (err: unknown) {
      job.finishedOn = Date.now()
      job.failedReason = err instanceof Error ? err.message : String(err)
      console.error(
        `[MemW:${this.name}] Job ${job.id} (${job.name}) failed:`,
        job.failedReason
      )
    } finally {
      this.processing--
    }
  }

  async close() {
    this.active = false
  }

  // Stubs to match BullMQ Worker event API used in orchestrator
  on(event: string, _fn: (...args: unknown[]) => void) {
    // No-op for memory mode – logging is handled internally
    return this
  }
}
