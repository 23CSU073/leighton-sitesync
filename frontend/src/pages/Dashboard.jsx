import { useEffect, useState } from "react";

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

const getWeekIndexForDate = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getDate();

  if (day >= 1 && day <= 7) return 0;
  if (day >= 8 && day <= 14) return 1;
  if (day >= 15 && day <= 22) return 2;
  if (day >= 23 && day <= 30) return 3;
  return null;
};

const weekStartDays = [1, 8, 15, 23];

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeReconciliationActivity = (activity) => {
  const normalized = normalizeText(activity);

  return normalized.includes("concrete") ? "concrete" : normalized;
};

const getReconciliationKey = (item) =>
  [
    normalizeText(item.tower),
    normalizeText(item.level),
    normalizeText(item.pour || item.core),
    normalizeReconciliationActivity(item.activity),
  ].join("|");

const getReconciliationLabel = (item) =>
  [item.tower, item.level, item.pour || item.core, item.activity]
    .filter(Boolean)
    .join(" / ");

const getProgressReason = (item) => item.reason || item.hindranceReason || "";

const isApplicableReason = (reason) =>
  Boolean(reason) && normalizeText(reason) !== "not applicable";

const buildReasonMap = (progress) => {
  const reasonMap = new Map();

  progress.forEach((item) => {
    const reason = getProgressReason(item);

    if (!isApplicableReason(reason)) {
      return;
    }

    const key = getReconciliationKey(item);
    const existing = reasonMap.get(key) || new Set();

    existing.add(reason);
    reasonMap.set(key, existing);
  });

  return reasonMap;
};

const getReasonsForKey = (reasonMap, key) =>
  [...(reasonMap.get(key) || [])].join(", ");

const buildReconciliationRows = (actuals, progress, cutoffDate) => {
  const cutoffWeekIndex = getWeekIndexForDate(cutoffDate);
  const actualMap = new Map();
  const dailyMap = new Map();
  const reasonMap = buildReasonMap(
    progress.filter((item) => !cutoffDate || item.date <= cutoffDate)
  );

  actuals.forEach((item) => {
    const key = getReconciliationKey(item);
    const weeklyActual = Array.isArray(item.weeklyActual) ? item.weeklyActual : [];
    const actualTillDate = weeklyActual.length > 0
      ? weeklyActual
          .slice(0, cutoffWeekIndex + 1)
          .reduce((sum, value) => sum + Number(value || 0), 0)
      : Number(item.actualQuantity || 0);
    const existing = actualMap.get(key) || {
      key,
      label: getReconciliationLabel(item),
      actual: 0,
    };

    existing.actual += actualTillDate;
    actualMap.set(key, existing);
  });

  progress
    .filter((item) => !cutoffDate || item.date <= cutoffDate)
    .forEach((item) => {
      const key = getReconciliationKey(item);
      const existing = dailyMap.get(key) || {
        key,
        label: getReconciliationLabel(item),
        daily: 0,
      };

      existing.daily += Number(item.quantity || 0);
      dailyMap.set(key, existing);
    });

  return [...new Set([...actualMap.keys(), ...dailyMap.keys()])]
    .map((key) => {
      const actual = actualMap.get(key);
      const daily = dailyMap.get(key);
      const actualQuantity = Number(actual?.actual || 0);
      const dailyQuantity = Number(daily?.daily || 0);
      const variance = dailyQuantity - actualQuantity;
      let status = "Matched";

      if (actualQuantity > 0 && dailyQuantity === 0) {
        status = "Daily Log Missing";
      } else if (actualQuantity === 0 && dailyQuantity !== 0) {
        status = "Only Daily Log Found";
      } else if (Math.abs(variance) > 0.1) {
        status = "Quantity Mismatch";
      }

      return {
        key,
        label: actual?.label || daily?.label || "Unmapped",
        actual: actualQuantity,
        daily: dailyQuantity,
        variance,
        status,
        reason: getReasonsForKey(reasonMap, key),
      };
    })
    .filter((row) => row.actual > 0 || row.daily !== 0)
    .sort((first, second) => Math.abs(second.variance) - Math.abs(first.variance));
};

const getChartDateKey = (dateValue) => {
  if (dateValue?.toDate) {
    return dateValue.toDate().toISOString().split("T")[0];
  }

  if (dateValue instanceof Date) {
    return dateValue.toISOString().split("T")[0];
  }

  return String(dateValue || new Date().toISOString().split("T")[0]).split("T")[0];
};

