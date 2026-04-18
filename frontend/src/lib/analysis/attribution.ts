import pLimit from 'p-limit'
import {
  getRepoBranches,
  getCommits,
  getRepoTree,
  getRepoContent,
  getPullRequests,
  getPRDiff
} from '@/lib/github/rest'
import { getBlameForFile } from '@/lib/github/graphql'
import { saveAuthorshipMap } from '@/lib/supabase/queries'
import type { AuthorshipMapResult, PRContribution, FileContent } from '@/types/github'

export class ContributionAttributionEngine {
  async buildAuthorshipMap(params: {
    owner: string
    repo: string
    targetAuthorEmail: string
    targetGithubUsername: string
    token: string
    sessionId: string
  }): Promise<AuthorshipMapResult> {
    const { owner, repo, targetAuthorEmail, targetGithubUsername, token, sessionId } = params

    const branches = await getRepoBranches(owner, repo, token)

    let totalAttributedLines = 0
    const ownedFiles = new Set<string>()
    const contributedFiles = new Set<string>()
    const touchedFiles = new Set<string>()

    const processedFiles = new Set<string>()
    const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go']

    for (const branchObj of branches) {
      const branch = branchObj.name

      // Fetch all commits on the branch, fallback on empty array naturally
      const commits = await getCommits(owner, repo, branch, token).catch(() => [])

      const authorCommits = commits.filter((c) =>
        c.author?.login?.toLowerCase() === targetGithubUsername.toLowerCase() ||
        c.commit?.author?.email?.toLowerCase() === targetAuthorEmail.toLowerCase()
      )

      if (authorCommits.length === 0) continue

      const tree = await getRepoTree(owner, repo, branch, token).catch(() => [])

      const sourceFiles = tree.filter((t) => {
        if (!t.path) return false
        return sourceExts.some((ext) => t.path.endsWith(ext)) && !processedFiles.has(t.path)
      })

      const limit = pLimit(3)

      await Promise.all(
        sourceFiles.map((file) =>
          limit(async () => {
            if (!file.path) return

            try {
              const blame = await getBlameForFile(owner, repo, branch, file.path, token)

              let linesOwned = 0
              let totalLines = 0
              const authorOwnedRanges: Array<{ start: number; end: number }> = []

              for (const range of blame) {
                const rangeLoc = range.endingLine - range.startingLine + 1
                totalLines += rangeLoc

                const matchesEmail =
                  range.authorEmail.toLowerCase() === targetAuthorEmail.toLowerCase()
                const matchesUsername =
                  range.authorName &&
                  range.authorName.toLowerCase() === targetGithubUsername.toLowerCase()

                if (matchesEmail || matchesUsername) {
                  linesOwned += rangeLoc
                  authorOwnedRanges.push({ start: range.startingLine, end: range.endingLine })
                }
              }

              if (totalLines === 0 || linesOwned === 0) return

              totalAttributedLines += linesOwned
              const ownershipPercent = (linesOwned / totalLines) * 100

              if (ownershipPercent > 60) ownedFiles.add(file.path)
              else if (ownershipPercent >= 10) contributedFiles.add(file.path)
              else touchedFiles.add(file.path)

              await saveAuthorshipMap({
                session_id: sessionId,
                repo_name: `${owner}/${repo}`,
                branch_name: branch,
                file_path: file.path,
                owned_line_ranges: authorOwnedRanges,
                contributed_line_ranges: [], // Ignored per spec simplifications
                ownership_percent: ownershipPercent,
                is_tutorial_clone: false,
                tutorial_clone_confidence: 0,
              })

              processedFiles.add(file.path)
            } catch (err) {
              // Graceful continue: Some files might be invalid or too large for GraphQL Blame
            }
          })
        )
      )
    }

    const prContributions = await this.extractPRContributions({
      owner,
      repo,
      targetGithubUsername,
      token,
    })

    return {
      owned_files: Array.from(ownedFiles),
      contributed_files: Array.from(contributedFiles),
      touched_files: Array.from(touchedFiles),
      total_attributed_lines: totalAttributedLines,
      pr_contributions: prContributions,
    }
  }

  async getOwnedFileContents(params: {
    owner: string
    repo: string
    ownedFiles: string[]
    branch: string
    token: string
  }): Promise<FileContent[]> {
    const { owner, repo, ownedFiles, branch, token } = params
    const limit = pLimit(3)

    const results = await Promise.all(
      ownedFiles.map((path) =>
        limit(async () => {
          try {
            const content = await getRepoContent(owner, repo, path, branch, token)
            const ext = path.split('.').pop() ?? ''
            const language = this.extToLang(ext)
            return { path, content, language }
          } catch {
            return null
          }
        })
      )
    )

    return results.filter((r): r is FileContent => r !== null)
  }

  async extractPRContributions(params: {
    owner: string
    repo: string
    targetGithubUsername: string
    token: string
  }): Promise<PRContribution[]> {
    const { owner, repo, targetGithubUsername, token } = params
    const prs = await getPullRequests(owner, repo, targetGithubUsername, token)
    const limit = pLimit(3)

    const contributions = await Promise.all(
      prs.map((pr) =>
        limit(async () => {
          try {
            const diffText = await getPRDiff(owner, repo, pr.number, token)
            const filesChanged = new Map<string, string[]>()
            let currentFile = ''

            for (const line of diffText.split('\n')) {
              if (line.startsWith('+++ b/')) {
                currentFile = line.substring(6)
                filesChanged.set(currentFile, [])
              } else if (line.startsWith('+') && !line.startsWith('+++') && currentFile) {
                filesChanged.get(currentFile)?.push(line.substring(1))
              }
            }

            return {
              pr_number: pr.number,
              pr_title: pr.title,
              pr_url: pr.html_url,
              files_changed: Array.from(filesChanged.entries()).map(([path, lines]) => ({
                path,
                added_lines: lines,
              })),
            } as PRContribution
          } catch {
            return null
          }
        })
      )
    )

    return contributions.filter((c): c is PRContribution => c !== null)
  }

  private extToLang(ext: string): string {
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rb: 'ruby',
      rs: 'rust',
    }
    return map[ext] ?? 'unknown'
  }
}
