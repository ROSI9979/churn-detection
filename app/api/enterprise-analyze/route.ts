import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

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

    const tempFile = `/tmp/data_${Date.now()}.json`
    fs.writeFileSync(tempFile, JSON.stringify(data))

    const mlScriptPath = path.join(process.cwd(), 'enterprise_ml_engine.py')
    const { stdout } = await execAsync(`python3 ${mlScriptPath} ${tempFile}`, { maxBuffer: 10 * 1024 * 1024 })
    const analysis = JSON.parse(stdout)

    fs.unlinkSync(tempFile)

    return NextResponse.json({ success: true, data: analysis.customers, analysis: analysis.insights })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
