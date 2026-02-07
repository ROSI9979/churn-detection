'use client'

import { useSession, signOut } from 'next-auth/react'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-slate-900/50">
      <a href="/" className="text-2xl font-bold text-white">
        Churn Intelligence
      </a>

      <div className="flex gap-4 items-center">
        <a href="/dashboard" className="text-white hover:text-blue-400">
          Customer Churn
        </a>
        <a href="/product-churn" className="text-white hover:text-indigo-400">
          Product Churn
        </a>

        {status === 'loading' ? (
          <div className="w-20 h-10 bg-white/10 rounded-lg animate-pulse"></div>
        ) : session ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
            >
              <User className="w-4 h-4" />
              <span className="max-w-[120px] truncate">
                {session.user?.name || session.user?.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-white/10 py-2 z-50">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-white font-medium truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-gray-400 text-sm truncate">
                    {session.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <a href="/auth/signin">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Sign In
            </button>
          </a>
        )}
      </div>
    </nav>
  )
}
