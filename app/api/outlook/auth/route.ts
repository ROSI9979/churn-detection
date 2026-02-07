import { NextResponse } from 'next/server'
import { ConfidentialClientApplication } from '@azure/msal-node'

const SCOPES = [
  'openid',
  'profile',
  'email',
  'Mail.Read',
  'offline_access',
]

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      error: 'Microsoft OAuth not configured. Please add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to .env.local'
    }, { status: 500 })
  }

  const msalConfig = {
    auth: {
      clientId,
      clientSecret,
      authority: 'https://login.microsoftonline.com/common',
    },
  }

  const cca = new ConfidentialClientApplication(msalConfig)
  const redirectUri = process.env.NEXTAUTH_URL + '/api/outlook/callback'

  const authUrl = await cca.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri,
  })

  return NextResponse.redirect(authUrl)
}
