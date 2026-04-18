import type { ComplexityClassification } from '@/types/analysis'
import type { ComplexityTier } from '@/types/index'

export class ComplexityClassifier {
  classify(params: {
    repoName: string
    description: string | null
    readmeContent: string | null
    fileTree: string[]
    packageJsonContent: string | null
    requirementsTxtContent: string | null
    languages: Record<string, number>
  }): ComplexityClassification {
    const depsFile = (params.packageJsonContent || '') + ' ' + (params.requirementsTxtContent || '')
    const deps = depsFile.toLowerCase()
    
    const tree = params.fileTree.map(f => f.toLowerCase())
    const treeStr = tree.join(' ')
    
    const indicators_found: string[] = []

    // Tier indicators
    let tier: ComplexityTier = 1

    const hasQueue = ['bull', 'bullmq', 'amqplib', 'kafka-node', 'kafkajs', 'celery', 'rabbitmq'].some(d => deps.includes(`"${d}"`) || deps.includes(`'${d}'`) || deps.includes(d))
    const multiService = ['services/', 'workers/', 'microservices/'].filter(d => treeStr.includes(d)).length >= 2 || tree.includes('services/') || tree.includes('workers/')
    const hasContainer = tree.some(path => path.includes('docker-compose.yml') || path.includes('kubernetes/'))

    const hasPayment = ['stripe', 'razorpay', 'paypal', 'braintree'].some(d => deps.includes(d))
    const hasEmail = ['nodemailer', 'sendgrid', 'mailgun', 'resend'].some(d => deps.includes(d))
    const hasFileStorage = ['aws-sdk', '@aws-sdk/client-s3', 'multer', 'cloudinary'].some(d => deps.includes(d))
    const hasRealtime = ['socket.io', 'ws', 'ably', 'pusher'].some(d => deps.includes(d))
    
    const hasAuth = ['jsonwebtoken', 'passport', 'bcrypt', 'argon2', 'next-auth', 'django-rest-auth'].some(d => deps.includes(d))
    const hasFileHandling = ['multer', 'formidable', 'python-multipart'].some(d => deps.includes(d))

    if (hasQueue && multiService && hasContainer) {
      tier = 5
      indicators_found.push('distributed_system')
    } else if ((hasPayment || hasEmail || hasFileStorage || hasRealtime) && hasAuth) {
      tier = 4
      indicators_found.push('complex_application')
    } else if (hasAuth && hasFileHandling) {
      tier = 3
      indicators_found.push('auth_and_uploads')
    } else if (hasAuth) {
      tier = 2
      indicators_found.push('auth_only')
    } else {
      tier = 1
      indicators_found.push('basic_crud')
    }

    // Depth
    let depth = 1
    const hasORM = ['prisma', 'sequelize', 'mongoose', 'sqlalchemy'].some(d => deps.includes(d))
    const hasRawSql = treeStr.includes('.sql')
    const hasRedis = deps.includes('redis')
    const hasMigrations = tree.some(path => path.includes('migrations/'))

    const hasSqlite = ['sqlite', 'lowdb', 'nedb'].some(d => deps.includes(d))

    if (hasRedis && hasQueue && hasORM) {
      depth = 5
      indicators_found.push('redis_queue_db')
    } else if (hasRawSql && hasMigrations) {
      depth = 4
      indicators_found.push('raw_sql_migrations')
    } else if (hasORM) {
      depth = 3
      indicators_found.push('orm_db')
    } else if (hasSqlite) {
      depth = 2
      indicators_found.push('sqlite_lowdb')
    }

    // Domain
    let domain = 1
    const contentToScan = (deps + ' ' + (params.readmeContent || '') + ' ' + params.repoName + ' ' + (params.description || '')).toLowerCase()
    
    if (['hipaa', 'gdpr', 'pci', 'audit_log', 'rbac', '2fa'].some(d => contentToScan.includes(d))) {
      domain = 3
      indicators_found.push('compliance_domain')
    } else if (['invoice', 'payment', 'booking', 'inventory', 'crm', 'erp'].some(d => contentToScan.includes(d))) {
      domain = 2
      indicators_found.push('business_domain')
    }

    const complexity_weight = (tier * 0.5 + depth * 0.3 + domain * 0.2) / 5.0

    return {
      tier,
      depth,
      domain,
      complexity_weight,
      indicators_found
    }
  }
}
