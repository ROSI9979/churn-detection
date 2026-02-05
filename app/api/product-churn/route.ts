import { NextRequest, NextResponse } from 'next/server'
import { ProductLevelChurnEngine, Order } from './engine'

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
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      orders = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj: Record<string, any> = {}

        headers.forEach((header, i) => {
          const val = values[i]
          const num = parseFloat(val)
          obj[header] = isNaN(num) ? val : num
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
