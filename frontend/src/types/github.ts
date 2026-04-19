export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  homepage: string | null
  html_url: string
  clone_url: string
  default_branch: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  created_at: string
  updated_at: string
  pushed_at: string
  size: number
  topics: string[]
  visibility: 'public' | 'private'
  fork: boolean
  archived: boolean
}

export interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  author: GitHubUser | null
  committer: GitHubUser | null
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: GitHubCommitFile[]
}

export interface GitHubCommitFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  changes: number
  blob_url: string
  raw_url: string
  contents_url: string
  patch?: string
}

export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: 'User' | 'Organization' | 'Bot'
}

export interface GitHubBlame {
  ranges: BlameRange[]
}

export interface BlameRange {
  startingLine: number
  endingLine: number
  age: number
  commit: {
    oid: string
    messageHeadline: string
    author: {
      name: string
      email: string
      date: string
    }
  }
}

export interface GitHubTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

export interface GitHubFileContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  content?: string
  encoding?: string
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export interface GitHubContributor {
  login: string
  id: number
  avatar_url: string
  html_url: string
  contributions: number
}

export interface GitHubLanguages {
  [language: string]: number
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  updated_at: string
  merged_at: string | null
  user: GitHubUser | null
}

export interface GitHubContributionCalendar {
  totalContributions: number
  weeks: Array<{
    contributionDays: Array<{
      contributionCount: number
      date: string
    }>
  }>
}

export interface PRContribution {
  pr_number: number
  pr_title: string
  pr_url: string
  files_changed: Array<{ path: string; added_lines: string[] }>
}

export interface AuthorshipMapResult {
  owned_files: string[]
  contributed_files: string[]
  touched_files: string[]
  total_attributed_lines: number
  pr_contributions: PRContribution[]
}

export interface FileContent {
  path: string
  content: string
  language: string
}
