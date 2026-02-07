'use client'

import { useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have access to this resource.',
    Verification: 'The verification link has expired or has already been used.',
    OAuthSignin: 'Error in the OAuth sign-in process.',
    OAuthCallback: 'Error in the OAuth callback.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Error in the callback handler.',
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    EmailSignin: 'Error sending the email.',
    CredentialsSignin: 'Invalid email or password.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An error occurred during authentication.',
  }

  const message = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/50 shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-300 mb-6">{message}</p>

          <div className="space-y-3">
            <a
              href="/auth/signin"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </a>
            <a
              href="/"
              className="block w-full bg-white/10 text-white py-3 px-4 rounded-lg font-semibold hover:bg-white/20 transition"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
