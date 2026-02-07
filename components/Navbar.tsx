'use client'

import { useSession, signOut } from 'next-auth/react'
import { LogOut, User, ChevronDown, BarChart3, Package, Home, Settings } from 'lucide-react'
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
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Churn Intelligence
              </span>
              <p className="text-[10px] text-gray-500 -mt-1 tracking-wider uppercase">Analytics Platform</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/dashboard')
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Customer Churn
            </Link>
            <Link
              href="/product-churn"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/product-churn')
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-4 h-4" />
              Product Churn
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="w-32 h-10 bg-white/5 rounded-xl animate-pulse"></div>
            ) : session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    showDropdown
                      ? 'bg-white/10 ring-2 ring-emerald-500/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {(session.user?.name?.[0] || session.user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-white text-sm font-medium max-w-[120px] truncate">
                      {session.user?.name || 'User'}
                    </p>
                    <p className="text-gray-500 text-xs max-w-[120px] truncate">
                      {session.user?.email}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 py-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                      <p className="text-white font-semibold truncate">
                        {session.user?.name || 'User'}
                      </p>
                      <p className="text-gray-400 text-sm truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {}}
                        className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
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
                <button className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5">
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
