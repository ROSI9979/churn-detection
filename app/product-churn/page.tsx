'use client'

import { useState } from 'react'
import { Upload, AlertTriangle, TrendingDown, Package, Phone, Percent, Download } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SEVERITY_COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  watch: '#3b82f6',
}

const CATEGORY_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

interface CategoryAlert {
  customer_id: string
  category: string
  signal_type: string
  severity: 'critical' | 'warning' | 'watch'
  baseline_quantity: number
  current_quantity: number
  drop_percentage: number
  weeks_since_last_order: number
  estimated_lost_revenue: number
  competitor_likely: boolean
  recommended_discount: number
  recommended_action: string
}

interface RetentionStrategy {
  priority: number
  customer_id: string
  category: string
  action: string
  discount: number
  potential_save: number
  competitor_type: string
  win_back_probability: number
}

interface AnalysisResult {
  alerts: CategoryAlert[]
  summary: {
    total_customers: number
    customers_with_alerts: number
    total_alerts: number
    critical_alerts: number
    warning_alerts: number
    watch_alerts: number
    total_estimated_monthly_loss: number
    categories_at_risk: string[]
    competitor_signals: number
  }
  recommendations: RetentionStrategy[]
}

export default function ProductChurnDashboard() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/product-churn', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (json.success) {
        setAnalysis(json)
      } else {
        alert('Error: ' + json.error)
      }
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setUploading(false)
    }
  }

  const exportCSV = () => {
    if (!analysis) return

    const headers = ['Customer', 'Category', 'Severity', 'Drop %', 'Lost Revenue', 'Discount', 'Action']
    const rows = analysis.alerts.map(a => [
      a.customer_id,
      a.category,
      a.severity,
      a.drop_percentage + '%',
      '£' + a.estimated_lost_revenue,
      a.recommended_discount + '%',
      a.recommended_action.replace(/,/g, ';'),
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'category-churn-alerts.csv'
    a.click()
  }

  // Build chart data
  const severityData = analysis ? [
    { name: 'Critical', value: analysis.summary.critical_alerts, color: SEVERITY_COLORS.critical },
    { name: 'Warning', value: analysis.summary.warning_alerts, color: SEVERITY_COLORS.warning },
    { name: 'Watch', value: analysis.summary.watch_alerts, color: SEVERITY_COLORS.watch },
  ] : []

  const categoryData = analysis
    ? analysis.summary.categories_at_risk.map((cat, i) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        alerts: analysis.alerts.filter(a => a.category === cat).length,
        loss: analysis.alerts.filter(a => a.category === cat).reduce((sum, a) => sum + a.estimated_lost_revenue, 0),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
    : []

  const filteredAlerts = analysis
    ? selectedCustomer
      ? analysis.alerts.filter(a => a.customer_id === selectedCustomer)
      : analysis.alerts
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Package className="w-8 h-8" />
                Product-Level Churn Detection
              </h1>
              <p className="text-indigo-200 mt-1">
                Detect which categories customers are buying elsewhere
              </p>
            </div>
            <div className="flex gap-3">
              <a href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">
                Customer Churn
              </a>
              {analysis && (
                <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Upload Section */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-2xl shadow-2xl p-8 mb-8 border border-indigo-600">
          <form onSubmit={handleUpload} className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Upload className="w-8 h-8" /> Upload Order History
              </h2>
              <p className="text-indigo-200 mt-2">
                CSV/JSON with: customer_id, product/category, quantity, value, date
              </p>
            </div>
            <div className="flex gap-4">
              <input
                type="file"
                name="file"
                accept=".json,.csv"
                required
                className="px-4 py-3 border-2 border-indigo-400 rounded-lg text-white bg-indigo-700"
              />
              <button
                type="submit"
                disabled={uploading}
                className="bg-white text-indigo-900 px-8 py-3 rounded-lg font-bold hover:bg-indigo-50 disabled:opacity-50"
              >
                {uploading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </form>
        </div>

        {analysis ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-6 gap-4 mb-8">
              <div className="bg-white bg-opacity-10 rounded-xl p-6 border border-indigo-500 text-white">
                <p className="text-indigo-300 text-sm">Customers</p>
                <p className="text-3xl font-bold mt-2">{analysis.summary.total_customers}</p>
              </div>
              <div className="bg-red-500 bg-opacity-20 rounded-xl p-6 border border-red-500 text-white">
                <p className="text-red-300 text-sm font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Critical
                </p>
                <p className="text-3xl font-bold mt-2">{analysis.summary.critical_alerts}</p>
              </div>
              <div className="bg-orange-500 bg-opacity-20 rounded-xl p-6 border border-orange-500 text-white">
                <p className="text-orange-300 text-sm font-bold">Warning</p>
                <p className="text-3xl font-bold mt-2">{analysis.summary.warning_alerts}</p>
              </div>
              <div className="bg-blue-500 bg-opacity-20 rounded-xl p-6 border border-blue-500 text-white">
                <p className="text-blue-300 text-sm font-bold">Watch</p>
                <p className="text-3xl font-bold mt-2">{analysis.summary.watch_alerts}</p>
              </div>
              <div className="bg-purple-500 bg-opacity-20 rounded-xl p-6 border border-purple-500 text-white">
                <p className="text-purple-300 text-sm font-bold">Monthly Loss</p>
                <p className="text-2xl font-bold mt-2">
                  £{(analysis.summary.total_estimated_monthly_loss / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="bg-cyan-500 bg-opacity-20 rounded-xl p-6 border border-cyan-500 text-white">
                <p className="text-cyan-300 text-sm font-bold">Competitor Signals</p>
                <p className="text-3xl font-bold mt-2">{analysis.summary.competitor_signals}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white bg-opacity-5 rounded-xl p-6 border border-indigo-500">
                <h3 className="text-white font-bold mb-4">Alerts by Severity</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white bg-opacity-5 rounded-xl p-6 border border-indigo-500">
                <h3 className="text-white font-bold mb-4">Revenue Loss by Category</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      formatter={(value: number) => ['£' + value.toFixed(0), 'Lost Revenue']}
                    />
                    <Bar dataKey="loss" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Actions */}
            <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-2xl p-8 mb-8 border border-green-600">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Phone className="w-8 h-8" /> Priority Retention Actions
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {analysis.recommendations.slice(0, 5).map((rec, i) => (
                  <div key={i} className="bg-black bg-opacity-20 rounded-lg p-6 flex items-start gap-6">
                    <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {rec.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-white font-bold text-lg">{rec.customer_id}</span>
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">
                          {rec.category}
                        </span>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                          <Percent className="w-3 h-3" /> {rec.discount}% off
                        </span>
                        <span className="text-green-400 text-sm">
                          {(rec.win_back_probability * 100).toFixed(0)}% win-back chance
                        </span>
                      </div>
                      <p className="text-green-100">{rec.action}</p>
                      <p className="text-green-400 mt-2 text-sm">
                        Potential monthly save: £{rec.potential_save.toFixed(0)} | Likely competitor: {rec.competitor_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Filter */}
            <div className="mb-4 flex items-center gap-4">
              <label className="text-white">Filter by customer:</label>
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value || null)}
                className="bg-indigo-800 text-white px-4 py-2 rounded-lg border border-indigo-500"
              >
                <option value="">All Customers</option>
                {[...new Set(analysis.alerts.map(a => a.customer_id))].map(cid => (
                  <option key={cid} value={cid}>{cid}</option>
                ))}
              </select>
              {selectedCustomer && (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-indigo-300 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Alerts Table */}
            <div className="bg-white bg-opacity-5 rounded-2xl p-8 border border-indigo-500 overflow-x-auto">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-400" /> Category Churn Alerts
              </h3>
              <table className="w-full text-white text-sm">
                <thead className="border-b border-indigo-500">
                  <tr>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-center py-3 px-4">Severity</th>
                    <th className="text-right py-3 px-4">Baseline Qty</th>
                    <th className="text-right py-3 px-4">Current Qty</th>
                    <th className="text-center py-3 px-4">Drop</th>
                    <th className="text-right py-3 px-4">Monthly Loss</th>
                    <th className="text-center py-3 px-4">Competitor?</th>
                    <th className="text-center py-3 px-4">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.slice(0, 20).map((alert, i) => (
                    <tr
                      key={i}
                      className="border-b border-indigo-500 border-opacity-30 hover:bg-indigo-500 hover:bg-opacity-10"
                    >
                      <td className="py-3 px-4 font-semibold">{alert.customer_id}</td>
                      <td className="py-3 px-4 capitalize">{alert.category}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-3 py-1 rounded font-bold text-xs"
                          style={{ backgroundColor: SEVERITY_COLORS[alert.severity] + '40', color: SEVERITY_COLORS[alert.severity] }}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{alert.baseline_quantity}</td>
                      <td className="py-3 px-4 text-right">{alert.current_quantity}</td>
                      <td className="py-3 px-4 text-center text-red-400 font-bold">
                        -{alert.drop_percentage}%
                      </td>
                      <td className="py-3 px-4 text-right text-orange-400">
                        £{alert.estimated_lost_revenue.toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {alert.competitor_likely ? (
                          <span className="text-red-400">Yes</span>
                        ) : (
                          <span className="text-gray-400">Maybe</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                          {alert.recommended_discount}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAlerts.length > 20 && (
                <p className="text-indigo-300 mt-4 text-center">
                  Showing 20 of {filteredAlerts.length} alerts. Export CSV for full data.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-16 text-center border border-indigo-500">
            <Package className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <p className="text-indigo-300 text-xl mb-4">Upload your order history to detect category-level churn</p>
            <p className="text-indigo-400 text-sm">
              Example: Your takeaway customer stopped ordering chicken (buying from Booker) but still orders cheese dips from you.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
