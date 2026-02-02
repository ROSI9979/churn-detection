'use client'

import { useState, useEffect } from 'react'
import FileUpload from '@/components/FileUpload'

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/customers')
        const data = await response.json()
        setCustomers(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDataLoaded = (newData: any[]) => {
    setCustomers(newData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const highRiskCount = customers.filter((c: any) => c.churn_risk_score >= 70).length
  const totalRevenue = customers.reduce((acc: number, c: any) => acc + (c.clv || 0), 0)
  const avgRisk = customers.length > 0 ? customers.reduce((acc: number, c: any) => acc + c.churn_risk_score, 0) / customers.length : 0

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">📊 Customer Churn Intelligence</h1>
          <p className="text-gray-600">Upload your data and analyze customer churn</p>
        </div>

        <FileUpload onDataLoaded={handleDataLoaded} />

        {customers.length > 0 && (
          <>
            <div className="grid grid-cols-6 gap-4 mb-8">
              <div className="card">
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{customers.length}</p>
              </div>
              <div className="card">
                <p className="text-gray-600 text-sm">🔴 At Risk</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{highRiskCount}</p>
                <p className="text-sm text-gray-600 mt-1">{((highRiskCount / customers.length) * 100).toFixed(1)}%</p>
              </div>
              <div className="card">
                <p className="text-gray-600 text-sm">💰 Revenue at Risk</p>
                <p className="text-3xl font-bold text-red-600 mt-2">£{(totalRevenue / 1000000).toFixed(2)}M</p>
              </div>
              <div className="card">
                <p className="text-gray-600 text-sm">⏰ Avg Days</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{customers.length > 0 ? (customers.reduce((acc: number, c: any) => acc + c.days_until_churn, 0) / customers.length).toFixed(0) : 0}</p>
              </div>
              <div className="card">
                <p className="text-gray-600 text-sm">🎯 Avg Risk</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{avgRisk.toFixed(1)}/100</p>
              </div>
              <div className="card">
                <p className="text-gray-600 text-sm">📈 Health</p>
                <p className="text-3xl font-bold text-green-600 mt-2">✅ Good</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4">Top Customers by Revenue</h3>
              <div className="space-y-3">
                {customers
                  .sort((a: any, b: any) => (b.clv || 0) - (a.clv || 0))
                  .slice(0, 10)
                  .map((customer: any, idx: number) => (
                    <div key={customer.customer_id} className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <p className="font-semibold">{idx + 1}. {customer.customer_id}</p>
                        <p className="text-sm text-gray-600">{customer.business_type || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">£{(customer.clv || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Risk: {customer.churn_risk_score?.toFixed(0) || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {customers.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No data loaded. Upload a JSON or CSV file to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
