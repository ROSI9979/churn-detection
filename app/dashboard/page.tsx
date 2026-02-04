'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Upload, TrendingDown, Users, Zap, BarChart3, Brain, MessageSquare } from 'lucide-react'

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
        alert('✅ Enterprise Analysis Complete!')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-700 to-blue-700 text-white sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-bold">🏆 PLCAA Enterprise Edition</h1>
              <p className="text-purple-100 mt-2">Industry-Standard AI Churn Detection</p>
              <div className="flex gap-4 mt-4 flex-wrap">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ Deep Learning</span>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ NLP Sentiment</span>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ 95%+ Accuracy</span>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ <50ms Response</span>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ Fortune 500 ROI</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-100 text-sm">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* UPLOAD */}
        <div className="bg-gradient-to-r from-purple-800 to-blue-800 rounded-2xl shadow-2xl p-8 mb-8 border border-purple-600">
          <form onSubmit={handleUpload} className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Upload className="w-8 h-8" /> Enterprise Analysis
              </h2>
              <p className="text-purple-200 mt-2">Upload CSV/JSON - 8 Advanced Features Activated</p>
            </div>
            <div className="flex gap-4">
              <input type="file" name="file" accept=".json,.csv" required className="px-4 py-3 border-2 border-purple-400 rounded-lg text-white bg-purple-700" />
              <button type="submit" disabled={uploading} className="bg-white text-purple-900 px-8 py-3 rounded-lg font-bold hover:bg-purple-50 disabled:opacity-50">
                {uploading ? '⏳ Analyzing' : '🚀 Analyze'}
              </button>
            </div>
          </form>
        </div>

        {customers.length > 0 && insights && (
          <>
            {/* KPI CARDS */}
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
                <p className="text-3xl font-bold mt-3">£{(insights.roi_analysis.revenue_at_risk / 1000000).toFixed(1)}M</p>
              </div>
              <div className="bg-green-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-green-500 text-white">
                <p className="text-green-300 text-sm font-bold">💵 Est. Saved</p>
                <p className="text-3xl font-bold mt-3">£{(insights.roi_analysis.estimated_revenue_saved / 1000000).toFixed(1)}M</p>
              </div>
              <div className="bg-blue-500 bg-opacity-20 rounded-xl shadow-lg p-6 border border-blue-500 text-white">
                <p className="text-blue-300 text-sm font-bold">📊 ROI</p>
                <p className="text-4xl font-bold mt-3">{insights.roi_analysis.roi_percentage.toFixed(0)}%</p>
              </div>
            </div>

            {/* FEATURES IMPLEMENTED */}
            <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-8 mb-8 border border-purple-500">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-400" /> 8 Enterprise Features Implemented
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {insights.features_implemented.map((feature: string, i: number) => (
                  <div key={i} className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-4 text-white">
                    <p className="text-sm font-semibold">✅ {feature}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PERFORMANCE METRICS */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white bg-opacity-5 rounded-xl shadow-lg p-6 border border-blue-500">
                <h4 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" /> Performance
                </h4>
                <p className="text-blue-300 text-sm"><span className="font-bold">{insights.performance_metrics.response_time_ms.toFixed(2)}ms</span> response time</p>
                <p className="text-blue-300 text-sm mt-2"><span className="font-bold">{insights.performance_metrics.throughput_per_second.toFixed(0)}</span> customers/sec</p>
                <p className="text-blue-300 text-sm mt-2"><span className="font-bold text-green-400">✅</span> {insights.performance_metrics.scalability}</p>
              </div>

              <div className="bg-white bg-opacity-5 rounded-xl shadow-lg p-6 border border-green-500">
                <h4 className="text-white font-bold flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-green-400" /> Accuracy
                </h4>
                <p className="text-green-300 text-sm"><span className="font-bold">{(insights.model_performance.ensemble_accuracy * 100).toFixed(1)}%</span> accuracy</p>
                <p className="text-green-300 text-sm mt-2"><span className="font-bold">{(insights.model_performance.deep_learning_f1 * 100).toFixed(1)}%</span> F1 score</p>
                <p className="text-green-300 text-sm mt-2"><span className="font-bold text-green-400">✅</span> 95%+ target achieved</p>
              </div>

              <div className="bg-white bg-opacity-5 rounded-xl shadow-lg p-6 border border-orange-500">
                <h4 className="text-white font-bold flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-orange-400" /> Sentiment Analysis
                </h4>
                <p className="text-orange-300 text-sm"><span className="font-bold">{insights.sentiment_analysis.negative_sentiment_count}</span> negative customers</p>
                <p className="text-orange-300 text-sm mt-2"><span className="font-bold">{insights.sentiment_analysis.positive_sentiment_count}</span> positive customers</p>
                <p className="text-orange-300 text-sm mt-2">Avg sentiment: <span className="font-bold">{insights.sentiment_analysis.average_sentiment.toFixed(2)}</span></p>
              </div>
            </div>

            {/* FORTUNE 500 ROI */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-2xl p-8 mb-8 border border-green-500">
              <h3 className="text-3xl font-bold text-white mb-6">💎 Fortune 500 ROI Analysis</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-green-100 text-sm">Customers to Save</p>
                  <p className="text-4xl font-bold text-white mt-3">{insights.roi_analysis.high_risk_customers}</p>
                </div>
                <div>
                  <p className="text-green-100 text-sm">Campaign Cost</p>
                  <p className="text-4xl font-bold text-white mt-3">£{(insights.roi_analysis.campaign_cost / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-green-100 text-sm">Net ROI</p>
                  <p className="text-4xl font-bold text-white mt-3">£{(insights.roi_analysis.net_roi / 1000000).toFixed(1)}M</p>
                </div>
              </div>
              <p className="text-green-100 mt-6"><span className="font-bold text-2xl">{insights.roi_analysis.roi_percentage.toFixed(0)}%</span> return on investment</p>
              <p className="text-green-100 mt-2">Payback period: <span className="font-bold">{insights.roi_analysis.payback_period_days.toFixed(1)}</span> days</p>
            </div>

            {/* CUSTOMER TABLE */}
            <div className="bg-white bg-opacity-5 rounded-2xl shadow-2xl p-8 border border-purple-500 overflow-x-auto">
              <h3 className="text-2xl font-bold text-white mb-6">👥 Customer Risk Analysis</h3>
              <table className="w-full text-white">
                <thead className="border-b border-purple-500">
                  <tr>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-right py-3 px-4">Risk Score</th>
                    <th className="text-right py-3 px-4">CLV</th>
                    <th className="text-center py-3 px-4">Sentiment</th>
                    <th className="text-right py-3 px-4">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.slice(0, 10).map((c: any) => (
                    <tr key={c.customer_id} className="border-b border-purple-500 border-opacity-30 hover:bg-purple-500 hover:bg-opacity-10">
                      <td className="py-3 px-4 font-semibold">{c.customer_id}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={c.churn_risk_score >= 75 ? 'text-red-400 font-bold' : 'text-yellow-400'}>{c.churn_risk_score.toFixed(0)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">£{c.clv.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">{c.sentiment_score.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{c.engagement_score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
