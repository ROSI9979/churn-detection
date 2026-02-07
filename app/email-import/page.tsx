'use client'

import { useState, useEffect } from 'react'
import { Mail, Link2, Check, AlertCircle, Download, RefreshCw, Search, FileSpreadsheet, Package, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useSearchParams } from 'next/navigation'

interface Invoice {
  date: string
  invoice_number: string
  customer_id: string
  customer_name: string
  products: {
    name: string
    quantity: number
    unit_price: number
    total: number
  }[]
  total_amount: number
  supplier: string
  email_subject?: string
}

export default function EmailImportPage() {
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [supplier, setSupplier] = useState('fresco')
  const [months, setMonths] = useState(18)
  const [stats, setStats] = useState<any>(null)
  const [account, setAccount] = useState<{ email: string; name: string } | null>(null)

  useEffect(() => {
    // Check URL params for connection status
    if (searchParams.get('connected') === 'true') {
      setIsConnected(true)
      setSuccess('Outlook connected successfully! You can now fetch invoices.')
    }
    if (searchParams.get('error')) {
      setError('Failed to connect: ' + searchParams.get('error'))
    }
  }, [searchParams])

  const connectOutlook = () => {
    setLoading(true)
    window.location.href = '/api/outlook/auth'
  }

  const fetchInvoices = async () => {
    setFetching(true)
    setError('')

    try {
      const res = await fetch(`/api/outlook/fetch-invoices?supplier=${supplier}&months=${months}`)
      const data = await res.json()

      if (data.success) {
        setInvoices(data.invoices)
        setStats({
          emails_found: data.emails_found,
          invoices_parsed: data.invoices_parsed,
          date_range: data.date_range
        })
        setAccount(data.account)
        setSuccess(`Found ${data.invoices_parsed} invoices from ${data.emails_found} emails`)
      } else {
        if (data.needsAuth) {
          setIsConnected(false)
          setError(data.error)
        } else {
          setError(data.error)
        }
      }
    } catch (err) {
      setError('Failed to fetch invoices')
    } finally {
      setFetching(false)
    }
  }

  const exportToCSV = () => {
    if (invoices.length === 0) return

    // Flatten products into rows
    const rows: string[][] = []
    rows.push(['invoice_date', 'invoice_number', 'customer_id', 'customer_name', 'product_name', 'quantity', 'unit_price', 'net_amount', 'supplier'])

    for (const inv of invoices) {
      if (inv.products.length > 0) {
        for (const prod of inv.products) {
          rows.push([
            inv.date,
            inv.invoice_number,
            inv.customer_id,
            inv.customer_name,
            prod.name,
            prod.quantity.toString(),
            prod.unit_price.toString(),
            prod.total.toString(),
            inv.supplier
          ])
        }
      } else {
        rows.push([
          inv.date,
          inv.invoice_number,
          inv.customer_id,
          inv.customer_name,
          'Invoice Total',
          '1',
          inv.total_amount.toString(),
          inv.total_amount.toString(),
          inv.supplier
        ])
      }
    }

    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${supplier}-invoices-${months}months.csv`
    a.click()
  }

  const analyzeInProductChurn = () => {
    // Convert invoices to the format expected by product-churn
    const data = invoices.flatMap(inv =>
      inv.products.length > 0
        ? inv.products.map(prod => ({
            invoice_date: inv.date,
            customer_id: inv.customer_id,
            customer_name: inv.customer_name,
            product_name: prod.name,
            quantity: prod.quantity,
            unit_price: prod.unit_price,
            net_amount: prod.total
          }))
        : [{
            invoice_date: inv.date,
            customer_id: inv.customer_id,
            customer_name: inv.customer_name,
            product_name: 'Product',
            quantity: 1,
            unit_price: inv.total_amount,
            net_amount: inv.total_amount
          }]
    )

    // Store in sessionStorage and redirect
    sessionStorage.setItem('importedInvoices', JSON.stringify(data))
    window.location.href = '/product-churn?import=true'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Email Invoice Import</h1>
              <p className="text-gray-400">Connect Outlook to automatically fetch Fresco invoices</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-green-300">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Connection Card */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <Link2 className="w-5 h-5 text-blue-400" />
                Outlook Connection
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Connect your info@tastepizza.uk Outlook to fetch supplier invoices
              </p>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                {account && (
                  <span className="text-gray-400 text-sm">{account.email}</span>
                )}
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl">
                  <Check className="w-4 h-4" />
                  Connected
                </div>
              </div>
            ) : (
              <button
                onClick={connectOutlook}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
                Connect Outlook
              </button>
            )}
          </div>

          {isConnected && (
            <>
              <div className="border-t border-white/10 pt-6 mt-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  Search Invoices
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Supplier Name</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="fresco, booker, bidfood..."
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Time Period</label>
                    <select
                      value={months}
                      onChange={(e) => setMonths(parseInt(e.target.value))}
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value={6}>Last 6 months</option>
                      <option value={12}>Last 12 months</option>
                      <option value={18}>Last 18 months</option>
                      <option value={24}>Last 24 months</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={fetchInvoices}
                  disabled={fetching}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {fetching ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Fetch Invoices
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
              <div className="text-gray-400 text-sm mb-1">Emails Found</div>
              <p className="text-3xl font-bold text-white">{stats.emails_found}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-xl rounded-2xl p-5 border border-emerald-500/30">
              <div className="text-emerald-400 text-sm mb-1">Invoices Parsed</div>
              <p className="text-3xl font-bold text-white">{stats.invoices_parsed}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/30">
              <div className="text-blue-400 text-sm mb-1">Date Range</div>
              <p className="text-lg font-bold text-white">{stats.date_range.from} to {stats.date_range.to}</p>
            </div>
          </div>
        )}

        {/* Invoices List */}
        {invoices.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                Fetched Invoices ({invoices.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={analyzeInProductChurn}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg transition-all text-sm font-semibold"
                >
                  <Package className="w-4 h-4" />
                  Analyze Churn
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Date</th>
                    <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Invoice #</th>
                    <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Subject</th>
                    <th className="text-center py-4 px-5 text-gray-400 font-medium text-sm">Products</th>
                    <th className="text-right py-4 px-5 text-gray-400 font-medium text-sm">Total</th>
                    <th className="text-left py-4 px-5 text-gray-400 font-medium text-sm">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 50).map((inv, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-5 text-white">{inv.date}</td>
                      <td className="py-4 px-5 text-gray-300 font-mono text-sm">{inv.invoice_number}</td>
                      <td className="py-4 px-5 text-gray-400 text-sm max-w-[200px] truncate" title={inv.email_subject}>
                        {inv.email_subject || '-'}
                      </td>
                      <td className="py-4 px-5 text-center text-gray-400">
                        {inv.products.length > 0 ? inv.products.length : '-'}
                      </td>
                      <td className="py-4 px-5 text-right text-emerald-400 font-medium">
                        £{inv.total_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-5 text-gray-400">{inv.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoices.length > 50 && (
              <div className="px-5 py-4 border-t border-white/5 text-center">
                <p className="text-gray-400 text-sm">Showing 50 of {invoices.length} invoices</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!isConnected && (
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-400/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Connect Your Outlook</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Connect your info@tastepizza.uk Outlook account to automatically fetch and analyze invoices from Fresco Food Services
            </p>
            <div className="flex flex-col gap-3 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">1</div>
                Click "Connect Outlook" to sign in with Microsoft
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">2</div>
                Search for supplier invoices (e.g., Fresco)
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">3</div>
                Export to CSV or analyze directly in Product Churn
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
