'use client'

import { useSession, signOut } from 'next-auth/react'
import { LogOut, ChevronDown, Package, Home, Settings, Mail, TrendingUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/30 transition-shadow">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                RetainIQ
              </span>
              <p className="text-[10px] text-slate-600 -mt-0.5 tracking-wider uppercase">Revenue Recovery</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              href="/product-churn"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/product-churn')
                  ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Package className="w-4 h-4" />
              Lost Product Detection
            </Link>
            {session && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/dashboard')
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Settings className="w-4 h-4" />
                Dashboard
              </Link>
            )}
{/* Email Import - Hidden for now
            <Link
              href="/email-import"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/email-import')
                  ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email Import
            </Link>
            */}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="w-32 h-10 bg-white/[0.04] rounded-xl animate-pulse"></div>
            ) : session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    showDropdown
                      ? 'bg-white/[0.08] ring-2 ring-violet-500/50'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {(session.user?.name?.[0] || session.user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-white text-sm font-medium max-w-[120px] truncate">
                      {session.user?.name || 'User'}
                    </p>
                    <p className="text-slate-500 text-xs max-w-[120px] truncate">
                      {session.user?.email}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#1a1f36]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] py-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
                      <p className="text-white font-semibold truncate">
                        {session.user?.name || 'User'}
                      </p>
                      <p className="text-slate-400 text-sm truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {}}
                        className="w-full px-4 py-2.5 text-left text-slate-300 hover:bg-white/[0.04] flex items-center gap-3 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        Settings
                      </button>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/signin">
                <button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all hover:-translate-y-0.5">
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
