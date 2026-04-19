import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Navbar } from '@/components/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('github_username')
    .eq('id', userId)
    .single()

  if (!user?.github_username) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar username={user.github_username} />
      {children}
    </div>
  )
}
