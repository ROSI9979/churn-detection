'use client'

import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers).finally(() => setLoading(false))
  }, [])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      
      if (json.success) {
        setCustomers(json.data)
        alert('✅ Loaded ' + json.count + ' customers!')
      } else {
        alert('❌ ' + json.error)
      }
    } catch (err) {
      alert('❌ Error: ' + err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="p-8"><p>Loading...</p></div>

  const highRisk = customers.filter((c: any) => c.churn_risk_score >= 70).length
  const revenue = customers.reduce((a: number, c: any) => a + (c.clv || 0), 0)
  const avgRisk = customers.length ? customers.reduce((a: number, c: any) => a + c.churn_risk_score, 0) / customers.length : 0

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-2">📊 Customer Churn Intelligence</h1>
        <p className="text-gray-600 mb-8">Upload and analyze customer churn data</p>

        <form onSubmit={handleUpload} className="bg-green-100 border-4 border-green-500 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">📁 UPLOAD FILE</h2>
          <input 
            type="file" 
            name="file"
            accept=".json,.csv"
            required
            className="block w-full p-4 border-2 border-green-500 rounded-lg cursor-pointer text-lg mb-4"
          />
          <button 
            type="submit" 
            disabled={uploading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload JSON or CSV'}
          </button>
          <p className="mt-4 text-green-700">Upload JSON or CSV file with customer data</p>
        </form>

        {customers.length > 0 && (
          <>
            <div className="grid grid-cols-6 gap-4 mb-8">
              <div className="card"><p className="text-gray-600 text-sm">Total</p><p className="text-3xl font-bold">{customers.length}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">🔴 Risk</p><p className="text-3xl font-bold text-red-600">{highRisk}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">💰 Revenue</p><p className="text-3xl font-bold text-red-600">£{(revenue/1000000).toFixed(2)}M</p></div>
              <div className="card"><p className="text-gray-600 text-sm">⏰ Days</p><p className="text-3xl font-bold">{customers.length ? (customers.reduce((a: number, c: any) => a + c.days_until_churn, 0) / customers.length).toFixed(0) : 0}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">🎯 Avg</p><p className="text-3xl font-bold">{avgRisk.toFixed(1)}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">📈 Status</p><p className="text-3xl font-bold text-green-600">✅</p></div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4">Top Customers</h3>
              {customers.sort((a: any, b: any) => (b.clv || 0) - (a.clv || 0)).slice(0, 10).map((c: any, i: number) => (
                <div key={c.customer_id} className="flex justify-between pb-2 border-b">
                  <div><p className="font-bold">{i+1}. {c.customer_id}</p><p className="text-sm text-gray-600">{c.business_type}</p></div>
                  <div className="text-right"><p className="font-bold text-red-600">£{(c.clv || 0).toLocaleString()}</p><p className="text-sm">Risk: {c.churn_risk_score?.toFixed(0)}</p></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
