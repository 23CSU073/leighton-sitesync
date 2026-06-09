import { useEffect, useState } from "react";

import { getWeeklyData } from "../services/weeklyReportService";

function WeeklyReport({ setCurrentPage }) {
  const [weeklyData, setWeeklyData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getWeeklyData();
        setWeeklyData(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  if (!weeklyData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <h1 className="text-2xl font-bold">Loading Weekly Report...</h1>
      </div>
    );
  }

  const {
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    weeklyRows = [],
    lookAheadWeeks = [],
  } = weeklyData;
  const shortfall = Number((totalAchieved - totalPlan).toFixed(1));

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        {"<- Back"}
      </button>

      <h1 className="text-4xl font-bold mb-8">Weekly Report</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Week 1 Progress</h2>

        <table className="w-full border">
          <thead className="bg-yellow-100">
            <tr>
              <th className="border p-3">Location</th>
              <th className="border p-3">Plan FTW</th>
              <th className="border p-3">Achieved</th>
              <th className="border p-3">% Achv</th>
              <th className="border p-3">Weekly Shortfall</th>
            </tr>
          </thead>
          <tbody>
            {weeklyRows.length > 0 ? (
              weeklyRows.map((row) => (
                <tr key={row.location}>
                  <td className="border p-3 font-semibold">{row.location}</td>
                  <td className="border p-3">{row.plan}</td>
                  <td className="border p-3">{row.achieved}</td>
                  <td className="border p-3">{row.percentage}%</td>
                  <td
                    className={`border p-3 font-bold ${
                      row.shortfall >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {row.shortfall}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border p-3" colSpan={5}>
                  No weekly data available yet.
                </td>
              </tr>
            )}

            <tr className="bg-green-100 font-bold">
              <td className="border p-3">Total</td>
              <td className="border p-3">{totalPlan}</td>
              <td className="border p-3">{totalAchieved}</td>
              <td className="border p-3">{percentage}%</td>
              <td
                className={`border p-3 ${
                  shortfall >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {shortfall}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Look Ahead</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {lookAheadWeeks.map((week) => (
            <div key={week.label} className="bg-blue-600 text-white p-5 rounded-xl text-center">
              <h3 className="text-xl font-bold">{week.label}</h3>
              <p className="mt-3 text-3xl">{week.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Summary for Month</h2>

        <table className="w-full border">
          <thead className="bg-green-100">
            <tr>
              <th className="border p-3">Plan</th>
              <th className="border p-3">Achieved</th>
              <th className="border p-3">% Achv</th>
              <th className="border p-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-3">{totalPlan}</td>
              <td className="border p-3">{totalAchieved}</td>
              <td className="border p-3">{percentage}%</td>
              <td className="border p-3">{balance}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WeeklyReport;
