export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="flex justify-between items-center px-8 py-4 bg-slate-900/50">
        <h1 className="text-2xl font-bold text-white">Churn Intelligence</h1>
        <div className="flex gap-4">
          <a href="/dashboard" className="text-white hover:text-blue-400">Customer Churn</a>
          <a href="/product-churn" className="text-white hover:text-indigo-400">Product Churn</a>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Sign In</button>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-3xl">
          <h2 className="text-6xl font-bold text-white mb-6">
            🎯 AI-Powered Customer Churn Detection
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Identify at-risk B2B customers before they leave.
          </p>

          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur p-6 rounded-lg border border-white/20">
              <p className="text-4xl font-bold text-blue-400 mb-2">92%</p>
              <p className="text-gray-300">Accuracy</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-lg border border-white/20">
              <p className="text-4xl font-bold text-green-400 mb-2">3.2K%</p>
              <p className="text-gray-300">Avg ROI</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-lg border border-white/20">
              <p className="text-4xl font-bold text-purple-400 mb-2">1000+</p>
              <p className="text-gray-300">Users</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <a href="/dashboard">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700">
                Customer Churn
              </button>
            </a>
            <a href="/product-churn">
              <button className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700">
                Product Churn
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
