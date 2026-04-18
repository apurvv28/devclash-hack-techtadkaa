import type { TutorialCloneResult } from '@/types/analysis'

export class TutorialCloneDetector {
  analyze(params: {
    repoName: string
    readmeContent: string | null
    commitHistory: Array<{ message: string; additions: number; deletions: number; date: string }>
    commitCount: number
    fileTree: string[]
    description: string | null
  }): TutorialCloneResult {
    let confidence = 0
    const signals_triggered: string[] = []

    // Signal 1 — Repo name patterns (weight 0.20)
    const nameStr = params.repoName.toLowerCase()
    const namePatterns = [
      'tutorial', 'clone', 'practice', 'learn', 'course', 'bootcamp', 'follow',
      'udemy', 'freecodecamp', 'todo-app', 'todo_app', 'todomvc', 'weather-app', 'calculator-app'
    ]
    if (namePatterns.some(p => nameStr.includes(p))) {
      confidence += 0.85 * 0.20
      signals_triggered.push('repo_name_pattern')
    }

    // Signal 2 — README language patterns (weight 0.25)
    if (params.readmeContent) {
      const readmeStr = params.readmeContent.toLowerCase()
      const phrases = [
        'following along', 'based on', 'credit to', 'learned from',
        'watching', 'tutorial by', 'inspired by', 'from the course', 'my implementation of'
      ]
      
      let readmeMatches = 0
      for (const phrase of phrases) {
        if (readmeStr.includes(phrase)) {
          readmeMatches++
        }
      }
      
      if (readmeMatches > 0) {
        const readmeScore = Math.min(readmeMatches * 0.2, 1.0)
        confidence += readmeScore * 0.25
        signals_triggered.push('readme_language_pattern')
      }
    }

    // Signal 3 — Commit pattern (weight 0.30)
    let commitScore = 0
    const commits = params.commitHistory
    const totalCommits = Math.max(params.commitCount, commits.length)

    if (totalCommits <= 3 && totalCommits > 0 && commits.length > 0 && commits[0].additions > 1000) {
      commitScore = 0.9
      signals_triggered.push('commit_pattern: large_dump')
    } else if (totalCommits <= 1 && totalCommits > 0) {
      commitScore = 1.0
      signals_triggered.push('commit_pattern: single_commit')
    } else if (commits.length > 0) {
       const genericMsgs = ['initial commit', 'add files', 'first commit', 'done', 'update']
       const allGeneric = commits.every(c => genericMsgs.includes(c.message.toLowerCase().trim()))
       if (allGeneric && totalCommits < 5) {
          commitScore = 0.7
          signals_triggered.push('commit_pattern: generic_messages')
       }
    }
    confidence += commitScore * 0.30

    // Signal 4 — File structure fingerprint (weight 0.25)
    let structureScore = 0
    const treeStr = params.fileTree.map(f => f.toLowerCase()).join(' ')
    const hasStructure = (reqs: string[]) => reqs.every(r => params.fileTree.some(f => f.toLowerCase().includes(r)))

    const isTodoMVC = hasStructure(['src/app.js', 'src/store.js', 'src/view.js']) || hasStructure(['app.js', 'store.js', 'view.js'])
    const isWeather = treeStr.includes('weather') && (params.readmeContent?.toLowerCase().includes('openweathermap') || treeStr.includes('openweathermap'))
    const isCalc = hasStructure(['calculator.js', 'calculator.css', 'index.html']) && totalCommits < 10
    const isEcom = hasStructure(['products.json', 'cart.js', 'checkout.js']) && totalCommits < 10

    if (isTodoMVC) { structureScore += 0.8; signals_triggered.push('structure: todomvc') }
    if (isWeather && totalCommits < 10) { structureScore += 0.8; signals_triggered.push('structure: weather_app') }
    if (isCalc) { structureScore += 0.8; signals_triggered.push('structure: calculator') }
    if (isEcom) { structureScore += 0.8; signals_triggered.push('structure: ecommerce') }
    
    confidence += Math.min(structureScore, 1.0) * 0.25

    const is_tutorial_clone = confidence > 0.70
    const penalty_multiplier = is_tutorial_clone ? 0.5 : 1.0

    return {
      is_tutorial_clone,
      confidence: Math.min(confidence, 1.0),
      signals_triggered,
      penalty_multiplier
    }
  }
}
