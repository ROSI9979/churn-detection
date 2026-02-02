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

    const analysis = universalAnalyze(data)
    return NextResponse.json({ success: true, data: analysis.customers, analysis: analysis.insights })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function universalAnalyze(rawData: any[]) {
  const schema = detectEntities(rawData)
  const temporal = analyzeTimeline(rawData, schema)
  const productLosses = detectProductLoss(rawData, schema, temporal)
  const customers = generateCustomerInsights(rawData, schema, productLosses, temporal)
  const industry = detectIndustry(rawData, schema)
  const insights = generateIndustryInsights(customers, industry, schema)
  
  return { customers, insights }
}

function detectEntities(data: any[]) {
  const cols = Object.keys(data[0] || {})
  
  const patterns = {
    customer: /customer|account|id|user|entity|party|company|client|org|subscriber|patient|policy|shipper|agent|guest|student|member/i,
    product: /product|service|item|module|feature|sku|category|offering|part|course|room|route|content|policy|coverage|plan/i,
    value: /amount|spending|revenue|sales|value|total|price|cost|qty|quantity|volume|mrr|arr|premium|fare|fee/i,
    time: /date|month|year|period|quarter|week|day|timestamp|time/i,
    trend: /trend|change|growth|decline|delta|variance|increase|decrease|velocity/i,
    frequency: /frequency|count|volume|transaction|activity|engagement|usage|visits/i,
    status: /status|state|active|inactive|cancelled|suspended/i
  }
  
  const schema: any = {}
  for (const [key, pattern] of Object.entries(patterns)) {
    schema[key] = cols.find(c => pattern.test(c))
  }
  
  return schema
}

function analyzeTimeline(data: any[], schema: any) {
  if (!schema.time) return { periods: [], dateRange: null }
  
  const dates = data.map(r => parseDate(r[schema.time])).filter(d => d)
  const uniquePeriods = [...new Set(dates.map(d => d.period))]
  
  return {
    periods: uniquePeriods.sort(),
    dateRange: { start: uniquePeriods[0], end: uniquePeriods[uniquePeriods.length - 1] }
  }
}

function parseDate(dateVal: any) {
  if (!dateVal) return null
  const str = String(dateVal)
  const patterns = [
    { regex: /(\d{4})-(\d{1,2})/, format: 'YYYY-MM' },
    { regex: /(\d{1,2})\/(\d{4})/, format: 'MM/YYYY' },
    { regex: /(\d{4})\/(\d{1,2})/, format: 'YYYY/MM' },
    { regex: /^(\d{4})(\d{2})/, format: 'YYYYMM' }
  ]
  
  for (const p of patterns) {
    if (p.regex.test(str)) {
      return { period: str.substring(0, 7), original: dateVal }
    }
  }
  
  return { period: str, original: dateVal }
}

function detectProductLoss(data: any[], schema: any, temporal: any) {
  if (!schema.customer || !schema.product) return {}
  
  const customerProducts: any = {}
  
  data.forEach(row => {
    const cust = row[schema.customer]
    const prod = row[schema.product]
    const period = parseDate(row[schema.time])?.period || 'unknown'
    const val = parseFloat(row[schema.value] || 0)
    
    if (!customerProducts[cust]) customerProducts[cust] = {}
    if (!customerProducts[cust][prod]) customerProducts[cust][prod] = []
    
    customerProducts[cust][prod].push({ period, value: val })
  })
  
  const productLoss: any = {}
  
  for (const [cust, products] of Object.entries(customerProducts)) {
    productLoss[cust] = []
    
    for (const [prod, purchases] of Object.entries(products)) {
      const sortedPurchases = (purchases as any[]).sort((a, b) => a.period.localeCompare(b.period))
      const lastPeriod = sortedPurchases[sortedPurchases.length - 1]?.period
      const currentPeriod = temporal.periods[temporal.periods.length - 1]
      
      if (lastPeriod && currentPeriod && lastPeriod < currentPeriod) {
        const periodsSinceStop = temporal.periods.indexOf(currentPeriod) - temporal.periods.indexOf(lastPeriod)
        
        if (periodsSinceStop > 0) {
          productLoss[cust].push({
            product: prod,
            last_purchase: lastPeriod,
            periods_stopped: periodsSinceStop,
            total_value: (purchases as any[]).reduce((a, p) => a + p.value, 0),
            avg_monthly_value: (purchases as any[]).reduce((a, p) => a + p.value, 0) / (purchases as any[]).length
          })
        }
      }
    }
  }
  
  return productLoss
}

