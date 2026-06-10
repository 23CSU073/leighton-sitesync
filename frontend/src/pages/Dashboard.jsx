import { useEffect, useMemo, useState } from "react";

import {
  addReason,
  getDefaultShortfallReasons,
  subscribeToReasons,
} from "../services/reasonService";
import { subscribeToWeeklyData } from "../services/weeklyReportService";

const sumQuantity = (rows, field) =>
  rows.reduce((sum, row) => sum + Number(row[field] || row.actualQuantity || row.quantity || 0), 0);

const formatNumber = (value) => Number(value || 0).toFixed(1).replace(".0", "");

const formatDateLabel = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const buildDailyChartRows = (progress, totalPlan) => {
  const dailyActualMap = progress.reduce((map, item) => {
    const key = item.date || new Date().toISOString().split("T")[0];
    map[key] = (map[key] || 0) + Number(item.quantity || 0);
    return map;
  }, {});
  const dates = Object.keys(dailyActualMap).sort();
  const fallbackDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date.toISOString().split("T")[0];
  });
  const chartDates = dates.length > 0 ? dates : fallbackDates;
  const dailyPlan = chartDates.length > 0 ? Number(totalPlan || 0) / chartDates.length : 0;
  let plannedCumulative = 0;
  let actualCumulative = 0;

  return chartDates.map((date) => {
    const actual = Number(dailyActualMap[date] || 0);
    plannedCumulative += dailyPlan;
    actualCumulative += actual;

    return {
      date,
      label: formatDateLabel(date),
      planned: dailyPlan,
      actual,
      plannedCumulative,
      actualCumulative,
    };
  });
};

const getPolylinePoints = (rows, field, maxValue, chartWidth, chartHeight) =>
  rows
    .map((row, index) => {
      const x = rows.length <= 1 ? 0 : (index / (rows.length - 1)) * chartWidth;
      const y = chartHeight - (Number(row[field] || 0) / maxValue) * chartHeight;

      return `${x},${y}`;
    })
    .join(" ");

function HistogramSCurveChart({ rows }) {
  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 56, bottom: 58, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxBar = Math.max(...rows.map((row) => Math.max(row.planned, row.actual)), 1);
  const maxCurve = Math.max(...rows.map((row) => Math.max(row.plannedCumulative, row.actualCumulative)), 1);
  const groupWidth = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(Math.min(groupWidth / 3, 12), 4);
  const plannedPoints = getPolylinePoints(rows, "plannedCumulative", maxCurve, chartWidth, chartHeight);
  const actualPoints = getPolylinePoints(rows, "actualCumulative", maxCurve, chartWidth, chartHeight);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1="0"
                x2={chartWidth}
                y1={chartHeight - ratio * chartHeight}
                y2={chartHeight - ratio * chartHeight}
                stroke="#e2e8f0"
              />
              <text
                x="-10"
                y={chartHeight - ratio * chartHeight + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
              >
                {formatNumber(maxBar * ratio)}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const x = index * groupWidth + groupWidth / 2;
            const plannedHeight = (row.planned / maxBar) * chartHeight;
            const actualHeight = (row.actual / maxBar) * chartHeight;

            return (
              <g key={row.date}>
                <rect
                  x={x - barWidth - 1}
                  y={chartHeight - plannedHeight}
                  width={barWidth}
                  height={plannedHeight}
                  fill="#2563eb"
                />
                <rect
                  x={x + 1}
                  y={chartHeight - actualHeight}
                  width={barWidth}
                  height={actualHeight}
                  fill="#f97316"
                />
                <text
                  x={x}
                  y={chartHeight + 18}
                  transform={`rotate(-50 ${x} ${chartHeight + 18})`}
                  textAnchor="end"
                  className="fill-slate-600 text-[10px]"
                >
                  {row.label}
                </text>
              </g>
            );
          })}

          <polyline fill="none" stroke="#0f766e" strokeWidth="3" points={plannedPoints} />
          <polyline fill="none" stroke="#7c3aed" strokeWidth="3" points={actualPoints} />
          {rows.map((row, index) => {
            const x = rows.length <= 1 ? 0 : (index / (rows.length - 1)) * chartWidth;
            const plannedY = chartHeight - (row.plannedCumulative / maxCurve) * chartHeight;
            const actualY = chartHeight - (row.actualCumulative / maxCurve) * chartHeight;

            return (
              <g key={`${row.date}-dots`}>
                <circle cx={x} cy={plannedY} r="3" fill="#0f766e" />
                <circle cx={x} cy={actualY} r="3" fill="#7c3aed" />
              </g>
            );
          })}

          <line x1="0" x2="0" y1="0" y2={chartHeight} stroke="#94a3b8" />
          <line x1="0" x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke="#94a3b8" />
          <text x="-38" y={chartHeight / 2} transform={`rotate(-90 -38 ${chartHeight / 2})`} className="fill-slate-600 text-[11px]">
            Quantity
          </text>
          <text x={chartWidth / 2} y={chartHeight + 50} textAnchor="middle" className="fill-slate-600 text-[11px]">
            Date
          </text>
          <text x={chartWidth + 12} y="6" className="fill-slate-500 text-[10px]">
            Cum.
          </text>
        </g>
      </svg>
    </div>
  );
}

