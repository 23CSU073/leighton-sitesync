import { useState } from "react";

function MonthlyPlans({ setCurrentPage }) {
  const [activeMonth, setActiveMonth] = useState("June 2026");

  return (
    <div className="min-h-screen bg-slate-100 p-5">

      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-6">
        Monthly Plans
      </h1>

      <div className="bg-white p-5 rounded-xl shadow mb-5">
        <h2 className="font-bold text-xl">
          Active Plan
        </h2>

        <p className="text-green-600 mt-2 font-semibold">
          {activeMonth}
        </p>
      </div>

      <div className="space-y-4">

        <button
          className="w-full bg-blue-600 text-white p-4 rounded-xl"
        >
          Upload Monthly Plan
        </button>

        <button
          className="w-full bg-orange-500 text-white p-4 rounded-xl"
        >
          Replace Active Plan
        </button>

        <button
          className="w-full bg-purple-600 text-white p-4 rounded-xl"
        >
          View Previous Plans
        </button>

      </div>

    </div>
  );
}

export default MonthlyPlans;