function generateCustomerInsights(data: any[], schema: any, productLosses: any, temporal: any) {
  const values = data.map(r => parseFloat(r[schema.value] || 0)).filter(v => v > 0)
  const mean = values.reduce((a,b) => a+b, 0) / values.length
  const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
  
  const custData: any = {}
  data.forEach(row => {
    const cust = row[schema.customer]
    if (!custData[cust]) custData[cust] = []
    custData[cust].push(row)
  })
  
  return Object.entries(custData).map(([custId, rows]: any) => {
    const values = rows.map((r: any) => parseFloat(r[schema.value] || 0))
    const total = values.reduce((a: number, b: number) => a + b, 0)
    const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0
    
    let risk = 0
    if (total < mean - std) risk += 25
    if (trend < 0) risk += 30
    if (productLosses[custId]?.length > 0) risk += 20 + (productLosses[custId].length * 5)
    
    const lostProducts = productLosses[custId] || []
    const totalLoss = lostProducts.reduce((a: number, p: any) => a + p.total_value, 0)
    
    return {
      customer_id: custId,
      churn_risk_score: Math.min(100, Math.max(0, risk)),
      clv: total,
      days_until_churn: Math.max(10, 180 - (risk * 1.6)),
      products_purchased: [...new Set(rows.map((r: any) => r[schema.product]))].length,
      products_lost: lostProducts.length,
      lost_products_details: lostProducts,
      total_lost_revenue: totalLoss,
      trend_direction: trend > 0 ? 'Growing' : trend < 0 ? 'Declining' : 'Stable'
    }
  })
}

function detectIndustry(data: any[], schema: any) {
  const products = data.map((r: any) => r[schema.product]?.toString().toLowerCase() || '')
  
  const industries: any = {
    retail: ['shoes', 'clothing', 'electronics', 'grocery', 'fashion', 'apparel'],
    saas: ['module', 'feature', 'subscription', 'plan', 'tier', 'addon', 'plugin'],
    telecom: ['voice', 'data', 'tv', 'broadband', 'service', 'line', 'minutes'],
    healthcare: ['therapy', 'checkup', 'surgery', 'treatment', 'visit', 'consultation'],
    insurance: ['policy', 'coverage', 'plan', 'insurance', 'protection'],
    manufacturing: ['part', 'material', 'component', 'unit', 'assembly'],
    finance: ['account', 'loan', 'card', 'deposit', 'investment', 'mortgage'],
    hospitality: ['room', 'suite', 'package', 'service', 'amenity']
  }
  
  let maxMatches = 0
  let detectedIndustry = 'unknown'
  
  for (const [ind, keywords] of Object.entries(industries)) {
    const matches = products.filter(p => keywords.some(k => p.includes(k))).length
    if (matches > maxMatches) {
      maxMatches = matches
      detectedIndustry = ind
    }
  }
  
  return detectedIndustry
}

function generateIndustryInsights(customers: any[], industry: string, schema: any) {
  const highRisk = customers.filter(c => c.churn_risk_score >= 75)
  const totalRevenue = customers.reduce((a, c) => a + c.clv, 0)
  const totalLoss = customers.reduce((a, c) => a + c.total_lost_revenue, 0)
  
  return {
    industry: industry,
    total_customers: customers.length,
    high_risk_customers: highRisk.length,
    total_clv: totalRevenue,
    total_lost_revenue: totalLoss,
    avg_products_per_customer: (customers.reduce((a, c) => a + c.products_purchased, 0) / customers.length).toFixed(1),
    avg_products_lost: (customers.reduce((a, c) => a + c.products_lost, 0) / customers.length).toFixed(1),
    top_lost_products: getTopLostProducts(customers),
    retention_priority: generateRetentionPriority(customers),
    industry_recommendations: getIndustryRecommendations(industry, customers)
  }
}

function getTopLostProducts(customers: any[]) {
  const products: any = {}
  customers.forEach(c => {
    c.lost_products_details.forEach((p: any) => {
      if (!products[p.product]) products[p.product] = { count: 0, loss: 0 }
      products[p.product].count++
      products[p.product].loss += p.total_value
    })
  })
  
  return Object.entries(products)
    .map(([name, data]: any) => ({ product: name, customers_lost: data.count, total_loss: data.loss }))
    .sort((a, b) => b.total_loss - a.total_loss)
    .slice(0, 10)
}

function generateRetentionPriority(customers: any[]) {
  return customers
    .sort((a, b) => (b.total_lost_revenue * b.churn_risk_score) - (a.total_lost_revenue * a.churn_risk_score))
    .slice(0, 5)
    .map(c => ({
      customer: c.customer_id,
      risk: c.churn_risk_score,
      revenue_at_risk: c.total_lost_revenue,
      products_to_recover: c.lost_products_details.map((p: any) => p.product)
    }))
}

function getIndustryRecommendations(industry: string, customers: any[]) {
  const recommendations: any = {
    retail: [
      'Launch product-specific campaigns for abandoned categories',
      'Analyze seasonality in product abandonment',
      'Test bundle offers combining popular products'
    ],
    saas: [
      'Identify feature usage patterns causing churn',
      'Create module-specific onboarding for at-risk accounts',
      'Offer module bundles at discounted rates'
    ],
    telecom: [
      'Analyze service bundling changes',
      'Detect service downgrade patterns',
      'Offer family plan upgrades'
    ],
    healthcare: [
      'Monitor care gaps in treatment plans',
      'Schedule preventive checkups for at-risk patients',
      'Offer wellness program bundles'
    ],
    insurance: [
      'Alert on coverage reduction patterns',
      'Cross-sell appropriate coverage gaps',
      'Offer loyalty discounts for multi-policy holders'
    ]
  }
  
  return recommendations[industry] || [
    'Create retention campaigns for at-risk customers',
    'Offer personalized bundles combining lost products',
    'Schedule follow-up calls within 48 hours'
  ]
}
