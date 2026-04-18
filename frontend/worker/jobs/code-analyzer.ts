import type { Job } from 'bullmq'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getQueue, QUEUE_NAMES } from '@/lib/queue/client'
import { ModuleBoundaryDetector } from '@/lib/analysis/module-detector'
import { QualityScorer } from '@/lib/analysis/quality-scorer'
import { TutorialCloneDetector } from '@/lib/analysis/tutorial-detector'
import { ComplexityClassifier } from '@/lib/analysis/complexity-classifier'
import { runSecurityScan, isSemgrepAvailable } from '@/lib/analysis/security-scanner'
import { getRepoContent } from '@/lib/github/rest'
import type { ParsedFile } from '@/types/analysis'
import type { RepoAnalysis, SecurityIssue } from '@/types/index'

const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.rs',
])

const MAX_FILE_SIZE = 100 * 1024 // 100KB per file
const MAX_FILES_PER_REPO = 200

interface AnalyzeRepoPayload {
  session_id: string
  github_username: string
  repos: Array<{
    repo_name: string
    branch_name: string
    file_tree: Array<{ path: string; sha: string }>
    commit_count: number
    languages: Record<string, number>
  }>
}

export async function handleCodeAnalysis(job: Job): Promise<void> {
  const { session_id, github_username, repos } = job.data as AnalyzeRepoPayload

  console.log(`[CodeAnalyzer] Starting analysis for session ${session_id}, ${repos.length} repo(s)`)
  await updateSessionStatus(session_id, 'analyzing_code', 42)

  // Get user token
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('github_token_encrypted')
    .eq('github_username', github_username)
    .single()

  const token = user?.github_token_encrypted ?? ''

  const repoAnalyses: RepoAnalysis[] = []
  const semgrepAvailable = isSemgrepAvailable()

  for (let repoIdx = 0; repoIdx < repos.length; repoIdx++) {
    const repoMeta = repos[repoIdx]
    const [owner, repoName] = repoMeta.repo_name.split('/')

    const progress = 42 + Math.round(((repoIdx + 1) / repos.length) * 22)
    await job.updateProgress(progress)

    // Filter to supported source files
    const sourceFiles = repoMeta.file_tree
      .filter((f) => {
        const ext = '.' + f.path.split('.').pop()
        return SUPPORTED_EXTENSIONS.has(ext) && !f.path.includes('node_modules')
      })
      .slice(0, MAX_FILES_PER_REPO)

    console.log(`[CodeAnalyzer] Fetching ${sourceFiles.length} source files from ${repoMeta.repo_name}...`)
    await updateSessionStatus(session_id, 'analyzing_code', 44 + repoIdx * 3)

    // Fetch file contents in parallel with rate limit
    const parsedFiles: ParsedFile[] = (
      await Promise.all(
        sourceFiles.map(async (file) => {
            try {
              const content = await getRepoContent(
                owner, repoName, file.path, repoMeta.branch_name, token
              )
              if (content.length > MAX_FILE_SIZE) return null

              const ext = file.path.split('.').pop() ?? ''
              const language = extToLanguage(ext)

              return {
                path: file.path,
                language,
                content,
                lineCount: content.split('\n').length,
                byteSize: Buffer.byteLength(content, 'utf-8'),
              } as ParsedFile
            } catch {
              return null
            }
        })
      )
    ).filter((f): f is ParsedFile => f !== null)

    console.log(`[CodeAnalyzer] Downloaded ${parsedFiles.length} files. Running analysis...`)
    await updateSessionStatus(session_id, 'analyzing_code', 50 + repoIdx * 5)

    const pkgJson = parsedFiles.find((f) => f.path.toLowerCase().endsWith('package.json'))?.content || null
    const reqTxt = parsedFiles.find((f) => f.path.toLowerCase().endsWith('requirements.txt'))?.content || null
    const readme = parsedFiles.find((f) => f.path.toLowerCase().endsWith('readme.md'))?.content || null

    // Module detection
    const moduleDetector = new ModuleBoundaryDetector()
    const moduleDetectionResult = moduleDetector.detect({
      fileTree: repoMeta.file_tree.map((f) => f.path),
      authorshipMap: [], 
      packageJsonContent: pkgJson,
      files: parsedFiles
    })

    const analysisFiles = moduleDetector.filterFilesForAnalysis({
      allFiles: parsedFiles,
      analysisMode: moduleDetectionResult.analysis_mode,
      targetModule: moduleDetectionResult.target_module,
      authorshipMap: [] 
    })

    // Complexity classification
    const complexityClassifier = new ComplexityClassifier()
    const complexityResult = complexityClassifier.classify({
      repoName: repoName,
      description: null,
      readmeContent: readme,
      fileTree: repoMeta.file_tree.map((f) => f.path),
      packageJsonContent: pkgJson,
      requirementsTxtContent: reqTxt,
      languages: repoMeta.languages
    })

    // Quality scoring
    const qualityScorer = new QualityScorer()
    const qualityResult = await qualityScorer.score({
      files: analysisFiles.map(f => ({ path: f.path, content: f.content, language: f.language })),
      repoName: repoName,
      sessionId: session_id
    })

    // Tutorial detection
    console.log(`[CodeAnalyzer] Running plagiarism detection for ${repoName}...`)
    await updateSessionStatus(session_id, 'analyzing_code', 56 + repoIdx * 3)
    const tutorialDetector = new TutorialCloneDetector()
    const tutorialResult = tutorialDetector.analyze({
      repoName: repoName,
      readmeContent: readme,
      commitHistory: [], 
      fileTree: repoMeta.file_tree.map((f) => f.path),
      description: null
    })

    // Security scan
    console.log(`[CodeAnalyzer] Scanning ${parsedFiles.length} files for vulnerabilities...`)
    await updateSessionStatus(session_id, 'analyzing_code', 60 + repoIdx * 3)
    let securityIssues: SecurityIssue[] = []
    if (semgrepAvailable && parsedFiles.length > 0) {
      securityIssues = runSecurityScan(
        parsedFiles.map((f) => ({ path: f.path, content: f.content, language: f.language }))
      )
    }
    console.log(`[CodeAnalyzer] Found ${securityIssues.length} potential vulnerabilities.`)

    const dominantLanguage = Object.entries(repoMeta.languages)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'unknown'

    // Use crypto.randomUUID() for proper UUID primary keys
    const analysis: RepoAnalysis = {
      id: crypto.randomUUID(),
      session_id,
      repo_name: repoMeta.repo_name,
      branch_name: repoMeta.branch_name,
      analysis_scope: moduleDetectionResult.analysis_mode,
      language: dominantLanguage,
      complexity_tier: complexityResult.tier,
      complexity_weight: complexityResult.complexity_weight,
      absolute_score: Math.round(qualityResult.absolute_score),
      weighted_score: Math.round(qualityResult.absolute_score * complexityResult.complexity_weight),
      api_design_score: qualityResult.api_design_score,
      service_layer_score: qualityResult.service_layer_score,
      data_access_score: qualityResult.data_access_score,
      error_handling_score: qualityResult.error_handling_score,
      input_validation_score: qualityResult.input_validation_score,
      testing_score: qualityResult.testing_score,
      modularity_score: qualityResult.modularity_score,
      doc_score: qualityResult.doc_score,
      security_issues: securityIssues,
      plagiarism_flags: tutorialResult.signals_triggered.map((hint) => ({
        file: 'repository-level',
        similarity_score: tutorialResult.confidence,
        source_hint: hint,
      })),
      architectural_pattern: moduleDetectionResult.framework,
      commit_archetype: 'Craftsman',
    }

    repoAnalyses.push(analysis)

    // Store analysis in DB (non-fatal if fails)
    const { error: upsertErr } = await supabaseAdmin.from('repo_analyses').upsert(analysis)
    if (upsertErr) {
      console.warn(`[CodeAnalyzer] Failed to save repo_analysis (non-fatal):`, upsertErr.message)
    }
  }

  console.log(`[CodeAnalyzer] Analysis complete. Advancing to live audit stage...`)
  await updateSessionStatus(session_id, 'analyzing_code', 68)
  await new Promise(r => setTimeout(r, 300))
  await updateSessionStatus(session_id, 'auditing_live', 70)

  // Enqueue live audit
  const liveAuditQueue = getQueue(QUEUE_NAMES.LIVE_AUDIT)
  await liveAuditQueue.add('lighthouse-audit', {
    session_id,
    repo_analyses: repoAnalyses,
  })
}

function extToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', go: 'go', java: 'java', rb: 'ruby', rs: 'rust',
  }
  return map[ext] ?? 'unknown'
}

async function updateSessionStatus(sessionId: string, status: string, progress: number) {
  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update({ status, progress_percent: progress })
    .eq('id', sessionId)

  if (error) {
    console.error(`[CodeAnalyzer] DB UPDATE FAILED for session ${sessionId}:`, error.message)
  } else {
    console.log(`[CodeAnalyzer] Progress → ${progress}% (${status})`)
  }
}
