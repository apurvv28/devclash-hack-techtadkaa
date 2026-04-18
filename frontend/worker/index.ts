/**
 * Worker process entry point.
 * Environment must be loaded FIRST, before any other imports.
 */

// Step 1: Load env BEFORE anything else
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

// Step 2: Force memory mode env var so it's available at import-time
if (!process.env.USE_MEMORY_QUEUE) {
  process.env.USE_MEMORY_QUEUE = 'true'
}

console.log(`[Worker] Queue mode: ${process.env.USE_MEMORY_QUEUE === 'true' ? 'MEMORY' : 'REDIS'}`)

async function main() {
  console.log('[Worker] Starting DevCareer Intelligence worker process...')

  const { createAuditOrchestrator } = await import('./orchestrator')
  const orchestrator = createAuditOrchestrator()

  console.log('[Worker] All workers started. Listening for jobs...')
  console.log('[Worker] Press CTRL+C to stop gracefully.')

  // Keep process alive
  await new Promise(() => {})
}

main().catch((err) => {
  console.error('[Worker] Fatal startup error:', err)
  process.exit(1)
})
