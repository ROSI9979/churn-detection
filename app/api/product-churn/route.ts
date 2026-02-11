import { NextRequest, NextResponse } from 'next/server'
import { ProductLevelChurnEngine, Order } from './engine'

// Parse a CSV line handling quoted fields (commas inside quotes, escaped quotes)
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const text = await file.text()
    let orders: Order[] = []

    // Parse JSON or CSV
    if (file.name.endsWith('.json')) {
      const json = JSON.parse(text)
      orders = Array.isArray(json) ? json : json.orders || json.data || []
    } else if (file.name.endsWith('.csv')) {
      const lines = text.trim().split('\n')
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())

      // Identify which columns should be treated as numeric
      const numericHeaders = new Set<string>()
      for (const h of headers) {
        if (/quantity|qty|units|count|pieces|pcs|price|cost|amount|total|net|gross|vat|tax|discount|sum|revenue|sales/i.test(h)) {
          numericHeaders.add(h)
        }
      }

      orders = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const obj: Record<string, any> = {}

        headers.forEach((header, i) => {
          const val = values[i]
          if (numericHeaders.has(header)) {
            const num = parseFloat(val)
            obj[header] = isNaN(num) ? val : num
          } else {
            obj[header] = val
          }
        })

        return obj as Order
      })
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use .json or .csv' }, { status: 400 })
    }

    if (orders.length === 0) {
      return NextResponse.json({ error: 'No orders found in file' }, { status: 400 })
    }

    // Run analysis
    const engine = new ProductLevelChurnEngine()
    const analysis = engine.analyze(orders)

    return NextResponse.json({
      success: true,
      ...analysis,
    })
  } catch (error: any) {
    console.error('Product churn analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}
