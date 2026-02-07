import { NextRequest, NextResponse } from 'next/server'
import { ConfidentialClientApplication } from '@azure/msal-node'
import { cookies } from 'next/headers'

const SCOPES = [
  'openid',
  'profile',
  'email',
  'Mail.Read',
  'offline_access',
]

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(new URL('/email-import?error=' + error, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/email-import?error=no_code', request.url))
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/email-import?error=not_configured', request.url))
  }

  try {
    const msalConfig = {
      auth: {
        clientId,
        clientSecret,
        authority: 'https://login.microsoftonline.com/common',
      },
    }

    const cca = new ConfidentialClientApplication(msalConfig)
    const redirectUri = process.env.NEXTAUTH_URL + '/api/outlook/callback'

    const tokenResponse = await cca.acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri,
    })

    // Store access token in a secure cookie
    const cookieStore = await cookies()
    cookieStore.set('outlook_token', tokenResponse.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour (access token expires)
    })

    // Store account info
    if (tokenResponse.account) {
      cookieStore.set('outlook_account', JSON.stringify({
        email: tokenResponse.account.username,
        name: tokenResponse.account.name,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return NextResponse.redirect(new URL('/email-import?connected=true', request.url))
  } catch (err: any) {
    console.error('Token exchange error:', err)
    return NextResponse.redirect(new URL('/email-import?error=token_error', request.url))
  }
}
