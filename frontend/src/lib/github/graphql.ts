import { graphql } from '@octokit/graphql'
import pLimit from 'p-limit'
import pRetry, { AbortError } from 'p-retry'
import { rateLimitManager } from './rate-limiter'
import type { GitHubContributionCalendar } from '@/types/github'

const limit = pLimit(5)

/**
 * Creates an executing function for GraphQL requests with retry mechanics
 * and concurrency limits baked in.
 */
function createGraphQLClient(token: string) {
  const gql = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  })

  return async function executeGraphQL<T>(query: string, parameters?: Record<string, unknown>): Promise<T> {
    return limit(() =>
      pRetry(
        async () => {
          const delay = rateLimitManager.shouldWait()
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          try {
            return (await gql({ query, ...parameters })) as T
          } catch (error: any) {
            // Record rate limit headers if present
            if (error.headers) {
              const remaining = parseInt(error.headers['x-ratelimit-remaining'] ?? '5000', 10)
              const reset = parseInt(error.headers['x-ratelimit-reset'] ?? '0', 10)
              rateLimitManager.recordRequest(remaining, reset)
            }

            if (error.status === 403 || error.status === 429) {
              // Throttle errors should be retried 
              throw error
            }

            if (error.errors && Array.isArray(error.errors)) {
              // Custom GraphQL runtime/query execution errors
              const messages = error.errors.map((e: any) => e.message).join('; ')
              throw new AbortError(new Error(`GraphQL Error: ${messages}`))
            }

            throw new AbortError(error)
          }
        },
        {
          retries: 3,
          minTimeout: 2000,
          factor: 2,
          onFailedAttempt: (err) => {
            console.warn(`[GitHub GraphQL] Attempt ${err.attemptNumber} failed. ${err.retriesLeft} retries left.`)
          },
        }
      )
    )
  }
}

export async function getBlameForFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string
): Promise<Array<{ startingLine: number; endingLine: number; authorEmail: string; authorName: string; commitSha: string }>> {
  const gqlClient = createGraphQLClient(token)

  const query = `
    query GetBlame($owner: String!, $repo: String!, $branch: String!, $filePath: String!) {
      repository(owner: $owner, name: $repo) {
        object(expression: $branch) {
          ... on Commit {
            blame(path: $filePath) {
              ranges {
                startingLine
                endingLine
                commit {
                  oid
                  author {
                    name
                    email
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const result = await gqlClient<any>(query, { owner, repo, branch, filePath })
  
  const ranges = result.repository?.object?.blame?.ranges || []
  return ranges.map((r: any) => ({
    startingLine: r.startingLine,
    endingLine: r.endingLine,
    authorName: r.commit.author.name,
    authorEmail: r.commit.author.email,
    commitSha: r.commit.oid,
  }))
}

export async function getContributionData(
  username: string,
  token: string
): Promise<GitHubContributionCalendar> {
  const gqlClient = createGraphQLClient(token)
  
  const query = `
    query GetContributions($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `

  const result = await gqlClient<any>(query, { login: username })
  return result.user?.contributionsCollection?.contributionCalendar as GitHubContributionCalendar
}

export async function getLanguageBreakdown(
  owner: string,
  repo: string,
  token: string
): Promise<Record<string, number>> {
  const gqlClient = createGraphQLClient(token)
  
  const query = `
    query GetLanguages($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        languages(first: 20, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
            }
          }
        }
      }
    }
  `

  const result = await gqlClient<any>(query, { owner, repo })
  const edges = result.repository?.languages?.edges || []
  
  const breakdown: Record<string, number> = {}
  for (const edge of edges) {
    breakdown[edge.node.name] = edge.size
  }

  return breakdown
}
