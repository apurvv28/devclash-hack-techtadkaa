import type { ModuleDetectionResult } from '@/types/analysis'

export class ModuleBoundaryDetector {
  detect(params: {
    fileTree: string[]
    authorshipMap: { file_path: string; ownership_percent: number }[]
    packageJsonContent: string | null
    files: { path: string; content: string }[]
  }): ModuleDetectionResult {
    const { fileTree, authorshipMap, packageJsonContent, files } = params
    
    // Step 1 — Framework Detection
    let framework = 'Unknown'
    const deps = packageJsonContent?.toLowerCase() || ''
    
    if (deps.includes('@nestjs/core')) {
      framework = 'NestJS'
    } else if (deps.includes('"next"') || deps.includes('"next":')) {
      framework = 'Next.js'
    } else if (deps.includes('"express"') || deps.includes('"express":')) {
      framework = 'Express'
    } else if (fileTree.some(f => f.includes('manage.py'))) {
      framework = 'Django'
    } else if (fileTree.some(f => f.includes('pom.xml') || f.includes('build.gradle'))) {
      framework = 'Spring'
    } else if (fileTree.some(f => f.includes('artisan'))) {
      framework = 'Laravel'
    }

    // Step 2 — Module Directory Patterns per framework
    const detectedModules = new Set<string>()

    if (framework === 'NestJS') {
      for (const f of fileTree) {
        if (f.endsWith('.module.ts')) {
           const parts = f.split('/')
           parts.pop() // remove file name
           detectedModules.add(parts.join('/') + '/')
        }
      }
    } else if (framework === 'Express') {
      for (const f of fileTree) {
         if (f.match(/(?:routes|controllers|api)\//)) {
            const parts = f.split('/')
            parts.pop()
            detectedModules.add(parts.join('/') + '/')
         }
      }
    } else if (framework === 'Django') {
      const dirsWithViews = new Set<string>()
      const dirsWithModels = new Set<string>()
      for (const f of fileTree) {
         if (f.endsWith('views.py')) dirsWithViews.add(f.split('/').slice(0, -1).join('/') + '/')
         if (f.endsWith('models.py')) dirsWithModels.add(f.split('/').slice(0, -1).join('/') + '/')
      }
      for (const d of dirsWithViews) {
         if (dirsWithModels.has(d)) detectedModules.add(d)
      }
    } else if (framework === 'Spring') {
      for (const f of fileTree) {
         if (f.includes('src/main/java') && f.endsWith('Controller.java')) {
            const parts = f.split('/')
            parts.pop()
            detectedModules.add(parts.join('/') + '/')
         }
      }
    } else {
       // Generic
       const dirCounts = new Map<string, number>()
       for (const f of fileTree) {
          const parts = f.split('/')
          if (parts.length > 1) {
             const dir = parts.slice(0, -1).join('/') + '/'
             dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1)
          }
       }
       for (const [dir, count] of dirCounts.entries()) {
          if (count >= 3 && !dir.startsWith('.')) {
              detectedModules.add(dir)
          }
       }
    }

    const detectedModulesArr = Array.from(detectedModules)

    // Step 3 — Attribution Concentration Check
    let bestConcentration = 0
    let targetModule: string | null = null
    const thresholdPercentage = 0.70

    const authorTotalOwnedFiles = authorshipMap.filter(a => a.ownership_percent > 60).length

    for (const modDir of detectedModulesArr) {
      const moduleOwnedFiles = authorshipMap.filter(f => f.file_path.startsWith(modDir) && f.ownership_percent > 60).length
      const moduleTotalFiles = fileTree.filter(f => f.startsWith(modDir)).length
      
      const concentration = moduleTotalFiles > 0 ? (moduleOwnedFiles / moduleTotalFiles) : 0
      const chunkOfTotalOwnership = authorTotalOwnedFiles > 0 ? (moduleOwnedFiles / authorTotalOwnedFiles) : 0

      if (concentration > thresholdPercentage && chunkOfTotalOwnership > thresholdPercentage) {
         if (concentration > bestConcentration) {
            bestConcentration = concentration
            targetModule = modDir
         }
      }
    }

    const analysis_mode = targetModule ? 'module' : 'breadth'

    // Step 4 — Module Complexity Score
    let module_complexity_score = 0
    let endpoint_count = 0
    let external_integrations = 0
    let async_operation_count = 0
    let business_rule_count = 0
    let data_model_relationship_count = 0

    if (analysis_mode === 'module' && targetModule) {
      for (const file of files) {
         if (!file.path.startsWith(targetModule)) continue
         
         const text = file.content
         
         endpoint_count += (text.match(/@Get|@Post|@Put|@Delete|\.get\(|\.post\(|\.put\(|\.delete\(/g) || []).length
         external_integrations += (text.match(/stripe|axios|node-fetch|nodemailer|aws-sdk|twilio|sendgrid/gi) || []).length
         async_operation_count += (text.match(/async\s+(?:function|\w+\s*=)/g) || []).length
         
         if (file.path.includes('service')) {
            const conditionals = (text.match(/if\s*\(|else\s+if/g) || []).length
            business_rule_count += Math.floor(conditionals / 3) 
         }
         
         if (file.path.includes('entity') || file.path.includes('model')) {
            data_model_relationship_count += (text.match(/@OneToOne|@OneToMany|@ManyToOne|@ManyToMany|@JoinColumn/g) || []).length
         }
      }
      
      module_complexity_score = (endpoint_count * 1.0) + (external_integrations * 3.0) + (async_operation_count * 2.0) + (business_rule_count * 1.5) + (data_model_relationship_count * 2.0)
    }

    return {
       framework,
       analysis_mode,
       target_module: targetModule,
       detected_modules: detectedModulesArr,
       module_complexity_score,
       module_concentration: bestConcentration
    }
  }

  filterFilesForAnalysis(params: {
    allFiles: { path: string; content: string; language: string }[]
    analysisMode: 'module' | 'breadth'
    targetModule: string | null
    authorshipMap: { file_path: string; ownership_percent: number }[]
  }): { path: string; content: string; language: string }[] {
    const { allFiles, analysisMode, targetModule, authorshipMap } = params
    
    const ownershipLookup = new Map<string, number>()
    for (const auth of authorshipMap) {
       ownershipLookup.set(auth.file_path, auth.ownership_percent)
    }

    if (analysisMode === 'module' && targetModule) {
       return allFiles.filter(f => {
          if (!f.path.startsWith(targetModule)) return false
          const own = ownershipLookup.get(f.path) || 0
          return own > 30
       })
    } else {
       return allFiles.filter(f => {
          const own = ownershipLookup.get(f.path) || 0
          return own > 60
       })
    }
  }
}
