'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, UploadCloud, FolderGit2, FileText } from 'lucide-react'

export function AuditSubmissionForm({ username }: { username: string }) {
  const router = useRouter()
  // By default, suggest their primary page or start empty
  const [urls, setUrls] = useState<string[]>([''])
  const [branch, setBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [parseMsg, setParseMsg] = useState('')
  const [resumeText, setResumeText] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddUrl = () => setUrls([...urls, ''])
  const handleRemoveUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i))
  const handleUrlChange = (i: number, val: string) => {
    const newUrls = [...urls]
    newUrls[i] = val
    setUrls(newUrls)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.')
      return
    }

    setIsParsing(true)
    setError('')
    setParseMsg('')

    try {
      const formData = new FormData()
      formData.append('resume', file)

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse resume')

      const links: string[] = data.links || []
      if (links.length > 0) {
        // filter out empty slots and append new links uniquely
        const currentValidUrls = urls.filter(u => u.trim() !== '')
        const newSet = new Set([...currentValidUrls, ...links])
        setUrls(Array.from(newSet))
        setParseMsg(`Successfully extracted ${links.length} repository link(s) from resume!`)
      } else {
        setParseMsg('No GitHub repository links were found in the resume.')
      }

      if (data.text) {
        setResumeText(data.text)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsParsing(false)
      // reset input so the same file could be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const validUrls = urls.filter((u) => u.trim() !== '')

    try {
      const res = await fetch('/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_username: username,
          project_urls: validUrls.length > 0 ? validUrls : [`https://github.com/${username}`],
          resume_text: resumeText,
          target_branch: branch.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start audit')
      }

      if (data.session_id) {
        router.push(`/audit/${data.session_id}`)
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl bg-white border border-[#E2E8F0] p-8 rounded-[20px] shadow-md relative overflow-hidden font-sans">
      
      <div className="flex items-center space-x-4 mb-2 border-b border-[#E2E8F0] pb-5">
        <div className="p-2.5 bg-[#F0F4F8] rounded-lg border border-[#E2E8F0]">
          <FolderGit2 className="text-[#003882] w-5 h-5 flex-shrink-0" />
        </div>
        <div>
          <h2 className="text-[22px] font-semibold text-[#1A202C] tracking-tight leading-tight">Audit Target Configuration</h2>
          <p className="text-[#718096] text-sm font-medium mt-0.5">Automated technical intelligence extraction</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Identity Block */}
        <div>
          <label className="block text-[13px] font-medium text-[#4A5568] mb-1.5 flex justify-between">
            <span>Platform Identity</span>
            <span className="text-[#003882] text-[11px] uppercase tracking-widest font-bold">Authenticated</span>
          </label>
          <input
            type="text"
            value={username}
            readOnly
            className="w-full bg-[#F8F9FA] border border-[#E2E8F0] text-[#4A5568] rounded-xl px-4 py-3.5 focus:outline-none cursor-not-allowed font-mono text-sm leading-none"
          />
        </div>

        {/* Auto Parser Block */}
        <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#FAFBFC]">
          <label className="block text-[13px] font-medium text-[#4A5568] mb-2.5 flex items-center justify-between">
            <span>Parse Repositories via Resume PDF</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">Beta</span>
          </label>
          
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="w-full relative group overflow-hidden bg-white hover:bg-[#F0F4F8] border border-[#E2E8F0] border-dashed text-[#4A5568] rounded-xl px-4 py-8 transition duration-200 flex flex-col items-center justify-center space-y-3"
            >
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isParsing ? (
                <div className="bg-blue-50 p-3 rounded-full text-[#003882] animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="bg-[#F0F4F8] group-hover:bg-blue-50 p-3 rounded-full text-[#718096] group-hover:text-[#003882] transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
              )}
              <div className="text-center relative z-10">
                <span className="block text-sm font-medium text-[#1A202C]">{isParsing ? 'Parsing document struct...' : 'Click to Upload Resume'}</span>
                <span className="block text-[12px] text-[#718096] font-medium mt-1">We will detect and extract GitHub links automatically.</span>
              </div>
            </button>
            <input
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handlePdfUpload}
              className="hidden"
            />
          </div>
          {parseMsg && (
            <div className="mt-3 flex items-start space-x-2 text-[13px] text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-200">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{parseMsg}</span>
            </div>
          )}
        </div>

        {/* URLs Block */}
        <div>
          <label className="block text-[13px] font-medium text-[#4A5568] flex justify-between items-end mb-2">
            <span>Explicit Target Repositories</span>
          </label>
          <div className="space-y-2.5">
            {urls.map((url, i) => (
              <div key={i} className="flex relative items-center group">
                <div className="absolute left-4 text-[#718096] group-focus-within:text-[#003882] transition-colors">
                  <FolderGit2 size={16} />
                </div>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={url}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] text-[#1A202C] rounded-xl pl-[42px] pr-[50px] py-3.5 focus:border-[#003882]/50 focus:ring-1 focus:ring-[#003882]/50 focus:outline-none transition-all font-mono text-sm shadow-none"
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(i)}
                    className="absolute right-2 p-2 text-[#718096] hover:text-[#E2001A] hover:bg-red-50 rounded-md transition duration-200"
                    title="Remove Repository"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            className="text-[#003882] hover:text-[#00A1E4] hover:bg-blue-50 mt-3 inline-flex items-center space-x-1.5 transition duration-200 font-medium text-[13px] px-3 py-1.5 rounded-md"
          >
            <Plus size={14} /> <span>Add explicit repository</span>
          </button>
        </div>

        {/* Branch Overrides */}
        <div>
          <label className="block text-[13px] font-medium text-[#4A5568] mb-1.5">Branch Override Configuration</label>
          <input
            type="text"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full bg-white border border-[#E2E8F0] text-[#1A202C] rounded-xl px-4 py-3.5 focus:border-[#003882]/50 focus:ring-1 focus:ring-[#003882]/50 focus:outline-none placeholder:text-[#CBD5E0] font-mono text-sm transition-all shadow-none"
          />
          <p className="text-[12px] text-[#718096] mt-1.5 font-medium">Leave blank to default to main/master.</p>
        </div>

        {error && <div className="text-[#E2001A] text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-center font-medium">{error}</div>}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full relative group overflow-hidden bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white hover:from-[#003882] hover:to-[#00A1E4] active:from-[#002B66] active:to-[#008BC7] font-semibold text-[15px] py-4 px-6 rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2.5 text-white/60" size={18} />
          ) : null}
          <span>{loading ? 'Initializing Pipeline Vector...' : 'Start Extraction Engine'}</span>
        </button>
      </div>
    </form>
  )
}
