import { NextRequest, NextResponse } from 'next/server'
import { EnterprisePLCAA } from './engine'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const text = await file.text()
    let data: any[] = []
    
    if (file.name.endsWith('.json')) {
      const json = JSON.parse(text)
      data = json.high_risk_customers || (Array.isArray(json) ? json : [])
    } else if (file.name.endsWith('.csv')) {
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      data = lines.slice(1).map((line, idx) => {
        const vals = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((h, i) => {
          const val = vals[i]
          // Try to parse as number
          const num = parseFloat(val)
          obj[h] = isNaN(num) ? val : num
        })
        return obj
      })
    }

    if (!data.length) return NextResponse.json({ error: 'No data parsed' }, { status: 400 })

    const engine = new EnterprisePLCAA()
    const analysis = engine.analyze(data)

    return NextResponse.json({ 
      success: true, 
      data: analysis.customers, 
      analysis: analysis.insights,
      debug: {
        total_rows: data.length,
        first_row: data[0],
        detected_columns: analysis.insights.detected_columns
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
