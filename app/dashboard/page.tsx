'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertCircle, TrendingDown, Upload, Package, Users, DollarSign, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
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
      const res = await fetch('/api/intelligent-analyze', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
        setInsights(json.analysis)
        alert('✅ Analyzed ' + json.data.length + ' customers!')
      } else {
        alert('❌ ' + json.error)
      }
    } catch (err) {
      alert('❌ Error: ' + err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-900"><p className="text-white text-2xl">📊 Loading...</p></div>

  const highRisk = customers.filter((c: any) => c.churn_risk_score >= 75).length
  const mediumRisk = customers.filter((c: any) => c.churn_risk_score >= 50 && c.churn_risk_score < 75).length
  const lowRisk = customers.filter((c: any) => c.churn_risk_score < 50).length
  const totalRevenue = customers.reduce((a: number, c: any) => a + (c.clv || 0), 0)
  const revenueAtRisk = customers.filter((c: any) => c.churn_risk_score >= 75).reduce((a: number, c: any) => a + (c.clv || 0), 0)
  const avgRisk = customers.length ? customers.reduce((a: number, c: any) => a + c.churn_risk_score, 0) / customers.length : 0
  const retention = 100 - avgRisk

  const riskDistribution = [
    { name: 'High Risk (75+)', value: highRisk, fill: '#dc2626' },
    { name: 'Medium Risk (50-75)', value: mediumRisk, fill: '#f59e0b' },
    { name: 'Low Risk (<50)', value: lowRisk, fill: '#10b981' }
  ]

  const topCustomers = customers.sort((a: any, b: any) => (b.clv || 0) - (a.clv || 0)).slice(0, 10)
  const riskByRevenue = topCustomers.map((c: any) => ({ name: c.customer_id, risk: c.churn_risk_score, revenue: c.clv || 0 }))

  const revenueTrend = [
    { name: 'High Risk', value: revenueAtRisk },
    { name: 'At Risk', value: customers.filter((c: any) => c.churn_risk_score >= 50 && c.churn_risk_score < 75).reduce((a: number, c: any) => a + (c.clv || 0), 0) },
    { name: 'Healthy', value: customers.filter((c: any) => c.churn_risk_score < 50).reduce((a: number, c: any) => a + (c.clv || 0), 0) }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white">📊 Customer Churn Intelligence</h1>
              <p className="text-slate-400 mt-2">AI-Powered Revenue Retention Analytics</p>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm">Last Updated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <form onSubmit={handleUpload} className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Customer Data</h2>
              <p className="text-blue-200 text-sm mt-1">Import JSON or CSV file to update analytics</p>
            </div>
            <div className="flex gap-3">
              <input type="file" name="file" accept=".json,.csv" required className="px-4 py-2 rounded-lg bg-blue-800 text-white border border-blue-600 cursor-pointer" />
              <button type="submit" disabled={uploading} className="bg-white text-blue-900 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2">
                {uploading ? '⏳' : '📤'} {uploading ? 'Uploading' : 'Upload'}
              </button>
            </div>
          </div>
        </form>

        {customers.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-300 text-lg">Upload data to see analytics</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold">Total Customers</p>
                    <p className="text-4xl font-bold text-white mt-2">{customers.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-200 text-sm font-semibold">High Risk</p>
                    <p className="text-4xl font-bold text-white mt-2">{highRisk}</p>
                    <p className="text-red-300 text-xs mt-2">{((highRisk/customers.length)*100).toFixed(1)}% of base</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-red-400 opacity-20" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-200 text-sm font-semibold">Revenue at Risk</p>
                    <p className="text-3xl font-bold text-white mt-2">£{(revenueAtRisk/1000000).toFixed(2)}M</p>
                    <p className="text-orange-300 text-xs mt-2">{((revenueAtRisk/totalRevenue)*100).toFixed(1)}% of total</p>
                  </div>
                  <TrendingDown className="w-12 h-12 text-orange-400 opacity-20" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm font-semibold">Retention Rate</p>
                    <p className="text-4xl font-bold text-white mt-2">{retention.toFixed(1)}%</p>
                    <p className="text-green-300 text-xs mt-2">Portfolio Health</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-400 opacity-20" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Customer Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Revenue Exposure by Risk Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Top 10 Customers: Risk vs Revenue</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskByRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="risk" fill="#ef4444" name="Risk Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Risk Metrics Summary</h3>
                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-300">Average Risk Score</span>
                      <span className="text-2xl font-bold text-orange-400">{avgRisk.toFixed(1)}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${avgRisk}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-red-900 bg-opacity-30 rounded-lg p-3 border border-red-700">
                      <p className="text-red-300 text-xs">HIGH RISK</p>
                      <p className="text-2xl font-bold text-red-400">{highRisk}</p>
                    </div>
                    <div className="bg-orange-900 bg-opacity-30 rounded-lg p-3 border border-orange-700">
                      <p className="text-orange-300 text-xs">MEDIUM RISK</p>
                      <p className="text-2xl font-bold text-orange-400">{mediumRisk}</p>
                    </div>
                    <div className="bg-green-900 bg-opacity-30 rounded-lg p-3 border border-green-700">
                      <p className="text-green-300 text-xs">LOW RISK</p>
                      <p className="text-2xl font-bold text-green-400">{lowRisk}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 mt-4">
                    <p className="text-slate-400 text-xs mb-2">TOTAL REVENUE</p>
                    <p className="text-3xl font-bold text-white">£{(totalRevenue/1000000).toFixed(2)}M</p>
                  </div>
                </div>
              </div>
            </div>

            {insights && insights.top_lost_products && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-400" /> 📦 Top Products Customers STOPPED Buying
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {insights.top_lost_products.slice(0, 10).map((p: any, i: number) => (
                    <div key={i} className="bg-red-900 bg-opacity-20 rounded-lg p-4 border border-red-700">
                      <p className="text-white font-bold">{p.product}</p>
                      <p className="text-red-400 text-sm mt-2">
                        <span className="font-bold">{p.customers_lost}</span> customers lost | 
                        <span className="font-bold ml-2">£{(p.total_loss/1000000).toFixed(2)}M</span> loss
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">🚨 Top 15 Customers - Intervention Required</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300">Rank</th>
                      <th className="px-4 py-3 text-left text-slate-300">Customer ID</th>
                      <th className="px-4 py-3 text-left text-slate-300">Type</th>
                      <th className="px-4 py-3 text-right text-slate-300">Annual Value</th>
                      <th className="px-4 py-3 text-center text-slate-300">Risk Score</th>
                      <th className="px-4 py-3 text-center text-slate-300">Products Lost</th>
                      <th className="px-4 py-3 text-center text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.sort((a: any, b: any) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0)).slice(0, 15).map((c: any, i: number) => (
                      <tr key={c.customer_id} className="border-b border-slate-700 hover:bg-slate-900 transition">
                        <td className="px-4 py-3 text-slate-300">#{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-white">{c.customer_id}</td>
                        <td className="px-4 py-3 text-slate-300">{c.business_type || 'N/A'}</td>
                        <td className="px-4 py-3 text-right text-white">£{(c.clv || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.churn_risk_score >= 75 ? 'bg-red-900 text-red-200' : 'bg-orange-900 text-orange-200'}`}>
                            {c.churn_risk_score?.toFixed(0) || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-orange-400 font-semibold">{c.products_lost || 0}</td>
                        <td className="px-4 py-3 text-center">
                          {c.churn_risk_score >= 75 ? '🔴 Critical' : '🟠 Warning'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
