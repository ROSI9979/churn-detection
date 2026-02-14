'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Upload, TrendingDown, Package, Download, Users, DollarSign, AlertTriangle, BarChart3, FileSpreadsheet, Clock, Eye, Trash2, ChevronRight } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from '@/components/Navbar'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e']

interface Analysis {
  id: string
  created_at: string
  file_name: string
  total_customers: number
  total_alerts: number
  critical_alerts: number
  warning_alerts: number
  watch_alerts: number
  total_monthly_loss: number
  competitor_signals: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [customers, setCustomers] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('history')

  // Fetch analysis history
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAnalyses()
    }
  }, [status])

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/analyses')
      const json = await res.json()
      if (json.analyses) {
        setAnalyses(json.analyses)
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const deleteAnalysis = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return

    try {
      const res = await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAnalyses(analyses.filter(a => a.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const viewAnalysis = async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`)
      const json = await res.json()
      if (json.analysis?.raw_data) {
        setCustomers(json.analysis.raw_data.alerts || [])
        setInsights(json.analysis.raw_data)
        setActiveTab('upload')
      }
    } catch (err) {
      console.error('Failed to load analysis:', err)
    }
  }

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
        fetchAnalyses() // Refresh history
      } else {
        alert('Error: ' + json.error)
      }
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setUploading(false)
    }
  }

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: customers, format })
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `churn-analysis.${format}`
      a.click()
    } catch (err) {
      alert('Export failed')
    }
  }

  const highRisk = customers.filter((c: any) => c.churn_risk_score >= 75).length
  const mediumRisk = customers.filter((c: any) => c.churn_risk_score >= 50 && c.churn_risk_score < 75).length
  const lowRisk = customers.filter((c: any) => c.churn_risk_score < 50).length
  const roi = insights?.roi_analysis || {}
  const productLoss = insights?.product_loss_analysis || []

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400">
                {session?.user?.email ? `Welcome, ${session.user.name || session.user.email}` : 'Your analysis history and insights'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            Analysis History
            {analyses.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'history' ? 'bg-white/20' : 'bg-violet-500/20 text-violet-400'
              }`}>
                {analyses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Upload className="w-4 h-4" />
            New Analysis
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/10">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your analysis history...</p>
              </div>
            ) : analyses.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-3xl p-16 text-center border border-white/10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">No Analysis History Yet</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-6">
                  Run your first analysis to see it saved here. All your analyses will be stored for future reference.
                </p>
                <button
                  onClick={() => router.push('/product-churn')}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                  Run Your First Analysis
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Recent Analyses</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{analysis.file_name}</p>
                          <p className="text-gray-500 text-sm">{formatDate(analysis.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-gray-500 text-xs">Customers</p>
                            <p className="text-white font-semibold">{analysis.total_customers}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 text-xs">Alerts</p>
                            <p className="text-white font-semibold">{analysis.total_alerts}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 text-xs">Critical</p>
                            <p className="text-red-400 font-semibold">{analysis.critical_alerts}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 text-xs">Loss/Month</p>
                            <p className="text-amber-400 font-semibold">£{Math.round(analysis.total_monthly_loss).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewAnalysis(analysis.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            title="View Analysis"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteAnalysis(analysis.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <>
            {/* Upload Section */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl">
              <form onSubmit={handleUpload}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                      Upload Customer Data
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Accepts CSV or JSON with customer metrics and transaction history
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="relative cursor-pointer px-6 py-3 rounded-xl border-2 border-dashed border-gray-600 hover:border-gray-500 bg-slate-800/50 transition-all">
                      <input
                        type="file"
                        name="file"
                        accept=".json,.csv"
                        required
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="flex items-center gap-2 text-gray-300">
                        <Upload className="w-5 h-5 text-blue-400" />
                        Choose File
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
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

            {customers.length > 0 && insights ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Users className="w-4 h-4" />
                      Customers
                    </div>
                    <p className="text-3xl font-bold text-white">{customers.length}</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30">
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      High Risk
                    </div>
                    <p className="text-3xl font-bold text-white">{highRisk}</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      Revenue Risk
                    </div>
                    <p className="text-2xl font-bold text-white">
                      £{((roi.revenue_at_risk || 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                      <TrendingDown className="w-4 h-4" />
                      Est. Saved
                    </div>
                    <p className="text-2xl font-bold text-white">
                      £{((roi.estimated_revenue_saved || 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/30">
                    <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                      <BarChart3 className="w-4 h-4" />
                      ROI
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {Math.min(500, (roi.roi_percentage || 0)).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'High Risk', value: highRisk, color: '#ef4444' },
                            { name: 'Medium Risk', value: mediumRisk, color: '#f59e0b' },
                            { name: 'Low Risk', value: lowRisk, color: '#22c55e' },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {[
                            { color: '#ef4444' },
                            { color: '#f59e0b' },
                            { color: '#22c55e' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-400 text-sm">High: {highRisk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-gray-400 text-sm">Medium: {mediumRisk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-400 text-sm">Low: {lowRisk}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Revenue by Risk Level</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={insights.charts?.revenue_by_risk || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" tickFormatter={(v) => `£${(v/1000)}K`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px'
                          }}
                          formatter={(value: number) => [`£${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          <Cell fill="#ef4444" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#22c55e" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Product Loss */}
                {productLoss.length > 0 && (
                  <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-red-500/20">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                        <Package className="w-6 h-6 text-red-400" />
                        Products at Risk
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportData('csv')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => exportData('json')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                        >
                          <Download className="w-4 h-4" />
                          JSON
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productLoss.slice(0, 6).map((p: any, i: number) => (
                        <div key={i} className="bg-slate-900/50 rounded-xl p-5 border border-white/5 hover:border-red-500/30 transition-all">
                          <p className="text-white font-semibold text-lg mb-3">{p.product}</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Customers affected</span>
                            <span className="text-red-400 font-medium">{p.customers_losing}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-400">Revenue loss</span>
                            <span className="text-amber-400 font-medium">£{(p.revenue_loss / 1000).toFixed(0)}K</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* High Risk Table */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                      High Risk Customers
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-slate-900/50">
                          <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Customer</th>
                          <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Risk Score</th>
                          <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Revenue</th>
                          <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Trend</th>
                          <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Loss Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.filter((c: any) => c.churn_risk_score >= 75).slice(0, 15).map((c: any, i: number) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-5 text-white font-medium">{c.customer_id}</td>
                            <td className="py-4 px-5 text-center">
                              <span className="px-3 py-1.5 rounded-lg font-semibold text-sm bg-red-500/20 text-red-400">
                                {c.churn_risk_score.toFixed(0)}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right text-gray-300">£{c.clv?.toLocaleString()}</td>
                            <td className="py-4 px-5 text-center text-amber-400">{c.trend_direction}</td>
                            <td className="py-4 px-5 text-right text-red-400 font-medium">
                              £{c.product_loss_revenue?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-3xl p-16 text-center border border-white/10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Upload Your Customer Data</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Analyze customer behavior and predict churn risk with AI-powered insights
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
