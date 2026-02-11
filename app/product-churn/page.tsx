'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Upload, AlertTriangle, TrendingDown, Package, Phone, Percent, Download,
  FileSpreadsheet, Users, DollarSign, Eye, Target, ArrowUpRight, ArrowDownRight,
  ChevronRight, Clock, Shield, Zap, BarChart3, Activity, Flame, Filter,
  X, CheckCircle2, AlertCircle, Info
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend, AreaChart, Area
} from 'recharts'
import Navbar from '@/components/Navbar'

// ─── Color Palette ───────────────────────────────────────────────────────────
const COLORS = {
  critical: { main: '#ff4757', bg: 'rgba(255,71,87,0.12)', glow: 'rgba(255,71,87,0.3)' },
  warning:  { main: '#ffa502', bg: 'rgba(255,165,2,0.12)', glow: 'rgba(255,165,2,0.3)' },
  watch:    { main: '#2ed573', bg: 'rgba(46,213,115,0.12)', glow: 'rgba(46,213,115,0.3)' },
  accent:   { main: '#7c5cfc', bg: 'rgba(124,92,252,0.12)', glow: 'rgba(124,92,252,0.3)' },
  info:     { main: '#1e90ff', bg: 'rgba(30,144,255,0.12)', glow: 'rgba(30,144,255,0.3)' },
}

const CHART_PALETTE = ['#7c5cfc', '#1e90ff', '#2ed573', '#ffa502', '#ff4757', '#ff6b81', '#70a1ff', '#5352ed']

const URGENCY_CONFIG = {
  call_today:     { label: 'CALL TODAY', color: '#ff4757', bg: 'bg-red-500/15 border-red-500/30', icon: Flame, pulse: true },
  call_this_week: { label: 'THIS WEEK', color: '#ffa502', bg: 'bg-amber-500/15 border-amber-500/30', icon: Clock, pulse: false },
  monitor:        { label: 'MONITOR', color: '#64748b', bg: 'bg-slate-500/15 border-slate-500/30', icon: Eye, pulse: false },
}

