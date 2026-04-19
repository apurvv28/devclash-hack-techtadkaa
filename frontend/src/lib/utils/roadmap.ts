import type { Roadmap, WeekPlan, RoadmapTask, SkillProfile, CareerTier } from '@/types/index'

const SKILL_RESOURCES: Record<string, RoadmapTask[]> = {
  typescript: [
    {
      title: 'TypeScript Deep Dive',
      description: 'Master advanced TypeScript patterns: generics, conditional types, mapped types',
      resource_url: 'https://basarat.gitbook.io/typescript/',
      resource_type: 'docs',
      estimated_hours: 8,
    },
    {
      title: 'TypeScript Exercises',
      description: 'Hands-on challenges for advanced TypeScript',
      resource_url: 'https://typescript-exercises.github.io/',
      resource_type: 'practice',
      estimated_hours: 5,
    },
  ],
  system_design: [
    {
      title: 'System Design Interview – Alex Xu',
      description: 'Comprehensive system design patterns for senior engineers',
      resource_url: 'https://books.bytebytego.com/system-design-interview',
      resource_type: 'docs',
      estimated_hours: 20,
    },
    {
      title: 'Designing Data-Intensive Applications',
      description: 'Martin Kleppmann\'s foundational distributed systems text',
      resource_url: 'https://dataintensive.net/',
      resource_type: 'docs',
      estimated_hours: 30,
    },
  ],
  testing: [
    {
      title: 'Testing Library & Jest Mastery',
      description: 'Unit, integration, and E2E testing with React Testing Library',
      resource_url: 'https://testing-library.com/docs/',
      resource_type: 'docs',
      estimated_hours: 6,
    },
    {
      title: 'Test-Driven Development with TypeScript',
      description: 'Build a real project using TDD from scratch',
      resource_url: 'https://www.youtube.com/results?search_query=tdd+typescript',
      resource_type: 'video',
      estimated_hours: 8,
    },
  ],
  security: [
    {
      title: 'OWASP Top 10 for Developers',
      description: 'Understand and fix the most critical security risks',
      resource_url: 'https://owasp.org/www-project-top-ten/',
      resource_type: 'docs',
      estimated_hours: 4,
    },
  ],
}

export function generateRoadmap(input: {
  session_id: string
  profile: SkillProfile
  priority_skills: string[]
  complexity_gap: number
  lead_projects: string[]
  bury_projects: string[]
}): Roadmap {
  const { session_id, profile, priority_skills, complexity_gap, lead_projects, bury_projects } = input

  const weeks: WeekPlan[] = []

  // Week 1-2: Immediate gaps
  const week1Tasks: RoadmapTask[] = []
  for (const skill of priority_skills.slice(0, 2)) {
    const resources = SKILL_RESOURCES[skill.toLowerCase()] ?? []
    week1Tasks.push(...resources.slice(0, 2))
  }

  if (week1Tasks.length === 0) {
    week1Tasks.push({
      title: `Strengthen ${profile.overall_tier} fundamentals`,
      description: `Focus on the skill gaps identified in your audit`,
      resource_url: 'https://roadmap.sh',
      resource_type: 'docs',
      estimated_hours: 10,
    })
  }

  weeks.push({
    week: 1,
    title: 'Foundation Strengthening',
    tasks: week1Tasks,
    milestone: `Complete fundamentals review for ${priority_skills[0] ?? 'core skills'}`,
  })

  // Week 3-4: Complexity upgrade
  if (complexity_gap > 0) {
    weeks.push({
      week: 2,
      title: 'Complexity Level-Up',
      tasks: SKILL_RESOURCES['system_design'] ?? [],
      milestone: 'Build a project demonstrating Tier 3+ complexity',
    })
  }

  // Week 5-8: Testing & security
  weeks.push({
    week: 3,
    title: 'Testing & Security Hardening',
    tasks: [
      ...(SKILL_RESOURCES['testing'] ?? []),
      ...(SKILL_RESOURCES['security'] ?? []),
    ],
    milestone: 'Add test suite to your top project (>60% coverage)',
  })

  // Week 9-12: Market positioning
  weeks.push({
    week: 4,
    title: 'Market Positioning & Portfolio Polish',
    tasks: [
      {
        title: 'Rewrite weak resume bullets using STAR method',
        description: 'Transform vague descriptions into quantified impact statements',
        resource_url: 'https://www.levels.fyi/blog/crafting-the-perfect-resume.html',
        resource_type: 'docs',
        estimated_hours: 4,
      },
      {
        title: 'Add README specs to lead projects',
        description: 'Architecture diagrams, tech decisions, challenge documentation',
        resource_url: 'https://github.com/matiassingers/awesome-readme',
        resource_type: 'docs',
        estimated_hours: 3,
      },
    ],
    milestone: `Apply to 5 ${profile.overall_tier}-level roles`,
  })

  const archetypePrescription = getArchetypePrescription(profile.commit_archetype)
  const complexityPrescription = getComplexityPrescription(profile.overall_tier)

  return {
    id: `rm-${session_id}`,
    session_id,
    week_breakdown: weeks,
    priority_skills,
    complexity_gap_prescription: complexityPrescription,
    archetype_prescription: archetypePrescription,
    resume_lead_projects: lead_projects,
    resume_bury_projects: bury_projects,
    recommendations: [], // Populated by AI synthesis stage
  }
}

function getArchetypePrescription(archetype: SkillProfile['commit_archetype']): string {
  const prescriptions: Record<SkillProfile['commit_archetype'], string> = {
    Sprinter: 'Your commit pattern shows large gaps followed by bursts. Practice daily commits with atomic changes. Target: 5 meaningful commits/week with descriptive messages.',
    Craftsman: 'Excellent commit hygiene. Your deliberate, well-described commits signal seniority. Continue this pattern and highlight it in interviews.',
    'Copy-Paster': 'High frequency of large paste-style commits detected. Start writing features from scratch in your next project. Reviewers can tell.',
    Documenter: 'You document well but code quality signals suggest docs might be compensating for code clarity. Focus on self-documenting code first.',
    Ghost: 'Very few commits per project. Could indicate forking without attribution or infrequent pushes. Make local commits daily, push at least weekly.',
  }
  return prescriptions[archetype]
}

function getComplexityPrescription(tier: CareerTier): string {
  const prescriptions: Record<CareerTier, string> = {
    Beginner: 'Your projects top out at CRUD complexity. Build a project with auth, async job queues, or real-time features. Aim for Tier 3 complexity before your next job search.',
    Junior: 'Move beyond tutorials. Your next project must have: multi-service architecture, meaningful test coverage, and a real user.',
    'Junior+': 'Good progress. Now add system design depth: caching strategies, database optimization, or API versioning.',
    Mid: 'Consider adding distributed system patterns: event-driven architecture, CQRS, or a search pipeline.',
    'Mid+': 'One high-complexity "flagship" project that demonstrates senior-level judgment will unlock Staff/Senior roles.',
    Senior: 'Your complexity is strong. Focus on communication artifacts: ADRs, technical specs, and post-mortems.',
    Staff: 'Complexity ceiling is high. Focus on breadth: cross-team impact, architectural decisions, and mentoring evidence.',
  }
  return prescriptions[tier]
}
