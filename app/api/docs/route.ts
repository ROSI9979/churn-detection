import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'PLCAA Enterprise API',
    version: '1.0.0',
    endpoints: {
      analyze: {
        method: 'POST',
        path: '/api/enterprise-analyze',
        description: 'Analyze customer churn with product-level detection'
      },
      export: {
        method: 'POST',
        path: '/api/export',
        description: 'Export analysis results (CSV/JSON)'
      }
    }
  })
}
