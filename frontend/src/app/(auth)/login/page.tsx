import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to DevCareer Intelligence with your GitHub account',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] relative overflow-hidden flex items-center justify-center p-6">
      {/* Background decorations */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#00A1E4]/8 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gradient-to-tl from-[#003882]/5 to-transparent blur-[80px] pointer-events-none rounded-full" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1A202C] tracking-tight">
              DevCareer<span className="text-[#003882]">Intelligence</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 md:p-10 shadow-xl shadow-black/5">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-[#1A202C] tracking-tight">
              Start Your Audit
            </h1>
            <p className="text-[#4A5568] mt-2 text-sm leading-relaxed">
              Connect your GitHub account to begin the deep analysis of your code, skills, and career trajectory.
            </p>
          </div>

          <a
            id="github-login-btn"
            href="/api/auth/github"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white font-bold text-base py-4 px-6 rounded-2xl shadow-lg shadow-[#003882]/20 hover:shadow-xl hover:shadow-[#003882]/30 hover:scale-[1.02] transition-all duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </a>

          {/* Trust signals */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] space-y-3">
            {[
              { icon: '🔒', text: 'Read-only access — we never write to your repos' },
              { icon: '🛡️', text: 'Your code never leaves GitHub — we analyze via API' },
              { icon: '🚀', text: 'Full audit report generated in under 5 minutes' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs text-[#718096] font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#718096] mt-6">
          By connecting, you agree to our analysis of your public and authorized private repositories.
        </p>
      </div>
    </main>
  )
}
