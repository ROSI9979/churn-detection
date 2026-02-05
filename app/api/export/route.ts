import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { data, format } = await request.json()
    
    if (format === 'csv') {
      const headers = Object.keys(data[0] || {})
      const csv = [
        headers.join(','),
        ...data.map((row: any) => headers.map(h => {
          const val = row[h]
          return typeof val === 'string' ? `"${val}"` : val
        }).join(','))
      ].join('\n')
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=churn-analysis.csv'
        }
      })
    }
    
    if (format === 'json') {
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
