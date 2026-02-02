'use client'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    try {
      const json = JSON.parse(text)
      const data = json.high_risk_customers || json
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      alert('Error: ' + err)
    }
  }

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-8">📊 Dashboard</h1>
        
        <div className="bg-green-100 p-6 rounded-lg mb-8 border-2 border-green-400">
          <h2 className="text-2xl font-bold mb-4">FILE UPLOAD TEST</h2>
          <input type="file" onChange={handleFile} className="p-4 border-2 border-green-400 rounded w-full" />
          <p className="mt-2 text-green-700">Loaded: {customers.length} customers</p>
        </div>

        {customers.length > 0 && (
          <div className="card">
            <h3>Customers</h3>
            {customers.slice(0, 5).map((c: any) => (
              <p key={c.customer_id}>{c.customer_id} - Risk: {c.churn_risk_score}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
