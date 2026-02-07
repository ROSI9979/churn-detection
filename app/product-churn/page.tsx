'use client'

import { useState } from 'react'
import { Upload, AlertTriangle, TrendingDown, Package, Phone, Percent, Download, FileSpreadsheet, Users, DollarSign, Eye, Target } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from '@/components/Navbar'

const SEVERITY_COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  watch: '#22c55e',
}

const SEVERITY_BG = {
  critical: 'from-red-500/20 to-red-600/10 border-red-500/30',
  warning: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  watch: 'from-green-500/20 to-green-600/10 border-green-500/30',
}

const CATEGORY_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

interface CategoryAlert {
  customer_id: string
  category: string
  products: string[]
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
  const [dragActive, setDragActive] = useState(false)

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

    const headers = ['Customer', 'Category', 'Products', 'Severity', 'Drop %', 'Lost Revenue', 'Discount', 'Action']
    const rows = analysis.alerts.map(a => [
      a.customer_id,
      a.category,
      (a.products || []).join('; '),
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
    a.download = 'product-churn-alerts.csv'
    a.click()
  }

  // Build chart data
  const severityData = analysis ? [
    { name: 'Critical', value: analysis.summary.critical_alerts, color: SEVERITY_COLORS.critical },
    { name: 'Warning', value: analysis.summary.warning_alerts, color: SEVERITY_COLORS.warning },
    { name: 'Watch', value: analysis.summary.watch_alerts, color: SEVERITY_COLORS.watch },
  ].filter(d => d.value > 0) : []

  const categoryData = analysis
    ? analysis.summary.categories_at_risk.slice(0, 8).map((cat, i) => ({
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Product Churn Detection</h1>
              <p className="text-gray-400">Identify products customers are buying from competitors</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl">
          <form onSubmit={handleUpload}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Upload Order History
                </h2>
                <p className="text-gray-400 text-sm">
                  Accepts CSV or JSON with columns: customer_id, product, quantity, value, date
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label
                  className={`relative cursor-pointer px-6 py-3 rounded-xl border-2 border-dashed transition-all ${
                    dragActive
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-slate-800/50'
                  }`}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={() => setDragActive(false)}
                >
                  <input
                    type="file"
                    name="file"
                    accept=".json,.csv"
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-gray-300">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    Choose File
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Analyzing...
                    </span>
                  ) : (
                    'Analyze'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {analysis ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Customers
                </div>
                <p className="text-3xl font-bold text-white">{analysis.summary.total_customers}</p>
              </div>

              <div className={`bg-gradient-to-br ${SEVERITY_BG.critical} backdrop-blur-xl rounded-2xl p-5 border`}>
                <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Critical
                </div>
                <p className="text-3xl font-bold text-white">{analysis.summary.critical_alerts}</p>
              </div>

              <div className={`bg-gradient-to-br ${SEVERITY_BG.warning} backdrop-blur-xl rounded-2xl p-5 border`}>
                <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                  <Eye className="w-4 h-4" />
                  Warning
                </div>
                <p className="text-3xl font-bold text-white">{analysis.summary.warning_alerts}</p>
              </div>

              <div className={`bg-gradient-to-br ${SEVERITY_BG.watch} backdrop-blur-xl rounded-2xl p-5 border`}>
                <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                  <Target className="w-4 h-4" />
                  Watch
                </div>
                <p className="text-3xl font-bold text-white">{analysis.summary.watch_alerts}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/30">
                <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Monthly Loss
                </div>
                <p className="text-2xl font-bold text-white">
                  £{(analysis.summary.total_estimated_monthly_loss / 1000).toFixed(1)}K
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
                  <TrendingDown className="w-4 h-4" />
                  Competitors
                </div>
                <p className="text-3xl font-bold text-white">{analysis.summary.competitor_signals}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Alerts by Severity</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {severityData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-400 text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue Loss by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `£${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px'
                      }}
                      formatter={(value: number) => [`£${value.toFixed(0)}`, 'Lost Revenue']}
                    />
                    <Bar dataKey="loss" radius={[0, 8, 8, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Actions */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/20 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                  <Phone className="w-6 h-6 text-emerald-400" />
                  Priority Retention Actions
                </h3>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <div className="space-y-4">
                {analysis.recommendations.slice(0, 5).map((rec, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-xl p-5 flex items-start gap-5 border border-white/5 hover:border-emerald-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0">
                      {rec.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-white font-semibold text-lg">{rec.customer_id}</span>
                        <span className="bg-slate-700 text-white px-3 py-1 rounded-lg text-sm capitalize">
                          {rec.category}
                        </span>
                        <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                          <Percent className="w-3 h-3" /> {rec.discount}% discount
                        </span>
                        <span className="text-emerald-400 text-sm font-medium">
                          {(rec.win_back_probability * 100).toFixed(0)}% win-back chance
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{rec.action}</p>
                      <p className="text-gray-500 mt-2 text-sm">
                        Potential save: <span className="text-emerald-400 font-medium">£{rec.potential_save.toFixed(0)}/month</span>
                        {' · '}Competitor: <span className="text-gray-400">{rec.competitor_type.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Filter */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-red-400" />
                All Churn Alerts
              </h3>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCustomer || ''}
                  onChange={(e) => setSelectedCustomer(e.target.value || null)}
                  className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-white/10 focus:border-emerald-500/50 focus:outline-none transition-all"
                >
                  <option value="">All Customers</option>
                  {[...new Set(analysis.alerts.map(a => a.customer_id))].sort().map(cid => (
                    <option key={cid} value={cid}>{cid}</option>
                  ))}
                </select>
                {selectedCustomer && (
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50">
                      <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Customer</th>
                      <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Category</th>
                      <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Products</th>
                      <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Severity</th>
                      <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Baseline</th>
                      <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Current</th>
                      <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Drop</th>
                      <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Loss/Month</th>
                      <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Competitor</th>
                      <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.slice(0, 25).map((alert, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-5 text-white font-medium">{alert.customer_id}</td>
                        <td className="py-4 px-5 text-gray-300 capitalize">{alert.category}</td>
                        <td className="py-4 px-5 text-gray-400 text-sm max-w-[200px] truncate" title={alert.products?.join(', ')}>
                          {alert.products?.slice(0, 2).join(', ')}
                          {alert.products?.length > 2 && <span className="text-gray-500"> +{alert.products.length - 2}</span>}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span
                            className="px-3 py-1.5 rounded-lg font-semibold text-xs uppercase tracking-wide"
                            style={{
                              backgroundColor: SEVERITY_COLORS[alert.severity] + '20',
                              color: SEVERITY_COLORS[alert.severity]
                            }}
                          >
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right text-gray-300">{alert.baseline_quantity.toFixed(1)}</td>
                        <td className="py-4 px-5 text-right text-gray-300">{alert.current_quantity.toFixed(1)}</td>
                        <td className="py-4 px-5 text-center">
                          <span className="text-red-400 font-semibold">-{alert.drop_percentage}%</span>
                        </td>
                        <td className="py-4 px-5 text-right text-amber-400 font-medium">
                          £{alert.estimated_lost_revenue.toFixed(0)}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {alert.competitor_likely ? (
                            <span className="text-red-400 font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-500">Maybe</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg text-sm font-medium">
                            {alert.recommended_discount}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAlerts.length > 25 && (
                <div className="px-5 py-4 border-t border-white/5 text-center">
                  <p className="text-gray-400 text-sm">
                    Showing 25 of {filteredAlerts.length} alerts ·
                    <button onClick={exportCSV} className="text-emerald-400 ml-1 hover:underline">Export all to CSV</button>
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-3xl p-16 text-center border border-white/10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Upload Your Order History</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Detect which product categories your customers are buying from competitors like Booker, Costco, or Farm Foods
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 text-sm">customer_id</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 text-sm">product_name</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 text-sm">quantity</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 text-sm">value</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 text-sm">date</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
