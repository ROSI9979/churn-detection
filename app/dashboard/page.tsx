'use client'

import { useState } from 'react'
import { Upload, TrendingDown, Package } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#ef4444', '#f59e0b', '#10b981']

export default function Dashboard() {
  const [customers, setCustomers] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/enterprise-analyze', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
        setInsights(json.analysis)
      } else {
        alert('❌ ' + json.error)
      }
    } catch (err) {
      alert('❌ Error: ' + err)
    } finally {
      setUploading(false)
    }
  }

  const highRisk = customers.filter((c: any) => c.churn_risk_score >= 75).length
  const roi = insights?.roi_analysis || {}
  const productLoss = insights?.product_loss_analysis || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-gradient-to-r from-purple-700 to-blue-700 text-white sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <h1 className="text-4xl font-bold">🏆 PLCAA Enterprise Edition</h1>
          <p className="text-purple-100 mt-2">Industry-Standard AI Churn Detection</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-gradient-to-r from-purple-800 to-blue-800 rounded-2xl shadow-2xl p-8 mb-8 border border-purple-600">
          <form onSubmit={handleUpload} className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Upload className="w-8 h-8" /> Enterprise Analysis
              </h2>
              <p className="text-purple-200 mt-2">Upload CSV/JSON - See Product Loss & Revenue Impact</p>
            </div>
            <div className="flex gap-4">
              <input type="file" name="file" accept=".json,.csv" required className="px-4 py-3 border-2 border-purple-400 rounded-lg text-white bg-purple-700" />
              <button type="submit" disabled={uploading} className="bg-white text-purple-900 px-8 py-3 rounded-lg font-bold">
                {uploading ? '⏳ Analyzing...' : '🚀 Analyze'}
              </button>
            </div>
          </form>
        </div>

        {customers.length > 0 && insights ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-white bg-opacity-10 rounded-xl shadow-lg p-6 border border-purple-500 text-white">
                <p className="text-purple-300 text-sm">Total Customers</p>
                <p className="text-4xl font-bold mt-3">{customers.length}</p>
              </div>
              <div className="bg-red-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-red-500 text-white">
                <p className="text-red-300 text-sm font-bold">🚨 High Risk</p>
                <p className="text-4xl font-bold mt-3">{highRisk}</p>
              </div>
              <div className="bg-orange-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-orange-500 text-white">
                <p className="text-orange-300 text-sm font-bold">💰 Revenue Risk</p>
                <p className="text-3xl font-bold mt-3">£{((roi.revenue_at_risk || 0) / 1000000).toFixed(1)}M</p>
              </div>
              <div className="bg-green-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-green-500 text-white">
                <p className="text-green-300 text-sm font-bold">💵 Est. Saved</p>
                <p className="text-3xl font-bold mt-3">£{((roi.estimated_revenue_saved || 0) / 1000000).toFixed(1)}M</p>
              </div>
              <div className="bg-blue-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-blue-500 text-white">
                <p className="text-blue-300 text-sm font-bold">📊 ROI</p>
                <p className="text-4xl font-bold mt-3">{(roi.roi_percentage || 0).toFixed(0)}%</p>
              </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Risk Distribution Pie Chart */}
              <div className="bg-white bg-opacity-5 rounded-xl shadow-lg p-6 border border-purple-500">
                <h3 className="text-white font-bold mb-4">Customer Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={insights.charts?.risk_distribution || []} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                      {(insights.charts?.risk_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue by Risk Bar Chart */}
              <div className="bg-white bg-opacity-5 rounded-xl shadow-lg p-6 border border-purple-500">
                <h3 className="text-white font-bold mb-4">Revenue Exposure by Risk</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insights.charts?.revenue_by_risk || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PRODUCT LOSS ANALYSIS */}
            <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-8 mb-8 border border-purple-500">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Package className="w-8 h-8 text-orange-400" /> 📦 Products Customers Are Losing
              </h3>
              {productLoss.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {productLoss.map((p: any, i: number) => (
                    <div key={i} className="bg-red-900 bg-opacity-20 rounded-lg p-6 border border-red-700">
                      <p className="text-white font-bold text-lg">{p.product}</p>
                      <p className="text-red-400 text-sm mt-3">
                        <span className="font-bold">{p.customers_losing}</span> customers losing this
                      </p>
                      <p className="text-red-400 text-sm mt-2">
                        <span className="font-bold">£{(p.revenue_loss / 1000).toFixed(0)}K</span> revenue loss
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-purple-300">No significant product losses detected</p>
              )}
            </div>

            {/* HIGH RISK CUSTOMERS WITH PRODUCT LOSS */}
            <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-8 border border-purple-500 overflow-x-auto">
              <h3 className="text-2xl font-bold text-white mb-6">👥 High Risk Customers & Their Losses</h3>
              <table className="w-full text-white text-sm">
                <thead className="border-b border-purple-500">
                  <tr>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-center py-3 px-4">Risk Score</th>
                    <th className="text-right py-3 px-4">Revenue (CLV)</th>
                    <th className="text-center py-3 px-4">Products Losing</th>
                    <th className="text-right py-3 px-4">Loss Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.filter((c: any) => c.churn_risk_score >= 75).slice(0, 15).map((c: any, i: number) => (
                    <tr key={i} className="border-b border-purple-500 border-opacity-30 hover:bg-purple-500 hover:bg-opacity-10">
                      <td className="py-3 px-4 font-semibold">{c.customer_id}</td>
                      <td className="py-3 px-4 text-center"><span className="bg-red-900 text-red-200 px-3 py-1 rounded font-bold">{c.churn_risk_score.toFixed(0)}</span></td>
                      <td className="py-3 px-4 text-right">£{c.clv.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">{(c.products_losing || []).length > 0 ? c.products_losing.join(', ') : 'None'}</td>
                      <td className="py-3 px-4 text-right text-red-400 font-bold">£{c.product_loss_revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-16 text-center border border-purple-500">
            <p className="text-purple-300 text-xl">👆 Upload your data to see product loss analysis & graphs</p>
          </div>
        )}
      </div>
    </div>
  )
}
