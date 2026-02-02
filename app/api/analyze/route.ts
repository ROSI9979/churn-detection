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
  const cols = Object.keys(data[0])
  const schema = {
    id: cols.find(c => /customer|id|account/i.test(c)),
    value: cols.find(c => /spending|revenue|sales|amount/i.test(c)),
    trend: cols.find(c => /trend|change|growth/i.test(c)),
    volatility: cols.find(c => /volatility|variance/i.test(c)),
    frequency: cols.find(c => /frequency|count|volume/i.test(c)),
    recency: cols.find(c => /recency|recent|days/i.test(c)),
  }

  const values = data.map(r => parseFloat(r[schema.value] || 0)).filter(v => v > 0)
  const mean = values.reduce((a,b) => a+b, 0) / values.length
  const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)

  const customers = data.map((row: any, i: number) => {
    let risk = 0
    const val = parseFloat(row[schema.value] || 0)
    if (val < mean - std) risk += 25
    const trend = parseFloat(row[schema.trend] || 0)
    if (trend < -std) risk += 30
    const rec = parseFloat(row[schema.recency] || 0)
    if (rec > 90) risk += 25
    
    return {
      customer_id: row[schema.id] || `CUST_${i}`,
      churn_risk_score: Math.min(100, Math.max(0, risk)),
      clv: val,
      days_until_churn: Math.max(10, 180 - (risk * 1.6)),
      business_type: row.type || 'Unknown',
      region: row.region || 'Unknown'
    }
  })

  const highRisk = customers.filter(c => c.churn_risk_score >= 75)
  const revenue = customers.reduce((a, c) => a + c.clv, 0)
  const revenueRisk = highRisk.reduce((a, c) => a + c.clv, 0)

  return {
    customers,
    insights: {
      total: customers.length,
      high_risk: highRisk.length,
      revenue_at_risk: revenueRisk,
      total_revenue: revenue,
      avg_risk: (customers.reduce((a, c) => a + c.churn_risk_score, 0) / customers.length).toFixed(1)
    }
  }
}
