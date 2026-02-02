'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingDown, AlertCircle, Users, TrendingUp, Download, Upload } from 'lucide-react'

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
      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
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

  const riskDistribution = [
    { name: 'High Risk', value: highRisk, fill: '#dc2626' },
    { name: 'Medium Risk', value: mediumRisk, fill: '#f59e0b' },
    { name: 'Low Risk', value: lowRisk, fill: '#10b981' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-bold text-white">📊 Churn Intelligence</h1>
          <p className="text-slate-400 mt-2">Smart Pattern Detection & Risk Analysis</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <form onSubmit={handleUpload} className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Upload className="w-5 h-5" /> Smart Analysis</h2>
              <p className="text-blue-200 text-sm mt-1">Upload JSON/CSV - AI will detect patterns & calculate risk</p>
            </div>
            <div className="flex gap-3">
              <input type="file" name="file" accept=".json,.csv" required className="px-4 py-2 rounded-lg bg-blue-800 text-white border border-blue-600 cursor-pointer" />
              <button type="submit" disabled={uploading} className="bg-white text-blue-900 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 disabled:opacity-50">
                {uploading ? '⏳ Analyzing' : '🚀 Analyze'}
              </button>
            </div>
          </div>
        </form>

        {customers.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-300 text-lg">Upload your data to see AI-powered insights</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <p className="text-slate-400 text-sm">Total Customers</p>
                <p className="text-4xl font-bold text-white mt-2">{customers.length}</p>
              </div>
              <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-xl p-6 shadow-lg">
                <p className="text-red-200 text-sm">High Risk (75+)</p>
                <p className="text-4xl font-bold text-white mt-2">{highRisk}</p>
                <p className="text-red-300 text-xs mt-2">{((highRisk/customers.length)*100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-700 rounded-xl p-6 shadow-lg">
                <p className="text-orange-200 text-sm">Revenue at Risk</p>
                <p className="text-3xl font-bold text-white mt-2">£{(revenueAtRisk/1000000).toFixed(2)}M</p>
              </div>
              <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-xl p-6 shadow-lg">
                <p className="text-green-200 text-sm">Avg Risk Score</p>
                <p className="text-4xl font-bold text-white mt-2">{avgRisk.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                      {riskDistribution.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">🤖 AI Insights</h3>
                <div className="space-y-3">
                  <div className="bg-slate-900 rounded-lg p-3 border-l-4 border-red-500">
                    <p className="text-red-300 text-sm">🚨 {highRisk} customers at critical risk</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border-l-4 border-orange-500">
                    <p className="text-orange-300 text-sm">📊 £{(revenueAtRisk/1000000).toFixed(2)}M revenue exposure</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border-l-4 border-blue-500">
                    <p className="text-blue-300 text-sm">📈 Pattern detected: {mediumRisk} medium risk accounts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">🚨 Top At-Risk Customers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300">ID</th>
                      <th className="px-4 py-3 text-right text-slate-300">Value (£)</th>
                      <th className="px-4 py-3 text-center text-slate-300">Risk Score</th>
                      <th className="px-4 py-3 text-center text-slate-300">Days to Churn</th>
                      <th className="px-4 py-3 text-center text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.sort((a: any, b: any) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0)).slice(0, 10).map((c: any) => (
                      <tr key={c.customer_id} className="border-b border-slate-700 hover:bg-slate-900">
                        <td className="px-4 py-3 font-semibold text-white">{c.customer_id}</td>
                        <td className="px-4 py-3 text-right text-white">£{(c.clv || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.churn_risk_score >= 75 ? 'bg-red-900 text-red-200' : 'bg-orange-900 text-orange-200'}`}>
                            {c.churn_risk_score?.toFixed(0) || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">{Math.round(c.days_until_churn || 0)}</td>
                        <td className="px-4 py-3 text-center">{c.churn_risk_score >= 75 ? '🔴 Critical' : '🟠 Warning'}</td>
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