const getFallbackWeekDate = (monthKey, weekIndex) => {
  const [year, month] = String(monthKey || "").split("-");
  const date = new Date(Number(year), Number(month) - 1, weekStartDays[weekIndex] || 1);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const addToDateMap = (map, date, value) => {
  if (!date) {
    return;
  }

  map[date] = (map[date] || 0) + Number(value || 0);
};

const buildDailyChartRows = (progress, totalPlan, actuals = [], plans = [], weekIndex = 0, monthKey = "") => {
  const plannedMap = plans.reduce((map, plan) => {
    const date = plan.planDate ? getChartDateKey(plan.planDate) : "";

    if (date && getWeekIndexForDate(date) === weekIndex) {
      addToDateMap(map, date, Number(plan.plannedQuantity || plan.monthPlan || 0));
    }

    return map;
  }, {});
  const actualSource = actuals.length > 0 ? actuals : progress;
  const dailyActualMap = actualSource.reduce((map, item) => {
    const date = item.date ? getChartDateKey(item.date) : "";

    if (date && getWeekIndexForDate(date) === weekIndex) {
      addToDateMap(
        map,
        date,
        actuals.length > 0 ? Number(item.actualQuantity || item.quantity || 0) : Number(item.quantity || 0)
      );
      return map;
    }

    if (actuals.length > 0 && !date && Array.isArray(item.weeklyActual)) {
      const fallbackDate = getFallbackWeekDate(monthKey, weekIndex);
      addToDateMap(map, fallbackDate, Number(item.weeklyActual[weekIndex] || 0));
    }

    return map;
  }, {});
  const dates = [...new Set([...Object.keys(plannedMap), ...Object.keys(dailyActualMap)])].sort();

  if (dates.length === 0) {
    return [];
  }

  const hasDatedPlan = Object.keys(plannedMap).length > 0;
  const fallbackDailyPlan = hasDatedPlan ? 0 : Number(totalPlan || 0) / dates.length;
  let plannedCumulative = 0;
  let actualCumulative = 0;

  return dates.map((date) => {
    const planned = hasDatedPlan ? Number(plannedMap[date] || 0) : fallbackDailyPlan;
    const actual = Number(dailyActualMap[date] || 0);
    plannedCumulative += planned;
    actualCumulative += actual;

    return {
      date,
      label: formatDateLabel(date),
      planned,
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

function DonutChart({ planned, tracked }) {
  const plannedValue = Number(planned || 0);
  const trackedValue = Number(tracked || 0);
  const chartTotal = Math.max(plannedValue, trackedValue, 1);
  const trackedPercent = Math.min((trackedValue / chartTotal) * 100, 100);
  const items = [
    { label: "Tracked", value: trackedValue, hex: "#16a34a" },
    { label: "Planned", value: plannedValue, hex: "#f97316" },
  ];
  const gradient =
    trackedPercent >= 100
      ? "#16a34a 0% 100%"
      : `#16a34a 0% ${trackedPercent}%, #f97316 ${trackedPercent}% 100%`;

  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[180px_1fr]">
      <div
        className="relative h-44 w-44 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
          <span className="text-xs font-semibold text-slate-500">Total</span>
          <span className="text-2xl font-bold">{formatNumber(plannedValue)}</span>
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
  const height = 320;
  const padding = { top: 44, right: 28, bottom: 66, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxDataValue = Math.max(...rows.map((row) => Math.max(row.plan, row.achieved)), 1);
  const maxValue = maxDataValue * 1.18;
  const groupWidth = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(Math.min(groupWidth / 3, 24), 8);
  const formatXAxisLabel = (value) =>
    String(value || "")
      .replace(/^Overall Towers \(Cumulative\)$/i, "Overall")
      .replace(/^NTA Central Area$/i, "NTA")
      .replace(/\bTower\s+(\d+)/gi, "T$1");
  const splitLabel = (label) => {
    if (label.length <= 10) {
      return [label];
    }

    const words = label.split(" ");
    const midpoint = Math.ceil(words.length / 2);

    return words.length > 1
      ? [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")]
      : [label];
  };

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
            const label = formatXAxisLabel(row.tower);
            const labelLines = splitLabel(label);
            const labelY = Math.min(
              chartHeight - Math.max(planHeight, actualHeight) - 10,
              chartHeight - 12
            );

            return (
              <g key={row.tower}>
                <rect x={x - barWidth - 2} y={chartHeight - planHeight} width={barWidth} height={planHeight} fill="#2563eb" />
                <rect x={x + 2} y={chartHeight - actualHeight} width={barWidth} height={actualHeight} fill="#f97316" />
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  className="fill-slate-700 text-[9px]"
                >
                  {labelLines.map((line, lineIndex) => (
                    <tspan key={line} x={x} dy={lineIndex === 0 ? 0 : 10}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <text x={x} y={chartHeight + 20} textAnchor="middle" className="fill-slate-500 text-[9px]">
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

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState();
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyData(setDashboardData, {
      selectedWeekIndex,
      selectedMonthKey,
    });

    return () => unsubscribe();
  }, [selectedWeekIndex, selectedMonthKey]);

  if (!dashboardData) {
    return <div className="rounded-lg bg-white p-6 shadow">Loading Dashboard...</div>;
  }

  const {
    totalPlan,
    totalMonthPlan,
    totalAchieved,
    percentage,
    weeklyRows = [],
    actuals = [],
    progress = [],
    plans = [],
    monthOptions = [],
    hasTodayProgress = true,
    todayKey = "",
    selectedMonth = "",
    selectedMonthLabel = "",
    missingCurrentMonthPlan = false,
    missingSelectedMonthPlan = false,
    monthPerformanceRows = [],
  } = dashboardData;
  const dailyTracked = sumQuantity(progress, "quantity");
  const variance = Number((totalAchieved - totalPlan).toFixed(1));
  const dailyVariance = Number((dailyTracked - totalPlan).toFixed(1));
  const trackedQuantity = totalAchieved;
  const plannedQuantity = totalPlan;
  const dailyChartRows = buildDailyChartRows(
    progress,
    totalPlan,
    actuals,
    plans,
    dashboardData.currentWeekIndex,
    selectedMonth
  );
  const towerRows = Object.values(
    weeklyRows.reduce((groups, row) => {
      const key = row.tower || row.location || "Other";
      groups[key] = groups[key] || { tower: key, plan: 0, achieved: 0 };
      groups[key].plan += Number(row.plan || 0);
      groups[key].achieved += Number(row.achieved || 0);
      return groups;
    }, {})
  );
  const chartTowerRows = [
    ...towerRows
    .sort((first, second) => Math.max(second.plan, second.achieved) - Math.max(first.plan, first.achieved))
      .slice(0, 10),
    {
      tower: "Overall Towers (Cumulative)",
      plan: totalPlan,
      achieved: totalAchieved,
    },
  ];
  const reconciliationRows = buildReconciliationRows(actuals, progress, reconciliationDate);
  const reconciliationTotals = reconciliationRows.reduce(
    (totals, row) => ({
      actual: totals.actual + Number(row.actual || 0),
      daily: totals.daily + Number(row.daily || 0),
      variance: totals.variance + Number(row.variance || 0),
      flagged: totals.flagged + (row.status === "Matched" ? 0 : 1),
    }),
    { actual: 0, daily: 0, variance: 0, flagged: 0 }
  );

  return (
    <div className="space-y-6">
      {missingCurrentMonthPlan && (
        <p className="rounded-lg bg-amber-50 p-4 font-semibold text-amber-800">
          Current month planner is not uploaded yet. Please upload the monthly planner to start this month&apos;s dashboard.
        </p>
      )}
      {missingSelectedMonthPlan && (
        <p className="rounded-lg bg-amber-50 p-4 font-semibold text-amber-800">
          No planner found for {selectedMonthLabel || "the selected month"}. Please upload that monthly planner first.
        </p>
      )}
      {!hasTodayProgress && (
        <p className="rounded-lg bg-amber-50 p-4 font-semibold text-amber-800">
          Warning: Please log your Daily Progress Tracking for today ({todayKey}).
        </p>
      )}
      <section className="rounded-lg bg-white p-5 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Progress Period</h2>
            <p className="mt-1 text-slate-600">Switch month and week to refresh dashboard charts.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="rounded-lg border bg-white p-3 font-semibold"
              value={selectedMonthKey}
              onChange={(event) => setSelectedMonthKey(event.target.value)}
            >
              <option value="">Current / Latest Month</option>
              {monthOptions.map((month) => (
                <option key={month.key} value={month.key}>{month.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-4 overflow-hidden rounded-lg border">
              {[0, 1, 2, 3].map((weekIndex) => (
                <button
                  key={weekIndex}
                  onClick={() => setSelectedWeekIndex(weekIndex)}
                  className={`px-3 py-3 text-sm font-semibold ${
                    dashboardData.currentWeekIndex === weekIndex
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  Week {weekIndex + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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
          <p className="mt-1 text-sm text-slate-600">Tracked quantity against monthly planner quantity.</p>
          <div className="mt-5">
            <DonutChart planned={plannedQuantity} tracked={trackedQuantity} />
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Daily Log Reconciliation</h2>
            <p className="mt-1 text-slate-600">Uploaded actual tracking vs engineer daily logs up to selected date.</p>
          </div>
          <input
            type="date"
            className="rounded-lg border bg-white p-3 font-semibold"
            value={reconciliationDate}
            onChange={(event) => setReconciliationDate(event.target.value)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-600">Actual Tracking</p>
            <p className="text-2xl font-bold">{formatNumber(reconciliationTotals.actual)} Cum</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-600">Daily Logged</p>
            <p className="text-2xl font-bold">{formatNumber(reconciliationTotals.daily)} Cum</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-600">Daily - Actual</p>
            <p className={`text-2xl font-bold ${reconciliationTotals.variance < 0 ? "text-red-600" : "text-green-700"}`}>
              {formatNumber(reconciliationTotals.variance)} Cum
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 p-4">
            <p className="text-sm text-slate-600">Flagged Rows</p>
            <p className="text-2xl font-bold">{reconciliationTotals.flagged}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1040px] border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-3 text-left">Tower / Level / Pour / Activity</th>
                <th className="border p-3 text-left">Actual Till Date</th>
                <th className="border p-3 text-left">Daily Logged Till Date</th>
                <th className="border p-3 text-left">Variance</th>
                <th className="border p-3 text-left">Status</th>
                <th className="border p-3 text-left">Shortfall Reason</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationRows.length > 0 ? reconciliationRows.slice(0, 20).map((row) => (
                <tr key={row.key} className="odd:bg-white even:bg-slate-50">
                  <td className="border p-3 font-semibold">{row.label}</td>
                  <td className="border p-3">{formatNumber(row.actual)} Cum</td>
                  <td className="border p-3">{formatNumber(row.daily)} Cum</td>
                  <td className={`border p-3 font-semibold ${row.variance < 0 ? "text-red-600" : "text-green-700"}`}>
                    {formatNumber(row.variance)} Cum
                  </td>
                  <td className={`border p-3 font-semibold ${row.status === "Matched" ? "text-green-700" : "text-amber-700"}`}>
                    {row.status}
                  </td>
                  <td className="border p-3">{row.reason}</td>
                </tr>
              )) : (
                <tr>
                  <td className="border p-3 text-slate-600" colSpan={6}>No actual tracking or daily log rows found for reconciliation.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="text-2xl font-bold">Previous Months Performance Review</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-3 text-left">Month</th>
                <th className="border p-3 text-left">Planned</th>
                <th className="border p-3 text-left">Achieved</th>
                <th className="border p-3 text-left">Variance</th>
                <th className="border p-3 text-left">Achievement</th>
                <th className="border p-3 text-left">Weekly Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {monthPerformanceRows.length > 0 ? monthPerformanceRows.map((month) => (
                <tr key={month.monthKey} className="odd:bg-white even:bg-slate-50">
                  <td className="border p-3 font-semibold">{month.monthLabel}</td>
                  <td className="border p-3">{formatNumber(month.planned)} Cum</td>
                  <td className="border p-3">{formatNumber(month.achieved)} Cum</td>
                  <td className={`border p-3 font-semibold ${month.variance < 0 ? "text-red-600" : "text-green-700"}`}>
                    {formatNumber(month.variance)} Cum
                  </td>
                  <td className="border p-3">{month.percentage}%</td>
                  <td className="border p-3">
                    {month.weeklyBreakdown.map((week) => (
                      <span key={week.week} className="mr-3 inline-block whitespace-nowrap">
                        {week.week}: {formatNumber(week.achieved)} / {formatNumber(week.planned)}
                      </span>
                    ))}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="border p-3 text-slate-600" colSpan={6}>No monthly performance rows available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default Dashboard;
