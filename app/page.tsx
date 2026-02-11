'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { BarChart3, Package, ArrowRight, Shield, Phone, Percent, TrendingDown, Users, Zap, ChevronRight, DollarSign } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-fuchsia-600/5 blur-[100px]" />
      </div>

      <Navbar />

      <div className="relative">
        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 mb-8">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300 tracking-wide">AI-Powered Revenue Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Stop Losing Revenue
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              to Competitors
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Detect exactly which products your B2B customers stopped buying,
            why they left, and who to call first to win them back.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link href="/product-churn"
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Package className="w-5 h-5" />
              Product Churn Detection
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/dashboard"
              className="group inline-flex items-center gap-3 bg-white/[0.05] text-white px-8 py-4 rounded-2xl text-lg font-semibold border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
            >
              <BarChart3 className="w-5 h-5 text-slate-400" />
              Customer Churn
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* ─── Stats Row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20">
            {[
              { value: '2 sec', label: 'Analysis Time', color: 'text-violet-400', desc: 'Upload → results instantly' },
              { value: '£910', label: 'Found Per Customer', color: 'text-red-400', desc: 'Average competitor loss detected' },
              { value: '20+', label: 'Products Tracked', color: 'text-fuchsia-400', desc: 'Per customer, individually' },
              { value: '98/100', label: 'Priority Score', color: 'text-amber-400', desc: 'AI-ranked call urgency' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#12162a] rounded-2xl p-5 border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 group">
                <p className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                <p className="text-white text-sm font-medium">{stat.label}</p>
                <p className="text-slate-600 text-xs mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ───────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-slate-500">Three steps from data to recovered revenue</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: DollarSign,
                title: 'Upload Invoices',
                desc: 'Drop your CSV of order history. We detect customer IDs, products, quantities, and prices automatically.',
                color: 'from-violet-500 to-violet-600',
                glow: 'shadow-violet-500/20',
              },
              {
                step: '02',
                icon: Shield,
                title: 'AI Detects Losses',
                desc: 'We compare each product\'s baseline vs current orders. Stopped buying diced chicken but still ordering everything else? That\'s a competitor.',
                color: 'from-fuchsia-500 to-fuchsia-600',
                glow: 'shadow-fuchsia-500/20',
              },
              {
                step: '03',
                icon: Phone,
                title: 'Prioritised Call List',
                desc: 'Your reps get a ranked list: who to call, which products to discuss, what discount to offer. Top priority first.',
                color: 'from-amber-500 to-orange-500',
                glow: 'shadow-amber-500/20',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="relative bg-[#12162a] rounded-2xl p-8 border border-white/[0.06] hover:border-violet-500/15 transition-all duration-300 group">
                  {/* Step number */}
                  <span className="text-[80px] font-black text-white/[0.03] absolute top-4 right-6 leading-none select-none">
                    {item.step}
                  </span>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg ${item.glow} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── What We Detect ─────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#12162a] via-[#12162a] to-violet-950/30 p-10">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-violet-500/8 blur-[80px]" />

            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-8">What the System Tells Your Sales Team</h2>

              <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                {[
                  {
                    icon: '⚔️',
                    title: 'Competitor Loss',
                    desc: 'Customer healthy overall but stopped specific products. Someone else is delivering them cheaper.',
                    tag: 'CRITICAL',
                    tagColor: 'bg-red-500/15 text-red-400',
                  },
                  {
                    icon: '🔄',
                    title: 'Product Switch',
                    desc: 'Switched from 2KG to 1.8KG, or from one brand to another you stock. No action needed.',
                    tag: 'WATCH',
                    tagColor: 'bg-blue-500/15 text-blue-400',
                  },
                  {
                    icon: '📉',
                    title: 'Business Decline',
                    desc: 'Total spend down 30%+. Shop struggling or owner changed. Different conversation needed.',
                    tag: 'WARNING',
                    tagColor: 'bg-amber-500/15 text-amber-400',
                  },
                  {
                    icon: '📊',
                    title: 'Priority Score',
                    desc: 'Each customer scored 0-100 based on loss amount, recency, value, and pattern. Call the 98s first.',
                    tag: 'RANKED',
                    tagColor: 'bg-violet-500/15 text-violet-400',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{item.title}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.tagColor}`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Scale Section (Booker Problem) ─────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Built for Scale</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              1,000 customers? 10,000? Your reps can&apos;t call everyone.
              The system filters down to who actually matters.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                number: '10,000',
                label: 'Total Customers',
                sub: 'Full order history analysed',
                color: 'text-slate-400',
                border: 'border-white/[0.06]',
              },
              {
                number: '~200',
                label: 'With Alerts',
                sub: 'Products stopped or declining',
                color: 'text-amber-400',
                border: 'border-amber-500/20',
              },
              {
                number: '15-30',
                label: 'Call Today',
                sub: 'High-value competitor losses',
                color: 'text-red-400',
                border: 'border-red-500/20',
              },
            ].map((item, i) => (
              <div key={i} className={`bg-[#12162a] rounded-2xl p-8 border ${item.border} text-center`}>
                <p className={`text-4xl font-bold ${item.color} mb-2`}>{item.number}</p>
                <p className="text-white font-medium text-sm">{item.label}</p>
                <p className="text-slate-600 text-xs mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[#12162a] rounded-2xl p-8 border border-white/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">The Funnel Your Sales Team Needs</h3>
                <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                  <span className="bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">10,000 customers</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span className="bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 text-amber-400">~200 with alerts</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400">~80 competitor losses</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span className="bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20 text-violet-400 font-semibold">15-30 calls/day</span>
                </div>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                  The system scores every customer and filters out product switches, business declines, and low-value alerts.
                  Your rep opens the app in the morning and sees exactly who to call, which products to discuss, and what discount to offer.
                  15-30 targeted calls per day &mdash; not 1,000 blind ones.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ──────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/50 via-[#12162a] to-fuchsia-950/50 p-12 text-center">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-violet-500/10 blur-[80px]" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Your Lost Revenue?</h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Upload your invoice CSV and see results in seconds. No setup, no integration required.
              </p>
              <Link href="/product-churn"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Zap className="w-5 h-5" />
                Start Analysing
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] py-8">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-500">Churn Intelligence</span>
            </div>
            <p className="text-xs text-slate-600">Built for B2B wholesalers</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
