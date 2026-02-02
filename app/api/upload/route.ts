import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    let data

    if (file.name.endsWith('.json')) {
      const json = JSON.parse(text)
      data = json.high_risk_customers || (Array.isArray(json) ? json : [])
    } else if (file.name.endsWith('.csv')) {
      data = parseCSV(text)
    } else {
      return NextResponse.json({ error: 'Only JSON and CSV supported' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed: ' + error }, { status: 500 })
  }
}

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const obj: any = {}
    headers.forEach((header, idx) => {
      const val = values[idx]
      obj[header] = isNaN(Number(val)) ? val : Number(val)
    })
    return obj
  })
}
