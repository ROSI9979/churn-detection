'use client'

import { useState } from 'react'

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const text = await file.text()
      
      let data
      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text)
        data = json.high_risk_customers || json
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(text)
      } else {
        setError('Only JSON and CSV files supported')
        setLoading(false)
        return
      }

      if (Array.isArray(data)) {
        onDataLoaded(data)
        setError('')
      } else {
        setError('Invalid data format')
      }
    } catch (err) {
      setError('Error parsing file: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const obj: any = {}
      headers.forEach((header, idx) => {
        obj[header] = isNaN(Number(values[idx])) ? values[idx] : Number(values[idx])
      })
      return obj
    })
  }

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-8 mb-8">
      <div className="flex flex-col items-center justify-center">
        <p className="text-2xl mb-4">📁 Upload Your Data</p>
        <p className="text-gray-600 mb-4">Drag & drop or click to upload JSON or CSV</p>
        
        <input
          type="file"
          accept=".json,.csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="cursor-pointer"
        />

        {error && <p className="text-red-600 mt-4">{error}</p>}
        {loading && <p className="text-blue-600 mt-4">Loading...</p>}
      </div>
    </div>
  )
}
