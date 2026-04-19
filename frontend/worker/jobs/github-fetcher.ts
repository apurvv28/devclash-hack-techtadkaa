import type { Job } from 'bullmq'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRepository, getCommits, getCommitsByAuthor, getRepoTree, parseRepoUrl, extractRepoDeploymentUrl } from '@/lib/github/rest'
import { getLanguageBreakdown } from '@/lib/github/graphql'
import { getQueue, QUEUE_NAMES } from '@/lib/queue/client'
import type { GitHubRepo, GitHubCommit } from '@/types/github'

interface GitHubFetchPayload {
  session_id: string
  github_username: string
  project_urls: string[]
  deployment_url?: string
  target_branch?: string
}

export async function handleGitHubFetch(job: Job): Promise<void> {
  const { session_id, github_username, project_urls, deployment_url, target_branch } = job.data as GitHubFetchPayload

  await updateSessionStatus(session_id, 'fetching_github', 2)

  // Get user's token from DB
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('github_token_encrypted, github_username')
    .eq('github_username', github_username)
    .single()

  if (userError || !user) {
    console.error(`[GitHubFetcher] Could not find user @${github_username} in database:`, userError)
    await updateSessionStatus(session_id, 'failed', 0)
    return
  }

  const token = user.github_token_encrypted
  if (!token) {
    console.error(`[GitHubFetcher] No GitHub token stored for @${github_username}`)
    await updateSessionStatus(session_id, 'failed', 0)
    return
  }

  console.log(`[GitHubFetcher] Starting fetch for @${github_username} with ${project_urls.length} repo(s). Token present: ${!!token} (length: ${token.length})`)

  const repoData: Array<{
    repo: GitHubRepo
    commits: GitHubCommit[]
    languages: Record<string, number>
    file_tree: Array<{ path: string; sha: string }>
  }> = []

  for (let i = 0; i < project_urls.length; i++) {
    const url = project_urls[i]
    const progress = 5 + Math.round(((i + 1) / project_urls.length) * 30)
    await job.updateProgress(progress)

    try {
      const { owner, repo: repoName } = parseRepoUrl(url)
      console.log(`[GitHubFetcher] Fetching repo ${owner}/${repoName}...`)
      await updateSessionStatus(session_id, 'fetching_github', 8 + i * 5)

      const repo = await getRepository(owner, repoName, token)
      const branch = target_branch ?? repo.default_branch
      console.log(`[GitHubFetcher] Got repo metadata. Branch: ${branch}`)

      const [commits, languages, tree] = await Promise.all([
        getCommitsByAuthor(owner, repoName, github_username, token),
        getLanguageBreakdown(owner, repoName, token),
        getRepoTree(owner, repoName, branch, token),
      ])

      console.log(`[GitHubFetcher] ${owner}/${repoName}: ${commits.length} commits, ${tree.length} files, languages: ${Object.keys(languages).join(', ')}`)

      repoData.push({
        repo,
        commits,
        languages,
        file_tree: tree.map((t) => ({ path: t.path!, sha: t.sha! })),
      })

      // Store raw repo data in Supabase (ignore errors if table doesn't exist yet)
      const { error: upsertError } = await supabaseAdmin.from('fetched_repos').upsert({
        session_id,
        repo_name: repo.full_name,
        branch_name: branch,
        repo_meta: repo,
        commit_count: commits.length,
        languages,
        file_count: tree.length,
        fetched_at: new Date().toISOString(),
      })
      if (upsertError) {
        console.warn(`[GitHubFetcher] Could not save fetched_repos (non-fatal):`, upsertError.message)
      }
    } catch (err: any) {
      console.error(`[GitHubFetcher] Failed to fetch ${url}:`, err?.message ?? err)
      // Continue with other repos instead of failing entirely
    }
  }

  if (repoData.length === 0) {
    console.error(`[GitHubFetcher] No repos were successfully fetched. Marking session as failed.`)
    await updateSessionStatus(session_id, 'failed', 0)
    return
  }

  // Auto-discover deployment URL from repo metadata if not explicitly provided
  let resolvedDeploymentUrl = deployment_url
  if (!resolvedDeploymentUrl) {
    for (const rd of repoData) {
      const discoveredUrl = extractRepoDeploymentUrl(rd.repo)
      if (discoveredUrl) {
        resolvedDeploymentUrl = discoveredUrl
        console.log(`[GitHubFetcher] Auto-discovered deployment URL from ${rd.repo.name}: ${discoveredUrl}`)
        
        // Update session with discovered deployment URL
        await supabaseAdmin
          .from('audit_sessions')
          .update({ deployment_url: discoveredUrl, ui_ux_skipped: false })
          .eq('id', session_id)
        break
      }
    }
  }

  console.log(`[GitHubFetcher] Successfully fetched ${repoData.length}/${project_urls.length} repos. Advancing to code analysis...`)
  await updateSessionStatus(session_id, 'fetching_github', 38)

  // Small delay to let UI show 38% before jumping to analyzing_code  
  await new Promise(r => setTimeout(r, 300))
  await updateSessionStatus(session_id, 'analyzing_code', 40)

  // Enqueue code analysis job
  const analysisQueue = getQueue(QUEUE_NAMES.CODE_ANALYSIS)
  await analysisQueue.add('analyze-repo', {
    session_id,
    github_username,
    deployment_url: resolvedDeploymentUrl,
    repos: repoData.map((r) => ({
      repo_name: r.repo.full_name,
      branch_name: r.repo.default_branch,
      file_tree: r.file_tree,
      commit_count: r.commits.length,
      languages: r.languages,
    })),
  })

  console.log(`[GitHubFetcher] Enqueued code-analysis job for session ${session_id}`)
}

async function updateSessionStatus(
  sessionId: string,
  status: string,
  progress: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update({ status, progress_percent: progress })
    .eq('id', sessionId)
  
  if (error) {
    console.error(`[GitHubFetcher] Failed to update session status:`, error.message)
  }
}
