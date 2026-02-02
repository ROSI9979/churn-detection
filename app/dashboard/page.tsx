'use client'
import { useState, useEffect } from 'react'
import Upload from '@/components/Upload'

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers).finally(() => setLoading(false))
  }, [])

  if(loading) return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>

  const highRisk = customers.filter((c: any) => c.churn_risk_score >= 70).length
  const revenue = customers.reduce((a: number, c: any) => a + (c.clv || 0), 0)
  const avgRisk = customers.length ? customers.reduce((a: number, c: any) => a + c.churn_risk_score, 0) / customers.length : 0

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-2">📊 Customer Churn Intelligence</h1>
        <p className="text-gray-600 mb-8">Upload data and analyze customer churn</p>

        <Upload onLoad={setCustomers} />

        {customers.length > 0 && (
          <>
            <div className="grid grid-cols-6 gap-4 mb-8">
              <div className="card"><p className="text-gray-600 text-sm">Total Customers</p><p className="text-3xl font-bold text-blue-900 mt-2">{customers.length}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">🔴 At Risk</p><p className="text-3xl font-bold text-red-600 mt-2">{highRisk}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">💰 Revenue at Risk</p><p className="text-3xl font-bold text-red-600 mt-2">£{(revenue/1000000).toFixed(2)}M</p></div>
              <div className="card"><p className="text-gray-600 text-sm">⏰ Avg Days</p><p className="text-3xl font-bold text-blue-900 mt-2">{customers.length ? (customers.reduce((a: number, c: any) => a + c.days_until_churn, 0) / customers.length).toFixed(0) : 0}</p></div>
              <div className="card"><p className="text-gray-600 text-sm">🎯 Avg Risk</p><p className="text-3xl font-bold text-blue-900 mt-2">{avgRisk.toFixed(1)}/100</p></div>
              <div className="card"><p className="text-gray-600 text-sm">📈 Health</p><p className="text-3xl font-bold text-green-600 mt-2">✅ Good</p></div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4">Top Customers</h3>
              <div className="space-y-3">
                {customers.sort((a: any, b: any) => (b.clv || 0) - (a.clv || 0)).slice(0, 10).map((c: any, idx: number) => (
                  <div key={c.customer_id} className="flex justify-between pb-2 border-b">
                    <div><p className="font-semibold">{idx + 1}. {c.customer_id}</p><p className="text-sm text-gray-600">{c.business_type}</p></div>
                    <div className="text-right"><p className="font-bold text-red-600">£{(c.clv || 0).toLocaleString()}</p><p className="text-sm text-gray-600">Risk: {c.churn_risk_score?.toFixed(0)}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
