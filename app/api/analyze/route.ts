import { NextRequest, NextResponse } from 'next/server'

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
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      data = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((h, i) => obj[h] = isNaN(Number(vals[i])) ? vals[i] : Number(vals[i]))
        return obj
      })
    }

    if (!data.length) return NextResponse.json({ error: 'No data' }, { status: 400 })

    const analysis = analyze(data)
    return NextResponse.json({ success: true, data: analysis.customers, analysis: analysis.insights })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function analyze(data: any[]) {
  const cols = Object.keys(data[0] || {})
  
  const schema: any = {
    id: cols.find(c => /customer|id|account/i.test(c)),
    value: cols.find(c => /spending|revenue|sales|amount/i.test(c)),
    trend: cols.find(c => /trend|change|growth/i.test(c)),
  }

  const valueCol = schema.value || cols[0]
  const values = data.map(r => parseFloat(r[valueCol] || 0)).filter(v => v > 0)
  const mean = values.length > 0 ? values.reduce((a,b) => a+b, 0) / values.length : 0
  const std = values.length > 0 ? Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length) : 0

  const customers = data.map((row: any, i: number) => {
    let risk = 0
    const val = parseFloat(row[valueCol] || 0)
    if (val < mean - std) risk += 25
    const trend = parseFloat(row[schema.trend] || 0)
    if (trend < -std) risk += 30
    
    return {
      customer_id: row[schema.id] || `CUST_${i}`,
      churn_risk_score: Math.min(100, Math.max(0, risk)),
      clv: val,
      days_until_churn: Math.max(10, 180 - (risk * 1.6)),
      business_type: 'Unknown',
      region: 'Unknown',
      products_lost: 0,
      lost_products_details: [],
      total_lost_revenue: 0,
      trend_direction: trend > 0 ? 'Growing' : trend < 0 ? 'Declining' : 'Stable'
    }
  })

  return { customers, insights: {} }
}
