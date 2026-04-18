import type { FileContent } from '@/types/github'

export interface QualityScoreResult {
  api_design_score: number
  service_layer_score: number
  data_access_score: number
  error_handling_score: number
  input_validation_score: number
  testing_score: number
  modularity_score: number
  doc_score: number
  absolute_score: number
}

export class QualityScorer {
  async score(params: {
    files: FileContent[]
    repoName: string
    sessionId: string
  }): Promise<QualityScoreResult> {
    const { files } = params

    const sourceFiles = files.filter(f => !f.path.toLowerCase().endsWith('.md'))
    const totalSourceFiles = sourceFiles.length || 1

    // DIMENSION 1 — Testing Score 
    const testFilePatterns = /\.test\.(ts|js)$|\.spec\.(ts|js)$|test_\.py$|_test\.py$/i
    const testFiles = sourceFiles.filter(f => testFilePatterns.test(f.path))
    const testRatio = testFiles.length / totalSourceFiles
    
    let totalAsserts = 0
    let hasEdgeCaseTests = false
    
    for (const tf of testFiles) {
      totalAsserts += (tf.content.match(/assert|expect|assertEqual|assertThat/g) || []).length
      if (/null|empty|invalid|error|fail|undefined|edge/i.test(tf.content)) {
        hasEdgeCaseTests = true
      }
    }
    
    const assertDensity = testFiles.length > 0 ? (totalAsserts / testFiles.length) : 0
    const testing_score = Math.min(
      (testRatio * 60) + (hasEdgeCaseTests ? 20 : 0) + (assertDensity > 5 ? 20 : assertDensity * 4), 
      100
    )

    // DIMENSION 2 — Documentation Score 
    let readmeScore = 0
    const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md')
    if (readmeFile) {
      if (readmeFile.content.length > 200) readmeScore += 20
      if (/```/.test(readmeFile.content)) readmeScore += 15
      if (/installation|setup/i.test(readmeFile.content)) readmeScore += 15
      if (/usage|getting started/i.test(readmeFile.content)) readmeScore += 15
      if (/api|endpoints/i.test(readmeFile.content)) readmeScore += 15
      if (/\[!\[.*\].*\]/.test(readmeFile.content)) readmeScore += 5 // Badges
      if (/\!\[.*\]\(.*\)/.test(readmeFile.content)) readmeScore += 15 // Images/Screenshots
    }

    let inlineComments = 0
    let jsDocBlocks = 0
    let totalSourceLines = 0
    
    for (const sf of sourceFiles) {
      const lines = sf.content.split('\n')
      totalSourceLines += lines.length
      inlineComments += (sf.content.match(/^\s*(?:\/\/|#)/gm) || []).length
      jsDocBlocks += (sf.content.match(/\/\*\*|"""/g) || []).length
    }
    
    const commentDensity = totalSourceLines > 0 ? (inlineComments / totalSourceLines) : 0
    const jsdocDensity = totalSourceLines > 0 ? (jsDocBlocks / totalSourceLines) : 0
    
    const doc_score = Math.min(
      (readmeScore * 0.5) + Math.min(commentDensity * 200, 30) + Math.min(jsdocDensity * 200, 20), 
      100
    )

    // DIMENSION 3 — Modularity Score 
    let modularityScore = 100
    let totalUniqueImports = 0

    const paths = files.map(f => f.path.toLowerCase())
    if (paths.some(p => p.includes('src/') || p.includes('lib/') || p.includes('modules/'))) {
      modularityScore = Math.min(modularityScore + 20, 100)
    }
    if (paths.some(p => p.includes('components/') || p.includes('services/'))) {
      modularityScore = Math.min(modularityScore + 10, 100)
    }

    for (const sf of sourceFiles) {
      const lines = sf.content.split('\n')
      if (lines.length > 300) {
        const excess = Math.floor((lines.length - 300) / 100)
        modularityScore -= (excess + 1) * 15
      }

      const exports = (sf.content.match(/export (?:const|function|class)/g) || []).length
      if (exports > 3) {
        modularityScore -= (exports - 3) * 5
      }

      const imports = new Set(sf.content.match(/(?:import|require)\s*\(?['"](.*?)['"]/g) || [])
      totalUniqueImports += imports.size
    }

    const avgImports = totalUniqueImports / totalSourceFiles
    modularityScore += Math.min(avgImports, 20)
    const modularity_score = Math.max(0, Math.min(100, Math.round(modularityScore)))

    // DIMENSION 4 — Error Handling Score
    let errScore = 50
    let tryCatchBlocks = 0
    let asyncFunctions = 0

    for (const sf of sourceFiles) {
      tryCatchBlocks += (sf.content.match(/catch\s*\(/g) || []).length
      asyncFunctions += (sf.content.match(/async\s+(?:function|\w+\s*=)/g) || []).length
      
      const emptyCatches = (sf.content.match(/catch\s*\([^)]*\)\s*{\s*(?:console\.log[^}]*)?\s*}/g) || []).length
      errScore -= (emptyCatches * 15)
      
      const stackExposures = (sf.content.match(/(?:error|err)\.stack/g) || []).length
      errScore -= (stackExposures * 20)

      if (/class\s+\w+Error\s+extends\s+Error|CustomError/ig.test(sf.content)) {
         errScore += 25
      }
      if (/app\.use\s*\(\s*(?:function\s*\()?\s*[err,]*err[,\s]+req[,\s]+res[,\s]+next/.test(sf.content) || /@Catch/.test(sf.content)) {
         errScore += 20
      }
    }
    const tryCatchRatio = asyncFunctions > 0 ? (tryCatchBlocks / asyncFunctions) : 0
    errScore += (tryCatchRatio * 20)
    const error_handling_score = Math.max(0, Math.min(100, Math.round(errScore)))

    // DIMENSION 5 — Input Validation Score 
    let valScore = 30 
    for (const sf of sourceFiles) {
      if (/(?:zod|joi|yup|class-validator|pydantic)/.test(sf.content)) valScore += 30
      if (/=== null|=== undefined|!== null|!== undefined/.test(sf.content)) valScore += 20
      if (/parseInt|Number\(|isNaN/.test(sf.content)) valScore += 15
      
      const templateSql = (sf.content.match(/query\s*\(\s*`.*\${/g) || []).length
      valScore -= (templateSql * 30)
    }
    const input_validation_score = Math.max(0, Math.min(100, Math.round(valScore)))

    // DIMENSION 6 — API Design Score 
    let apiScore = 50
    let hasApi = false
    for (const sf of sourceFiles) {
      if (/routes\/|controllers\/|views\.py/i.test(sf.path)) {
         hasApi = true
         if (/get\s*\(['"]\/.*(?:create|update|delete)/i.test(sf.content)) {
            // Bad route name
         } else {
            apiScore += 20
         }
         
         if (/status\(201\)/.test(sf.content)) apiScore += 10
         if (/status\(404\)/.test(sf.content)) apiScore += 10
         if (/status\(400\)/.test(sf.content)) apiScore += 10
         if (/(?:limit|offset|page|cursor)/.test(sf.content)) apiScore += 20
      }
    }
    const api_design_score = hasApi ? Math.max(0, Math.min(100, Math.round(apiScore))) : 0

    // DIMENSION 7 — Service Layer Score
    let serviceScore = 50
    let hasService = false
    for (const sf of sourceFiles) {
      if (/services\//i.test(sf.path)) {
         hasService = true
         if (!/(?:req|res|next)\./.test(sf.content)) serviceScore += 20 // Pure
         if (/constructor\s*\(.*Service/.test(sf.content)) serviceScore += 20
      } else if (/controllers\//i.test(sf.path)) {
         const directDb = (sf.content.match(/db\.|Model\.(?:find|create|update|delete)/ig) || []).length
         serviceScore -= (directDb * 15)
      }
      
      if (/transaction|BEGIN|COMMIT/.test(sf.content)) serviceScore += 25
    }
    const service_layer_score = hasService ? Math.max(0, Math.min(100, Math.round(serviceScore))) : 0

    // DIMENSION 8 — Data Access Score 
    let dataScore = 50
    for (const sf of sourceFiles) {
      const nPlusOne = (sf.content.match(/(?:forEach|map)\s*\([^{]*{[^}]*await\s+(?:db|Model)/g) || []).length
      dataScore -= (nPlusOne * 25)

      const rawConcat = (sf.content.match(/SELECT.*FROM.*;.*\+/i) || []).length
      dataScore -= (rawConcat * 30)

      if (/CREATE INDEX|@Index/.test(sf.content)) dataScore += 20
      if (/prisma|sequelize|mongoose|Repository/.test(sf.content)) dataScore += 15
    }
    const data_access_score = Math.max(0, Math.min(100, Math.round(dataScore)))

    // Calculate Absolute weighted average
    const weights = [0.15, 0.15, 0.15, 0.15, 0.10, 0.15, 0.10, 0.05]
    
    // Fallbacks if layers omitted from repo architecture
    const effectiveApiScore = hasApi ? api_design_score : 50
    const effectiveServiceScore = hasService ? service_layer_score : 50

    const absolute_score = Math.round(
      (effectiveApiScore * weights[0]) + 
      (effectiveServiceScore * weights[1]) + 
      (data_access_score * weights[2]) + 
      (error_handling_score * weights[3]) + 
      (input_validation_score * weights[4]) + 
      (testing_score * weights[5]) + 
      (modularity_score * weights[6]) + 
      (doc_score * weights[7])
    )

    return {
      api_design_score,
      service_layer_score,
      data_access_score,
      error_handling_score,
      input_validation_score,
      testing_score,
      modularity_score,
      doc_score,
      absolute_score
    }
  }
}
