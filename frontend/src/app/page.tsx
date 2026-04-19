import Link from 'next/link'
import { cookies } from 'next/headers'

export default async function HomePage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  const isLoggedIn = !!userId

  return (
    <main className="min-h-screen bg-[#F8F9FA] relative overflow-hidden">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1A202C] tracking-tight">
              DevCareer<span className="text-[#003882]">Intelligence</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden md:block text-sm text-[#4A5568] hover:text-[#003882] font-medium transition">Features</a>
            <a href="#how-it-works" className="hidden md:block text-sm text-[#4A5568] hover:text-[#003882] font-medium transition">How it works</a>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#003882]/20 transition-all duration-200"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#003882]/20 transition-all duration-200"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Background decorations ── */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#00A1E4]/8 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-64 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#003882]/5 to-transparent blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-80 left-0 w-[300px] h-[300px] bg-gradient-to-br from-[#00C896]/6 to-transparent blur-[100px] pointer-events-none rounded-full" />

      {/* ── Hero Section ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-full px-4 py-1.5 mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
          <span className="text-xs font-semibold text-[#4A5568] tracking-wide">Brutally Honest · AI-Powered · Code-Level Analysis</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#1A202C] max-w-4xl">
          Know Exactly{' '}
          <span className="text-gradient">Where You Stand</span>
          {' '}as a Developer
        </h1>

        <p className="mt-6 text-lg md:text-xl text-[#4A5568] max-w-2xl leading-relaxed font-light">
          Deep-analyze your GitHub repos at the source-code level — authorship, complexity,
          security, and quality — then map your real skills to market demand. No guessing. No flattery.
        </p>

        <div className="flex items-center gap-4 mt-10">
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            id="hero-cta"
            className="bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-[#003882]/20 hover:shadow-2xl hover:shadow-[#003882]/30 hover:scale-[1.02] transition-all duration-200"
          >
            {isLoggedIn ? 'Go to Dashboard →' : 'Start Your Free Audit →'}
          </Link>
          <a
            href="#how-it-works"
            className="text-[#4A5568] font-semibold text-base px-6 py-4 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F0F4F8] hover:border-[#CBD5E0] transition-all duration-200 shadow-sm"
          >
            How it works
          </a>
        </div>

        <p className="mt-6 text-xs text-[#718096] flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Read-only access. We never write to your repositories.
        </p>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 -mt-12 mb-24">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '8+', label: 'Skill Dimensions', color: 'text-[#003882]' },
            { value: '50+', label: 'Quality Metrics', color: 'text-[#00A1E4]' },
            { value: 'AI', label: 'Powered Analysis', color: 'text-[#00C896]' },
            { value: '∞', label: 'Repos Supported', color: 'text-[#FFB800]' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-3xl md:text-4xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[#718096] font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A202C] tracking-tight">
            Enterprise-Grade Intelligence
          </h2>
          <p className="text-[#4A5568] mt-3 text-lg max-w-xl mx-auto">
            Every dimension of your engineering career, measured with code-level precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '🔬',
              title: 'AST Code Analysis',
              desc: 'Deep static analysis of your actual code patterns — API design, service layers, modularity, error handling, and security.',
              gradient: 'from-blue-50 to-sky-50',
              border: 'border-blue-100',
            },
            {
              icon: '🎯',
              title: 'Skill Verification',
              desc: '7 career dimensions assessed: Frontend, Backend, DevOps, Security, Testing, Database Design, and System Architecture.',
              gradient: 'from-emerald-50 to-green-50',
              border: 'border-emerald-100',
            },
            {
              icon: '📊',
              title: 'Market Intelligence',
              desc: 'Real-time salary analysis, role matching via Jooble API, and gap analysis showing which skills boost your compensation.',
              gradient: 'from-amber-50 to-yellow-50',
              border: 'border-amber-100',
            },
            {
              icon: '🎭',
              title: 'Playwright UI/UX Test',
              desc: 'Automated testing of your live deployments — responsiveness, accessibility, console errors, and interactive elements.',
              gradient: 'from-purple-50 to-violet-50',
              border: 'border-purple-100',
            },
            {
              icon: '📝',
              title: 'Resume Rewriting',
              desc: 'AI-powered resume bullet rewrites backed by verified code evidence. No empty claims — every statement is auditable.',
              gradient: 'from-rose-50 to-pink-50',
              border: 'border-rose-100',
            },
            {
              icon: '🗺️',
              title: '12-Week Roadmap',
              desc: 'Personalized growth plan with weekly milestones, curated resources, and skill gap prescriptions from Groq/Gemini AI.',
              gradient: 'from-cyan-50 to-teal-50',
              border: 'border-cyan-100',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`card-lift bg-gradient-to-br ${f.gradient} border ${f.border} rounded-2xl p-7 space-y-3`}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-lg font-bold text-[#1A202C]">{f.title}</h3>
              <p className="text-sm text-[#4A5568] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A202C] tracking-tight">
              Three Steps to Total Clarity
            </h2>
            <p className="text-[#4A5568] mt-3 text-lg max-w-xl mx-auto">
              From GitHub connect to full career intelligence in under 5 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect GitHub',
                desc: 'One-click OAuth with read-only access. Upload your resume to auto-detect repos and deployment links.',
                color: '#00A1E4',
              },
              {
                step: '02',
                title: 'AI Analyzes Code',
                desc: 'Deep AST analysis, security scanning, complexity classification, and Playwright UI testing happen in real-time.',
                color: '#003882',
              },
              {
                step: '03',
                title: 'Get Your Report',
                desc: 'Verified skill tiers, market fit analysis, salary insights, AI-rewritten resume, and a 12-week growth roadmap.',
                color: '#00C896',
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: s.color }}
                  >
                    {s.step}
                  </span>
                  <div className="h-px flex-1 bg-[#E2E8F0]" />
                </div>
                <h3 className="text-xl font-bold text-[#1A202C] mb-2">{s.title}</h3>
                <p className="text-sm text-[#4A5568] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="bg-gradient-to-br from-[#003882] to-[#00A1E4] rounded-3xl p-12 md:p-16 text-white shadow-2xl shadow-[#003882]/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm-22 22v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;)]" />
          <h2 className="text-3xl md:text-4xl font-extrabold relative z-10">
            Ready to Know the Truth?
          </h2>
          <p className="mt-4 text-white/80 text-lg max-w-lg mx-auto relative z-10">
            Get your verified skill profile, market position, and personalized growth plan — in minutes, not months.
          </p>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 mt-8 bg-white text-[#003882] font-bold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 relative z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            {isLoggedIn ? 'Go to Dashboard' : 'Audit My GitHub — Free'}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[#E2E8F0] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1A202C]">DevCareer Intelligence</span>
          </div>
          <p className="text-xs text-[#718096]">Brutally honest developer intelligence. Built for engineers, by engineers.</p>
        </div>
      </footer>
    </main>
  )
}
