'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, LogOut } from 'lucide-react'

interface NavbarProps {
  username: string
}

export function Navbar({ username }: NavbarProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-base font-bold text-[#1A202C] tracking-tight hidden sm:block">
            DevCareer<span className="text-[#003882]">Intelligence</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#003882]/10 text-[#003882] shadow-sm'
                    : 'text-[#718096] hover:text-[#4A5568] hover:bg-[#F0F4F8]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 bg-white rounded-xl px-3 py-1.5 border border-[#E2E8F0]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-[#1A202C]">@{username}</span>
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#E2001A] font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </a>
        </div>
      </div>
    </nav>
  )
}
