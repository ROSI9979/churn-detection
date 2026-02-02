import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const json = JSON.parse(text)
    const data = json.high_risk_customers || (Array.isArray(json) ? json : [])

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed: ' + error }, { status: 500 })
  }
}
