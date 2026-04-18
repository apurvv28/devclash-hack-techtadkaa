import { Octokit } from '@octokit/rest'
import pLimit from 'p-limit'
import pRetry, { AbortError } from 'p-retry'
import { rateLimitManager } from './rate-limiter'
import type {
  GitHubRepo,
  GitHubCommit,
  GitHubTreeEntry,
  GitHubBranch,
  GitHubPullRequest,
} from '@/types/github'

const limit = pLimit(15)

/**
 * Creates an Octokit instance configured with a rate-limit header interceptor.
 */
function createOctokitClient(token: string): Octokit {
  const octokit = new Octokit({
    auth: token,
    request: { timeout: 30000 },
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: console.error
    }
  })

  // Intercept responses to update centralized rate limiting
  octokit.hook.after('request', async (response) => {
    const headers = response.headers
    if (headers && headers['x-ratelimit-remaining'] && headers['x-ratelimit-reset']) {
      rateLimitManager.recordRequest(
        parseInt(headers['x-ratelimit-remaining'] as string, 10),
        parseInt(headers['x-ratelimit-reset'] as string, 10)
      )
    }
  })

  return octokit
}

/**
 * Wrapper for executing GitHub REST API calls with concurrency constraints,
 * proper rate-limit buffering, and retry logic.
 */
async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  return limit(() =>
    pRetry(
      async () => {
        const delay = rateLimitManager.shouldWait()
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        try {
          return await operation()
        } catch (error: any) {
          if (error.response?.headers) {
            const headers = error.response.headers
            const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '5000', 10)
            const reset = parseInt(headers['x-ratelimit-reset'] ?? '0', 10)
            rateLimitManager.recordRequest(remaining, reset)
          }

          if (error.status === 403 || error.status === 429) {
            // Throwing triggers pRetry logic
            throw error
          }

          // Abort retries for structural errors like 404
          throw new AbortError(error)
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        factor: 2,
        onFailedAttempt: (error) => {
          console.warn(`[GitHub REST] Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`)
        },
      }
    )
  )
}

export async function getUserRepos(username: string, token: string): Promise<GitHubRepo[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const { data: userAuth } = await octokit.users.getAuthenticated().catch(() => ({ data: null }))

    if (userAuth && userAuth.login.toLowerCase() === username.toLowerCase()) {
      return octokit.paginate(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        affiliation: 'owner',
      }) as unknown as Promise<GitHubRepo[]>
    }

    return octokit.paginate(octokit.repos.listForUser, {
      username,
      per_page: 100,
      type: 'owner',
    }) as unknown as Promise<GitHubRepo[]>
  })
}

export async function getRepoBranches(owner: string, repo: string, token: string): Promise<GitHubBranch[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    return octokit.paginate(octokit.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    }) as unknown as Promise<GitHubBranch[]>
  })
}

export async function getCommitsByAuthor(
  owner: string,
  repo: string,
  author: string,
  token: string
): Promise<GitHubCommit[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    return octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      author,
      per_page: 100,
    }) as unknown as Promise<GitHubCommit[]>
  })
}

export async function getRepoContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string
): Promise<string> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    })
    
    if (!Array.isArray(data) && data.type === 'file' && !!data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    throw new Error(`Path ${path} is not a valid file`)
  })
}

export async function getRepoTree(
  owner: string,
  repo: string,
  ref: string,
  token: string
): Promise<GitHubTreeEntry[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: 'true',
    })
    return (data.tree as GitHubTreeEntry[]).filter((e) => e.type === 'blob')
  })
}

export async function getPullRequests(
  owner: string,
  repo: string,
  author: string,
  token: string
): Promise<GitHubPullRequest[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const q = `repo:${owner}/${repo} is:pr author:${author}`
    return octokit.paginate(octokit.search.issuesAndPullRequests, {
      q,
      per_page: 100,
    }).then(results => results as unknown as GitHubPullRequest[])
  })
}

export async function getPRDiff(
  owner: string,
  repo: string,
  pullNumber: number,
  token: string
): Promise<string> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: {
        format: 'diff',
      },
    })
    return data as unknown as string
  })
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/,
    /^([^/]+)\/([^/]+)$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  }

  throw new Error(`Cannot parse GitHub URL: ${url}`)
}

export async function getRepository(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubRepo> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    const { data } = await octokit.repos.get({ owner, repo })
    return data as GitHubRepo
  })
}

export async function getCommits(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<GitHubCommit[]> {
  const octokit = createOctokitClient(token)
  return executeWithRetry(async () => {
    return octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      sha: branch,
      per_page: 100,
    }) as unknown as Promise<GitHubCommit[]>
  })
}
