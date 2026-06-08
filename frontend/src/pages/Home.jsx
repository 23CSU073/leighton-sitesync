function Home({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-100 p-5">

      <h1 className="text-3xl font-bold text-center mb-2">
        Leighton SiteSync
      </h1>

      <p className="text-center text-gray-600 mb-8">
        Construction Planning & Progress Tracking
      </p>

      <div className="space-y-5">

        <button
          onClick={() => setCurrentPage("site-layout")}
          className="w-full bg-blue-600 text-white p-6 rounded-xl text-xl font-semibold shadow"
        >
          🏗 Site Layout
        </button>

        <button
          onClick={() => setCurrentPage("daily-progress")}
          className="w-full bg-green-600 text-white p-6 rounded-xl text-xl font-semibold shadow"
        >
          📝 Daily Progress
        </button>

        <button
          onClick={() => setCurrentPage("monthly-plans")}
          className="w-full bg-orange-500 text-white p-6 rounded-xl text-xl font-semibold shadow"
        >
          📅 Monthly Plans
        </button>

        <button
          onClick={() => setCurrentPage("dashboard")}
          className="w-full bg-purple-600 text-white p-6 rounded-xl text-xl font-semibold shadow"
        >
          📊 KPI Dashboard
        </button>

      </div>
    </div>
  );
}

export default Home;