const REASON_CONFIG = {
  competitor:       { label: 'Competitor', color: '#ff4757', bg: 'bg-red-500/15', icon: '⚔️' },
  product_switch:   { label: 'Switched', color: '#1e90ff', bg: 'bg-blue-500/15', icon: '🔄' },
  business_decline: { label: 'Declining', color: '#ffa502', bg: 'bg-amber-500/15', icon: '📉' },
  unknown:          { label: 'Unknown', color: '#64748b', bg: 'bg-slate-500/15', icon: '❓' },
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface CategoryAlert {
  customer_id: string
  product_name: string
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
  churn_reason?: 'competitor' | 'product_switch' | 'business_decline' | 'unknown'
  recommended_discount: number
  recommended_action: string
}

interface RetentionStrategy {
  priority: number
  customer_id: string
  product_name: string
  category: string
  action: string
  discount: number
  potential_save: number
  competitor_type: string
  win_back_probability: number
}

interface CustomerActionSummary {
  customer_id: string
  priority_score: number
  priority_rank: number
  total_monthly_loss: number
  competitor_loss: number
  customer_monthly_spend: number
  customer_health: 'healthy' | 'declining' | 'stopped'
  spend_change_pct: number
  alerts_count: number
  competitor_alerts: number
  top_lost_products: string[]
  recommended_action: string
  urgency: 'call_today' | 'call_this_week' | 'monitor'
}

interface AnalysisResult {
  alerts: CategoryAlert[]
  action_list?: CustomerActionSummary[]
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

// ─── Animated Number Component ───────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 1200 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; duration?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>
}

// ─── Score Ring Component ────────────────────────────────────────────────────
function ScoreRing({ score, size = 48, strokeWidth = 4 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 70 ? '#ff4757' : score >= 40 ? '#ffa502' : '#2ed573'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{score}</span>
      </div>
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────────────
export default function ProductChurnDashboard() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'alerts'>('overview')
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)
  const [filterReason, setFilterReason] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [animateIn, setAnimateIn] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setAnimateIn(false)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/product-churn', { method: 'POST', body: formData })
      const json = await res.json()

      if (json.success) {
        setAnalysis(json)
        setActiveTab('overview')
        setTimeout(() => setAnimateIn(true), 100)
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
    const headers = ['Customer', 'Product', 'Category', 'Severity', 'Reason', 'Drop %', 'Lost Revenue/Mo', 'Discount', 'Action']
    const rows = analysis.alerts.map(a => [
      a.customer_id, a.product_name, a.category, a.severity,
      a.churn_reason || 'unknown', a.drop_percentage + '%',
      '£' + a.estimated_lost_revenue.toFixed(0), a.recommended_discount + '%',
      `"${a.recommended_action.replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'lost-product-alerts.csv'; a.click()
  }

  // ─── Chart Data ──────────────────────────────────────────────────────────
  const severityData = analysis ? [
    { name: 'Critical', value: analysis.summary.critical_alerts, fill: COLORS.critical.main },
    { name: 'Warning', value: analysis.summary.warning_alerts, fill: COLORS.warning.main },
    { name: 'Watch', value: analysis.summary.watch_alerts, fill: COLORS.watch.main },
  ].filter(d => d.value > 0) : []

  const categoryData = analysis
    ? analysis.summary.categories_at_risk.slice(0, 8).map((cat, i) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        loss: Math.round(analysis.alerts.filter(a => a.category === cat).reduce((s, a) => s + a.estimated_lost_revenue, 0)),
        fill: CHART_PALETTE[i % CHART_PALETTE.length],
      })).sort((a, b) => b.loss - a.loss)
    : []

  const reasonBreakdown = analysis ? [
    { name: 'Competitor', value: analysis.alerts.filter(a => a.churn_reason === 'competitor').length, fill: COLORS.critical.main },
    { name: 'Product Switch', value: analysis.alerts.filter(a => a.churn_reason === 'product_switch').length, fill: COLORS.info.main },
    { name: 'Business Decline', value: analysis.alerts.filter(a => a.churn_reason === 'business_decline').length, fill: COLORS.warning.main },
    { name: 'Unknown', value: analysis.alerts.filter(a => !a.churn_reason || a.churn_reason === 'unknown').length, fill: '#64748b' },
  ].filter(d => d.value > 0) : []

  // ─── Filtered Alerts ─────────────────────────────────────────────────────
  const filteredAlerts = analysis
    ? analysis.alerts.filter(a => {
        if (selectedCustomer && a.customer_id !== selectedCustomer) return false
        if (filterSeverity && a.severity !== filterSeverity) return false
        if (filterReason && a.churn_reason !== filterReason) return false
        return true
      })
    : []

  const actionList = analysis?.action_list || []

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Background grid pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />

      <Navbar />

      <div className="relative max-w-[1400px] mx-auto px-6 py-8">

        {/* ─── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Lost Product Detection
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Find competitor losses • Prioritise calls • Recover revenue
              </p>
            </div>
          </div>
        </div>

        {/* ─── Upload Section ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl mb-8 border border-white/[0.06] bg-gradient-to-r from-[#12162a] to-[#151b30]">
          {/* Decorative gradient orb */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <form onSubmit={handleUpload} className="relative p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white flex items-center gap-3 mb-1">
                  <FileSpreadsheet className="w-5 h-5 text-violet-400" />
                  Upload Order History
                </h2>
                <p className="text-slate-400 text-sm">
                  CSV or JSON — invoice_date, customer_id, product_name, quantity, unit_price
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className={`relative cursor-pointer px-5 py-2.5 rounded-xl border transition-all duration-200 ${
                    dragActive
                      ? 'border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                      : fileName
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.03]'
                  }`}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={() => setDragActive(false)}
                >
                  <input
                    type="file" name="file" accept=".json,.csv" required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <span className="flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4 text-violet-400" />
                    <span className={fileName ? 'text-violet-300' : 'text-slate-400'}>
                      {fileName || 'Choose file...'}
                    </span>
                  </span>
                </label>
                <button
                  type="submit" disabled={uploading}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-7 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : 'Analyze'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {analysis ? (
          <div className={`transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* ─── KPI Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[
                {
                  label: 'Customers', value: analysis.summary.total_customers, icon: Users,
                  color: 'text-slate-300', border: 'border-white/[0.06]', bg: 'from-[#12162a] to-[#151b30]',
                },
                {
                  label: 'Critical', value: analysis.summary.critical_alerts, icon: AlertTriangle,
                  color: 'text-red-400', border: 'border-red-500/20', bg: 'from-red-950/40 to-red-900/20',
                },
                {
                  label: 'Warning', value: analysis.summary.warning_alerts, icon: AlertCircle,
                  color: 'text-amber-400', border: 'border-amber-500/20', bg: 'from-amber-950/40 to-amber-900/20',
                },
                {
                  label: 'Watch', value: analysis.summary.watch_alerts, icon: Eye,
                  color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'from-emerald-950/40 to-emerald-900/20',
                },
                {
                  label: 'Monthly Loss', value: null, icon: DollarSign,
                  color: 'text-violet-400', border: 'border-violet-500/20', bg: 'from-violet-950/40 to-violet-900/20',
                  custom: (
                    <p className="text-2xl font-bold text-white mt-1">
                      <AnimatedNumber value={analysis.summary.total_estimated_monthly_loss / 1000} prefix="£" suffix="K" decimals={1} />
                    </p>
                  )
                },
                {
                  label: 'Competitor', value: analysis.summary.competitor_signals, icon: Shield,
                  color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'from-fuchsia-950/40 to-fuchsia-900/20',
                },
              ].map((kpi, i) => {
                const Icon = kpi.icon
                return (
                  <div key={i}
                    className={`bg-gradient-to-br ${kpi.bg} rounded-2xl p-4 border ${kpi.border} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className={`flex items-center gap-1.5 ${kpi.color} text-xs font-medium mb-1 uppercase tracking-wider`}>
                      <Icon className="w-3.5 h-3.5" />
                      {kpi.label}
                    </div>
                    {kpi.custom || (
                      <p className="text-2xl font-bold text-white mt-1">
                        <AnimatedNumber value={kpi.value || 0} />
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ─── Tab Navigation ──────────────────────────────────────────── */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'actions', label: 'Call List', icon: Phone },
                { key: 'alerts', label: 'All Alerts', icon: TrendingDown },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white shadow-lg shadow-violet-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.key === 'actions' && actionList.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-400'
                      }`}>
                        {actionList.filter(a => a.urgency === 'call_today').length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ─── OVERVIEW TAB ────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Banner */}
                {actionList.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/50 via-[#12162a] to-fuchsia-950/50 p-6">
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-violet-300 font-medium mb-1">AI Summary</p>
                        <p className="text-white text-lg font-semibold">
                          {actionList.filter(a => a.urgency === 'call_today').length > 0
                            ? `🔥 ${actionList.filter(a => a.urgency === 'call_today').length} customer${actionList.filter(a => a.urgency === 'call_today').length > 1 ? 's' : ''} need calls today — `
                            : `${actionList.length} customer${actionList.length > 1 ? 's' : ''} flagged — `
                          }
                          <span className="text-violet-300">
                            £<AnimatedNumber value={Math.round(actionList.reduce((s, a) => s + a.competitor_loss, 0))} /> /month
                          </span>
                          {' '}at risk from competitors
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('actions')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        View Call List
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Severity Donut */}
                  <div className="bg-[#12162a] rounded-2xl p-6 border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-violet-400" />
                      Alert Severity
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={severityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {severityData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {severityData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          {item.name}: <span className="text-white font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Churn Reasons */}
                  <div className="bg-[#12162a] rounded-2xl p-6 border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-violet-400" />
                      Loss Reasons
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={reasonBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {reasonBreakdown.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {reasonBreakdown.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          {item.name}: <span className="text-white font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue by Category */}
                  <div className="bg-[#12162a] rounded-2xl p-6 border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-violet-400" />
                      Loss by Category
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="#475569" tickFormatter={(v) => `£${v}`} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" stroke="#475569" width={70} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }}
                          formatter={(value: number) => [`£${value}`, 'Lost/Month']}
                        />
                        <Bar dataKey="loss" radius={[0, 6, 6, 0]} barSize={18}>
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Retention Strategies */}
                <div className="bg-[#12162a] rounded-2xl p-6 border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Top Retention Opportunities
                    </h3>
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] text-xs transition-all">
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>
                  <div className="space-y-3">
                    {analysis.recommendations.slice(0, 5).map((rec, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 transition-all duration-200 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white text-sm shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                          {rec.priority}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-white font-semibold">{rec.customer_id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 truncate max-w-[200px]">
                              {rec.product_name}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 capitalize">
                              {rec.category}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm leading-relaxed">{rec.action}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              <span className="text-amber-400">{rec.discount}%</span> discount
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="text-emerald-400">£{rec.potential_save.toFixed(0)}</span>/mo save
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              <span className="text-violet-400">{(rec.win_back_probability * 100).toFixed(0)}%</span> win-back
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── ACTIONS TAB (Priority Call List) ────────────────────────── */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                {/* Action List Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Priority Call List</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Ranked by potential recovery — who to call first
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {['call_today', 'call_this_week', 'monitor'].map(urgency => {
                      const config = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG]
                      const count = actionList.filter(a => a.urgency === urgency).length
                      if (count === 0) return null
                      return (
                        <div key={urgency} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${config.bg}`}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          <span style={{ color: config.color }} className="font-semibold">{count}</span>
                          <span className="text-slate-400">{config.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Cards */}
                {actionList.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No action items generated</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionList.map((item, i) => {
                      const urgencyConfig = URGENCY_CONFIG[item.urgency]
                      const UrgencyIcon = urgencyConfig.icon
                      return (
                        <div
                          key={i}
                          className={`relative overflow-hidden rounded-2xl border bg-[#12162a] transition-all duration-200 hover:shadow-lg group ${
                            item.urgency === 'call_today'
                              ? 'border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/5'
                              : item.urgency === 'call_this_week'
                                ? 'border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/5'
                                : 'border-white/[0.06] hover:border-white/10'
                          }`}
                        >
                          {/* Urgency accent bar */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: urgencyConfig.color }} />

                          <div className="p-5 pl-6">
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: Score + Info */}
                              <div className="flex items-start gap-4">
                                <ScoreRing score={item.priority_score} size={52} strokeWidth={4} />
                                <div>
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <span className="text-white font-bold text-lg">{item.customer_id}</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wide ${urgencyConfig.bg}`}
                                      style={{ color: urgencyConfig.color }}
                                    >
                                      <UrgencyIcon className="w-3 h-3" />
                                      {urgencyConfig.label}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      item.customer_health === 'healthy' ? 'bg-emerald-500/15 text-emerald-400'
                                        : item.customer_health === 'declining' ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-red-500/15 text-red-400'
                                    }`}>
                                      {item.customer_health === 'healthy' ? '✓ Healthy' : item.customer_health === 'declining' ? '↓ Declining' : '✕ Stopped'}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                                    {item.recommended_action}
                                  </p>
                                  {item.top_lost_products.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                      <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Lost:</span>
                                      {item.top_lost_products.map((p, j) => (
                                        <span key={j} className="text-xs px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 border border-red-500/10 truncate max-w-[200px]" title={p}>
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Numbers */}
                              <div className="flex items-center gap-6 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Competitor Loss</p>
                                  <p className="text-lg font-bold text-red-400">£{item.competitor_loss.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Current Spend</p>
                                  <p className="text-lg font-bold text-white">£{item.customer_monthly_spend.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Alerts</p>
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <span className="text-lg font-bold text-white">{item.alerts_count}</span>
                                    {item.competitor_alerts > 0 && (
                                      <span className="text-xs text-red-400">({item.competitor_alerts} ⚔️)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── ALERTS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {/* Filters Bar */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Customer filter */}
                    <select
                      value={selectedCustomer || ''}
                      onChange={(e) => setSelectedCustomer(e.target.value || null)}
                      className="bg-[#12162a] text-white text-sm px-4 py-2 rounded-xl border border-white/[0.08] focus:border-violet-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">All Customers</option>
                      {[...new Set(analysis.alerts.map(a => a.customer_id))].sort().map(cid => (
                        <option key={cid} value={cid}>{cid}</option>
                      ))}
                    </select>

                    {/* Severity filter chips */}
                    <div className="flex items-center gap-1 ml-2">
                      {(['critical', 'warning', 'watch'] as const).map(sev => {
                        const isActive = filterSeverity === sev
                        const count = analysis.alerts.filter(a => a.severity === sev && (!selectedCustomer || a.customer_id === selectedCustomer)).length
                        return (
                          <button
                            key={sev}
                            onClick={() => setFilterSeverity(isActive ? null : sev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isActive
                                ? `border-current`
                                : 'border-transparent hover:bg-white/[0.04]'
                            }`}
                            style={{ color: isActive ? COLORS[sev].main : '#64748b' }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[sev].main }} />
                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                            <span className="opacity-60">({count})</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Reason filter chips */}
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/[0.06]">
                      {(['competitor', 'product_switch', 'business_decline'] as const).map(reason => {
                        const isActive = filterReason === reason
                        const config = REASON_CONFIG[reason]
                        const count = analysis.alerts.filter(a => a.churn_reason === reason && (!selectedCustomer || a.customer_id === selectedCustomer) && (!filterSeverity || a.severity === filterSeverity)).length
                        return (
                          <button
                            key={reason}
                            onClick={() => setFilterReason(isActive ? null : reason)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isActive ? 'border-current' : 'border-transparent hover:bg-white/[0.04]'
                            }`}
                            style={{ color: isActive ? config.color : '#64748b' }}
                          >
                            <span>{config.icon}</span>
                            {config.label}
                            <span className="opacity-60">({count})</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Clear filters */}
                    {(selectedCustomer || filterSeverity || filterReason) && (
                      <button
                        onClick={() => { setSelectedCustomer(null); setFilterSeverity(null); setFilterReason(null) }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-400">
                    {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Alerts Table */}
                <div className="bg-[#12162a] rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Customer', 'Product', 'Category', 'Severity', 'Reason', 'Baseline', 'Current', 'Drop', 'Loss/Mo', 'Discount'].map(h => (
                            <th key={h} className={`py-3.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                              ['Baseline', 'Current', 'Loss/Mo'].includes(h) ? 'text-right' : ['Severity', 'Reason', 'Drop', 'Discount'].includes(h) ? 'text-center' : 'text-left'
                            }`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAlerts.slice(0, 50).map((alert, i) => {
                          const reasonConfig = REASON_CONFIG[alert.churn_reason || 'unknown']
                          return (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                              <td className="py-3.5 px-4 text-white font-medium text-sm">{alert.customer_id}</td>
                              <td className="py-3.5 px-4 text-slate-300 text-sm max-w-[220px] truncate" title={alert.product_name}>
                                {alert.product_name}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 capitalize">
                                  {alert.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase tracking-wide"
                                  style={{ backgroundColor: COLORS[alert.severity].bg, color: COLORS[alert.severity].main }}
                                >
                                  {alert.severity}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${reasonConfig.bg}`}
                                  style={{ color: reasonConfig.color }}
                                >
                                  <span className="text-[10px]">{reasonConfig.icon}</span>
                                  {reasonConfig.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-slate-400 text-sm font-mono">{alert.baseline_quantity.toFixed(1)}</td>
                              <td className="py-3.5 px-4 text-right text-slate-400 text-sm font-mono">{alert.current_quantity.toFixed(1)}</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-red-400 font-bold text-sm flex items-center justify-center gap-0.5">
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                  {alert.drop_percentage}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="text-amber-400 font-semibold text-sm">£{alert.estimated_lost_revenue.toFixed(0)}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                                  {alert.recommended_discount}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredAlerts.length > 50 && (
                    <div className="px-4 py-3 border-t border-white/[0.04] text-center">
                      <p className="text-slate-400 text-xs">
                        Showing 50 of {filteredAlerts.length} alerts ·
                        <button onClick={exportCSV} className="text-violet-400 ml-1 hover:underline">Export all</button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── Empty State ────────────────────────────────────────────────── */
          <div className="relative overflow-hidden rounded-3xl p-16 text-center border border-white/[0.06] bg-[#12162a]">
            <div className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(124,92,252,0.15), transparent 60%)' }}
            />
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
                <Package className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Upload Your Order History</h3>
              <p className="text-slate-400 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
                Find which products your customers are getting from competitors.
                Get a prioritised call list with recommended discounts to win them back.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['customer_id', 'product_name', 'quantity', 'unit_price', 'invoice_date'].map(col => (
                  <span key={col} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-400 text-xs font-mono border border-white/[0.06]">
                    {col}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                {[
                  { icon: Shield, label: 'Detect competitor losses', color: 'text-red-400' },
                  { icon: Phone, label: 'Prioritised call list', color: 'text-violet-400' },
                  { icon: Percent, label: 'Smart discount offers', color: 'text-emerald-400' },
                ].map((feat, i) => {
                  const Icon = feat.icon
                  return (
                    <div key={i} className="text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-2 ${feat.color}`} />
                      <p className="text-[11px] text-slate-400">{feat.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
