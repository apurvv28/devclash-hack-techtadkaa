import { Worker, WorkerOptions, Job } from 'bullmq'
import { getRedisConnection, isMemoryMode } from './client'
import { MemoryWorker, MemoryWorkerHandlers } from './memory-queue'

export interface WorkerJobHandlers {
  [jobName: string]: (job: Job) => Promise<unknown>
}

const activeWorkers: (Worker | MemoryWorker)[] = []

export function createWorker(
  queueName: string,
  handlers: WorkerJobHandlers,
  options: Partial<WorkerOptions> = {}
): Worker | MemoryWorker {
  if (isMemoryMode()) {
    const memWorker = new MemoryWorker(
      queueName,
      handlers as unknown as MemoryWorkerHandlers,
      { concurrency: options.concurrency ?? 5 }
    )
    activeWorkers.push(memWorker)
    return memWorker as unknown as Worker
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const handler = handlers[job.name]
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.name}`)
      }
      return handler(job)
    },
    {
      connection: getRedisConnection(),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5'),
      ...options,
    }
  )

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} (${job.name}) completed`)
  })

  worker.on('failed', (job, error) => {
    console.error(`[${queueName}] Job ${job?.id} (${job?.name}) failed:`, error.message)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`[${queueName}] Job ${jobId} stalled`)
  })

  worker.on('error', (error) => {
    console.error(`[${queueName}] Worker error:`, error.message)
  })

  activeWorkers.push(worker)
  return worker
}

export async function gracefulShutdown(): Promise<void> {
  console.log('Shutting down workers gracefully...')
  await Promise.all(activeWorkers.map((w) => w.close()))
  console.log('All workers stopped.')
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