function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let cursor = 0;
  const gradient = items
    .map((item) => {
      const start = cursor;
      cursor += (Number(item.value || 0) / total) * 100;
      return `${item.hex} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[180px_1fr]">
      <div
        className="relative h-44 w-44 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
          <span className="text-xs font-semibold text-slate-500">Total</span>
          <span className="text-2xl font-bold">{formatNumber(total)}</span>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.hex }} />
              {item.label}
            </span>
            <span>{formatNumber(item.value)} Cum</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannedActualBarChart({ rows }) {
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 28, bottom: 72, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...rows.map((row) => Math.max(row.plan, row.achieved)), 1);
  const groupWidth = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(Math.min(groupWidth / 3, 24), 8);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1="0" x2={chartWidth} y1={chartHeight - ratio * chartHeight} y2={chartHeight - ratio * chartHeight} stroke="#e2e8f0" />
              <text x="-10" y={chartHeight - ratio * chartHeight + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                {formatNumber(maxValue * ratio)}
              </text>
            </g>
          ))}
          {rows.map((row, index) => {
            const x = index * groupWidth + groupWidth / 2;
            const planHeight = (row.plan / maxValue) * chartHeight;
            const actualHeight = (row.achieved / maxValue) * chartHeight;

            return (
              <g key={row.tower}>
                <rect x={x - barWidth - 2} y={chartHeight - planHeight} width={barWidth} height={planHeight} fill="#2563eb" />
                <rect x={x + 2} y={chartHeight - actualHeight} width={barWidth} height={actualHeight} fill="#f97316" />
                <text x={x} y={chartHeight + 18} textAnchor="middle" className="fill-slate-700 text-[10px]">
                  {row.tower}
                </text>
                <text x={x} y={chartHeight + 34} textAnchor="middle" className="fill-slate-500 text-[10px]">
                  {formatNumber(row.achieved - row.plan)}
                </text>
              </g>
            );
          })}
          <line x1="0" x2="0" y1="0" y2={chartHeight} stroke="#94a3b8" />
          <line x1="0" x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke="#94a3b8" />
        </g>
      </svg>
    </div>
  );
}

function Dashboard({ currentUser }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [shortfallReasons, setShortfallReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyData(setDashboardData);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToReasons("shortfallReasons", setShortfallReasons);

    return () => unsubscribe();
  }, []);

  const reasonOptions = useMemo(() => {
    const firestoreReasons = shortfallReasons.map((reason) => reason.name);

    return [...new Set([...getDefaultShortfallReasons(), ...firestoreReasons])];
  }, [shortfallReasons]);

  const handleSaveReason = async () => {
    const name = selectedReason === "Others" ? customReason : selectedReason;

    if (!name) {
      setErrorMessage("Select or enter a shortfall reason first.");
      return;
    }

    try {
      await addReason("shortfallReasons", name, currentUser?.email || "system");
      setSelectedReason("");
      setCustomReason("");
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Shortfall reason could not be saved.");
    }
  };

  if (!dashboardData) {
    return <div className="rounded-lg bg-white p-6 shadow">Loading Dashboard...</div>;
  }

  const {
    totalPlan,
    totalAchieved,
    percentage,
    weeklyRows = [],
    actuals = [],
    progress = [],
  } = dashboardData;
  const dailyTracked = sumQuantity(progress, "quantity");
  const variance = Number((totalAchieved - totalPlan).toFixed(1));
  const dailyVariance = Number((dailyTracked - totalPlan).toFixed(1));
  const concreteDistribution = [
    { label: "Planned", value: totalPlan, hex: "#2563eb" },
    { label: "Actual Tracking", value: sumQuantity(actuals, "actualQuantity"), hex: "#16a34a" },
    { label: "Daily Tracked", value: dailyTracked, hex: "#f97316" },
  ];
  const dailyChartRows = buildDailyChartRows(progress, totalPlan);
  const towerRows = Object.values(
    weeklyRows.reduce((groups, row) => {
      const key = row.tower || row.location || "Other";
      groups[key] = groups[key] || { tower: key, plan: 0, achieved: 0 };
      groups[key].plan += Number(row.plan || 0);
      groups[key].achieved += Number(row.achieved || 0);
      return groups;
    }, {})
  );
  const chartTowerRows = towerRows
    .sort((first, second) => Math.max(second.plan, second.achieved) - Math.max(first.plan, first.achieved))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {errorMessage && (
        <p className="rounded-lg bg-red-50 p-4 font-semibold text-red-700">{errorMessage}</p>
      )}

      <section className="overflow-x-auto rounded-lg bg-white p-5 shadow">
        <h2 className="mb-4 text-2xl font-bold">Summary Table</h2>
        <table className="w-full border text-left">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-3">Planned Quantity</th>
              <th className="border p-3">Actual Quantity</th>
              <th className="border p-3">Variance</th>
              <th className="border p-3">Completion %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-3">{totalPlan} Cum</td>
              <td className="border p-3">{totalAchieved} Cum</td>
              <td className={`border p-3 font-bold ${variance < 0 ? "text-red-600" : "text-green-700"}`}>
                {variance} Cum
              </td>
              <td className="border p-3">{percentage}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-2xl font-bold">Planned vs Actual (Live)</h2>
          <p className="mt-2 text-slate-600">Monthly Planner vs Actual Tracking</p>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-green-600" style={{ width: `${Math.min(Number(percentage), 100)}%` }} />
          </div>
          <p className="mt-3 font-semibold">{totalAchieved} / {totalPlan} Cum</p>
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-2xl font-bold">Planned vs Daily Tracked (Live)</h2>
          <p className="mt-2 text-slate-600">Monthly Planner vs Daily Progress Entries</p>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-orange-500"
              style={{ width: `${Math.min(totalPlan ? (dailyTracked / totalPlan) * 100 : 0, 100)}%` }}
            />
          </div>
          <p className={`mt-3 font-semibold ${dailyVariance < 0 ? "text-red-600" : "text-green-700"}`}>
            {dailyTracked} / {totalPlan} Cum, variance {dailyVariance} Cum
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Histogram and S-Curve</h2>
              <p className="mt-1 text-sm text-slate-600">X axis: date. Y axis: quantity.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-blue-600" /> Planned Qty</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-orange-500" /> Actual Qty</span>
              <span className="flex items-center gap-2"><span className="h-1 w-5 bg-teal-700" /> Planned Cum.</span>
              <span className="flex items-center gap-2"><span className="h-1 w-5 bg-violet-600" /> Actual Cum.</span>
            </div>
          </div>
          <HistogramSCurveChart rows={dailyChartRows} />
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Concrete Distribution</h2>
          <p className="mt-1 text-sm text-slate-600">Pie chart view of planned, actual tracking, and daily tracked quantity.</p>
          <div className="mt-5">
            <DonutChart items={concreteDistribution} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow xl:col-span-3">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Actual vs Planned Bar Graph</h2>
              <p className="mt-1 text-sm text-slate-600">Tower-wise comparison with variance below each tower.</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-blue-600" /> Planned</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-orange-500" /> Actual</span>
            </div>
          </div>
          <PlannedActualBarChart rows={chartTowerRows} />
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="text-2xl font-bold">Reasons for Shortfall</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            className="rounded-lg border p-3"
            value={selectedReason}
            onChange={(event) => setSelectedReason(event.target.value)}
          >
            <option value="">Select reason</option>
            {reasonOptions.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
            <option value="Others">Others</option>
          </select>
          {selectedReason === "Others" && (
            <input
              className="rounded-lg border p-3"
              placeholder="Enter custom reason"
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
            />
          )}
          <button onClick={handleSaveReason} className="rounded-lg bg-slate-900 p-3 font-semibold text-white">
            Save Reason
          </button>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
