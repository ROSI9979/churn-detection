'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Package, ArrowRight, Shield, Phone, Users, Zap, ChevronRight, DollarSign, TrendingUp, CheckCircle, BarChart3, Clock, Target } from 'lucide-react'

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000 }: {
  end: number; prefix?: string; suffix?: string; duration?: number
}) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(end * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, end, duration])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

// ─── Section Reveal on Scroll ────────────────────────────────────────────────
function RevealSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${className}`}
      style={{
        transitionDuration: '800ms',
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Live Ticker ─────────────────────────────────────────────────────────────
function LiveTicker() {
  const items = [
    { customer: 'C34908', product: 'Diced Chicken 2.5KG', loss: '£452', time: '2 min ago' },
    { customer: 'C21045', product: 'Cola Cans 24pk', loss: '£128', time: '5 min ago' },
    { customer: 'C18922', product: 'KTC Rapeseed Oil 20L', loss: '£340', time: '8 min ago' },
    { customer: 'C45210', product: 'Sliced Doner Kebab 5KG', loss: '£215', time: '12 min ago' },
  ]
  const [currentIdx, setCurrentIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % items.length)
        setFade(true)
      }, 300)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const item = items[currentIdx]

  return (
    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-red-500/20 bg-red-500/5">
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span
        className={`text-sm transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-slate-400">Lost:</span>{' '}
        <span className="text-white font-medium">{item.product}</span>{' '}
        <span className="text-red-400 font-semibold">{item.loss}/mo</span>{' '}
        <span className="text-slate-500">— {item.time}</span>
      </span>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-fuchsia-600/[0.04] blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-blue-600/[0.03] blur-[80px]" />
      </div>

      <Navbar />

      <div className="relative">
        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
          {/* Live Ticker */}
          <RevealSection delay={0}>
            <div className="mb-8">
              <LiveTicker />
            </div>
          </RevealSection>

          {/* Badge */}
          <RevealSection delay={100}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-violet-500/25 bg-violet-500/[0.08] mb-8">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-sm font-medium text-violet-300 tracking-wide">AI-Powered Revenue Recovery for B2B Wholesalers</span>
            </div>
          </RevealSection>

          <RevealSection delay={200}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Stop Losing Revenue
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                to Competitors
              </span>
            </h1>
          </RevealSection>

          <RevealSection delay={300}>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
              Detect exactly which products your customers stopped buying,
              who took the business, and get a daily call list to win them back.
            </p>
          </RevealSection>

          {/* CTA Button */}
          <RevealSection delay={400}>
            <div className="flex justify-center mb-20">
              <Link href="/product-churn"
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
              >
                {/* Glow behind button */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <span className="relative flex items-center gap-3">
                  <TrendingUp className="w-5 h-5" />
                  Detect Lost Revenue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>
          </RevealSection>

          {/* ─── Stats Row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20">
            {[
              { value: 2, suffix: ' sec', label: 'Analysis Time', color: 'text-violet-400', desc: 'Upload CSV to instant results' },
              { value: 910, prefix: '£', suffix: '', label: 'Found Per Customer', color: 'text-red-400', desc: 'Average competitor loss detected' },
              { value: 20, suffix: '+', label: 'Products Tracked', color: 'text-fuchsia-400', desc: 'Per customer, individually' },
              { value: 98, suffix: '/100', label: 'Priority Score', color: 'text-amber-400', desc: 'AI-ranked call urgency' },
            ].map((stat, i) => (
              <RevealSection key={i} delay={500 + i * 100}>
                <div className="bg-[#12162a] rounded-2xl p-6 border border-white/[0.06] hover:border-violet-500/25 transition-all duration-300 group glow-border-violet">
                  <p className={`text-3xl font-bold ${stat.color} mb-1`}>
                    <AnimatedCounter end={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix || ''} />
                  </p>
                  <p className="text-white text-sm font-semibold">{stat.label}</p>
                  <p className="text-slate-400 text-xs mt-1.5">{stat.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ─── How It Works ───────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Three Steps to Recovered Revenue</h2>
              <p className="text-slate-400 max-w-lg mx-auto">From CSV upload to actionable call list in under 2 seconds</p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: DollarSign,
                title: 'Upload Invoices',
                desc: 'Drop your CSV of order history. We auto-detect customer IDs, products, quantities, and prices.',
                color: 'from-violet-500 to-violet-600',
                glow: 'shadow-violet-500/20',
                highlights: ['CSV / JSON supported', 'Auto column detection', '5+ months history'],
              },
              {
                step: '02',
                icon: Shield,
                title: 'AI Detects Losses',
                desc: 'Each product analysed individually. Stopped buying chicken but ordering everything else? Competitor.',
                color: 'from-fuchsia-500 to-fuchsia-600',
                glow: 'shadow-fuchsia-500/20',
                highlights: ['Product-level detection', 'Switch vs competitor vs decline', 'Smart matching'],
              },
              {
                step: '03',
                icon: Phone,
                title: 'Prioritised Call List',
                desc: 'Ranked by recovery potential. Your rep sees who to call, which products to discuss, what discount to offer.',
                color: 'from-amber-500 to-orange-500',
                glow: 'shadow-amber-500/20',
                highlights: ['Score 0-100 per customer', 'Call today / this week / monitor', 'Recommended discounts'],
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <RevealSection key={i} delay={i * 150}>
                  <div className="relative bg-[#12162a] rounded-2xl p-8 border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 group glow-border-violet h-full">
                    <span className="text-[80px] font-black text-white/[0.03] absolute top-4 right-6 leading-none select-none">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg ${item.glow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{item.desc}</p>
                    <div className="space-y-2">
                      {item.highlights.map((h, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>
              )
            })}
          </div>
        </section>

        {/* ─── What We Detect ─────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <RevealSection>
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#12162a] via-[#131831] to-violet-950/30 p-10 md:p-12">
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-500/[0.06] blur-[100px] animate-float" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-fuchsia-500/[0.04] blur-[80px]" />

              <div className="relative">
                <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Detection Types</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-10">What the System Tells Your Sales Team</h2>

                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                  {[
                    {
                      icon: '⚔️',
                      title: 'Competitor Loss',
                      desc: 'Customer healthy overall but stopped specific products. Someone else is delivering them cheaper.',
                      tag: 'CRITICAL',
                      tagColor: 'bg-red-500/20 text-red-400 border border-red-500/20',
                    },
                    {
                      icon: '🔄',
                      title: 'Product Switch',
                      desc: 'Switched from 2KG to 1.8KG, or from one brand to another you stock. No sales call needed.',
                      tag: 'WATCH',
                      tagColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
                    },
                    {
                      icon: '📉',
                      title: 'Business Decline',
                      desc: 'Total spend dropped 30%+. Shop may be struggling or owner changed. Different conversation needed.',
                      tag: 'WARNING',
                      tagColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
                    },
                    {
                      icon: '📊',
                      title: 'Priority Scoring',
                      desc: 'Each customer scored 0-100 based on loss amount, recency, value, and pattern. Call the 98s first.',
                      tag: 'RANKED',
                      tagColor: 'bg-violet-500/20 text-violet-400 border border-violet-500/20',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="text-3xl flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <h3 className="text-white font-bold text-lg">{item.title}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${item.tagColor}`}>
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ─── Scale Section ──────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Built for Scale</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Reps Can&apos;t Call Everyone</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                1,000 customers? 10,000? The system filters down to the 15-30 that matter today.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              {
                number: 10000,
                label: 'Total Customers',
                sub: 'Full order history analysed',
                color: 'text-slate-300',
                border: 'border-white/[0.06]',
              },
              {
                number: 200,
                prefix: '~',
                label: 'With Alerts',
                sub: 'Products stopped or declining',
                color: 'text-amber-400',
                border: 'border-amber-500/20',
              },
              {
                number: 25,
                label: 'Call Today',
                sub: 'High-value competitor losses',
                color: 'text-red-400',
                border: 'border-red-500/20',
              },
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 120}>
                <div className={`bg-[#12162a] rounded-2xl p-8 border ${item.border} text-center hover:scale-[1.02] transition-all duration-300`}>
                  <p className={`text-4xl md:text-5xl font-bold ${item.color} mb-2`}>
                    <AnimatedCounter end={item.number} prefix={item.prefix || ''} />
                  </p>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs mt-1.5">{item.sub}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Funnel Visualization */}
          <RevealSection delay={200}>
            <div className="bg-[#12162a] rounded-2xl p-8 border border-white/[0.06] glow-border-violet transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-3">The Funnel Your Sales Team Needs</h3>
                  <div className="flex items-center gap-3 text-sm flex-wrap mb-4">
                    <span className="bg-white/[0.06] px-3 py-2 rounded-lg border border-white/[0.08] text-white font-medium">10,000 customers</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/25 text-amber-300 font-medium">~200 with alerts</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/25 text-red-300 font-medium">~80 competitor losses</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="bg-violet-500/15 px-3 py-2 rounded-lg border border-violet-500/30 text-violet-300 font-bold">15-30 calls/day</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    The system scores every customer and filters out product switches, business declines, and low-value alerts.
                    Your rep opens the app in the morning and sees exactly who to call, which products to discuss, and what discount to offer.
                    <span className="text-white font-medium"> 15-30 targeted calls per day</span> — not 1,000 blind ones.
                  </p>
                </div>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ─── Testimonial / Proof Section ─────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <RevealSection>
            <div className="bg-gradient-to-r from-[#12162a] to-[#151b30] rounded-2xl border border-white/[0.06] p-8 md:p-10">
              <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-6">Real Detection Example</p>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <p className="text-white text-lg font-semibold mb-4 leading-relaxed">
                    &ldquo;Customer C34908 was ordering Diced Chicken every 2 weeks at <span className="text-red-400">£450/month</span>.
                    Three months ago — <span className="text-white">completely stopped</span>. Still ordering oil, drinks, boxes. That chicken is going to a competitor.&rdquo;
                  </p>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    The system flagged <span className="text-white font-medium">20 products</span> across one customer with{' '}
                    <span className="text-red-400 font-medium">£910/month</span> competitor loss. Priority score:{' '}
                    <span className="text-amber-400 font-bold">98/100</span>. Urgency:{' '}
                    <span className="text-red-400 font-bold">CALL TODAY</span>.
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-3">
                  {[
                    { label: 'Products Lost', value: '20', color: 'text-white' },
                    { label: 'Monthly Loss', value: '£910', color: 'text-red-400' },
                    { label: 'Priority Score', value: '98/100', color: 'text-amber-400' },
                    { label: 'Urgency', value: 'CALL TODAY', color: 'text-red-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <span className="text-slate-400 text-sm">{item.label}</span>
                      <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ─── Final CTA ──────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <RevealSection>
            <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/60 via-[#12162a] to-fuchsia-950/60 p-12 md:p-16 text-center">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-violet-500/[0.08] blur-[100px] animate-float" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Find Your Lost Revenue?</h2>
                <p className="text-slate-300 mb-10 max-w-lg mx-auto text-lg">
                  Upload your invoice CSV and see results in seconds. No setup, no integration required.
                </p>
                <Link href="/product-churn"
                  className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                  <span className="relative flex items-center gap-3">
                    <Zap className="w-5 h-5" />
                    Start Analysing
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] py-8">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-400">RetainIQ</span>
            </div>
            <p className="text-xs text-slate-500">Revenue Recovery for B2B Wholesalers</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
