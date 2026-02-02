'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertCircle, TrendingDown, Users, Upload } from 'lucide-react'

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
        alert('✅ Analyzed ' + json.data.length + ' customers across ' + json.analysis.industry + ' industry!')
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
  const totalRevenue = customers.reduce((a: number, c: any) => a + (c.clv || 0), 0)
  const totalLoss = customers.reduce((a: number, c: any) => a + (c.total_lost_revenue || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-bold text-white">🧠 Intelligent Retention Platform</h1>
          <p className="text-slate-400 mt-2">Universal Product Loss Detection & Industry-Specific Insights</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <form onSubmit={handleUpload} className="bg-gradient-to-r from-purple-900 to-purple-800 border border-purple-700 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Upload className="w-5 h-5" /> Universal Analyzer</h2>
              <p className="text-purple-200 text-sm mt-1">Upload ANY data format - AI detects industry & finds product losses</p>
            </div>
            <div className="flex gap-3">
              <input type="file" name="file" accept=".json,.csv" required className="px-4 py-2 rounded-lg bg-purple-800 text-white border border-purple-600 cursor-pointer" />
              <button type="submit" disabled={uploading} className="bg-white text-purple-900 px-6 py-2 rounded-lg font-bold hover:bg-purple-50 disabled:opacity-50">
                {uploading ? '⏳ Analyzing' : '🚀 Analyze'}
              </button>
            </div>
          </div>
        </form>

        {customers.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-300 text-lg">Upload data to see AI-powered industry analysis</p>
          </div>
        ) : (
          <>
            {insights && (
              <>
                <div className="grid grid-cols-5 gap-4 mb-8">
                  <div className="bg-blue-900 rounded-xl p-4 border border-blue-700">
                    <p className="text-blue-200 text-xs">Industry</p>
                    <p className="text-2xl font-bold text-white mt-2 capitalize">{insights.industry}</p>
                  </div>
                  <div className="bg-red-900 rounded-xl p-4 border border-red-700">
                    <p className="text-red-200 text-xs">High Risk</p>
                    <p className="text-2xl font-bold text-white mt-2">{insights.high_risk_customers}</p>
                  </div>
                  <div className="bg-orange-900 rounded-xl p-4 border border-orange-700">
                    <p className="text-orange-200 text-xs">Revenue Loss</p>
                    <p className="text-2xl font-bold text-white mt-2">£{(insights.total_lost_revenue/1000000).toFixed(2)}M</p>
                  </div>
                  <div className="bg-purple-900 rounded-xl p-4 border border-purple-700">
                    <p className="text-purple-200 text-xs">Avg Products Lost</p>
                    <p className="text-2xl font-bold text-white mt-2">{insights.avg_products_lost}</p>
                  </div>
                  <div className="bg-green-900 rounded-xl p-4 border border-green-700">
                    <p className="text-green-200 text-xs">Total CLV</p>
                    <p className="text-2xl font-bold text-white mt-2">£{(insights.total_clv/1000000).toFixed(2)}M</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4">🚨 Top Lost Products</h3>
                    <div className="space-y-2">
                      {insights.top_lost_products.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="bg-slate-900 rounded-lg p-3 flex justify-between">
                          <span className="text-white">{p.product}</span>
                          <span className="text-red-400 font-bold">£{(p.total_loss/1000000).toFixed(2)}M</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4">📋 Industry Recommendations</h3>
                    <div className="space-y-2">
                      {insights.industry_recommendations.slice(0, 4).map((r: string, i: number) => (
                        <div key={i} className="bg-slate-900 rounded-lg p-2 text-sm text-slate-300">✓ {r}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg mb-8">
                  <h3 className="text-lg font-bold text-white mb-4">🎯 Retention Priority (Top 5 Customers)</h3>
                  <div className="space-y-3">
                    {insights.retention_priority.map((c: any, i: number) => (
                      <div key={i} className="bg-slate-900 rounded-lg p-4 border-l-4 border-red-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-white">{i+1}. {c.customer}</p>
                            <p className="text-sm text-slate-400 mt-1">Risk: {c.risk.toFixed(1)}/100 | Revenue: £{(c.revenue_at_risk/1000).toFixed(0)}K</p>
                            <p className="text-xs text-red-400 mt-2">📦 Lost Products: {c.products_to_recover.join(', ')}</p>
                          </div>
                          <span className="bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm font-bold">URGENT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">📊 All Customers Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 border-b border-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-slate-300">Customer</th>
                          <th className="px-4 py-3 text-right text-slate-300">CLV</th>
                          <th className="px-4 py-3 text-center text-slate-300">Risk</th>
                          <th className="px-4 py-3 text-center text-slate-300">Products Lost</th>
                          <th className="px-4 py-3 text-right text-slate-300">Loss Value</th>
                          <th className="px-4 py-3 text-center text-slate-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.sort((a: any, b: any) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0)).slice(0, 15).map((c: any) => (
                          <tr key={c.customer_id} className="border-b border-slate-700 hover:bg-slate-900">
                            <td className="px-4 py-3 font-semibold text-white">{c.customer_id}</td>
                            <td className="px-4 py-3 text-right text-white">£{(c.clv || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${c.churn_risk_score >= 75 ? 'bg-red-900 text-red-200' : 'bg-orange-900 text-orange-200'}`}>
                                {c.churn_risk_score?.toFixed(0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-300">{c.products_lost || 0}</td>
                            <td className="px-4 py-3 text-right text-red-400">£{(c.total_lost_revenue || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">{c.trend_direction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
