import { useEffect, useMemo, useState } from "react";

import {
  addReason,
  getDefaultRiskReasons,
  getDefaultShortfallReasons,
  subscribeToReasons,
} from "../services/reasonService";
import {
  saveWeeklyReport,
  subscribeToWeeklyData,
  subscribeToWeeklyReports,
} from "../services/weeklyReportService";

const formatQty = (value) => Number(value || 0).toFixed(0);

const getPercent = (actual, plan) => {
  if (!Number(plan)) {
    return "0%";
  }

  return `${Math.round((Number(actual || 0) / Number(plan || 0)) * 100)}%`;
};

const getWeekNumber = (label) => {
  const match = String(label || "").match(/\d+/);

  return match ? Number(match[0]) : 1;
};

function WeeklyReport({ currentUser }) {
  const [weeklyData, setWeeklyData] = useState(null);
  const [shortfallReasons, setShortfallReasons] = useState([]);
  const [riskReasons, setRiskReasons] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [formData, setFormData] = useState({
    lookAhead: "",
    monthlySummary: "",
    shortfallReason: "",
    customShortfallReason: "",
    riskReason: "",
    customRiskReason: "",
  });

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyData(setWeeklyData);

    return () => unsubscribe();
  }, []);

  useEffect(() => subscribeToReasons("shortfallReasons", setShortfallReasons), []);
  useEffect(() => subscribeToReasons("riskReasons", setRiskReasons), []);
  useEffect(() => subscribeToWeeklyReports(setSavedReports), []);

  const shortfallOptions = useMemo(
    () => [...new Set([...getDefaultShortfallReasons(), ...shortfallReasons.map((item) => item.name)])],
    [shortfallReasons]
  );
  const riskOptions = useMemo(
    () => [...new Set([...getDefaultRiskReasons(), ...riskReasons.map((item) => item.name)])],
    [riskReasons]
  );

  if (!weeklyData) {
    return <div className="rounded-lg bg-white p-6 shadow">Loading Weekly Progress...</div>;
  }

  const {
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    weeklyRows = [],
    weeklyReportRows = [],
    lookAheadWeeks = [],
    currentWeek = "Week 1",
  } = weeklyData;
  const reportRows = weeklyReportRows.length > 0 ? weeklyReportRows : weeklyRows;
  const currentWeekNumber = getWeekNumber(currentWeek);
  const shortfall = Number(totalAchieved || 0) - Number(totalPlan || 0);
  const monthPlan = reportRows.reduce(
    (sum, row) => sum + Number(row.monthPlan || row.plannedQuantity || row.plan || 0),
    0
  );
  const monthAchieved = reportRows.reduce(
    (sum, row) => sum + Number(row.monthAchieved ?? row.achieved ?? 0),
    0
  );
  const monthBalance = Number(monthPlan || totalPlan || 0) - Number(monthAchieved || totalAchieved || 0);
  const lookAheadByWeek = [1, 2, 3, 4].reduce((weeks, week) => {
    const found = lookAheadWeeks.find((item) => getWeekNumber(item.label) === week);
    weeks[week] = found?.value || reportRows.reduce(
      (sum, row) => sum + Number(row.weeklyPlan?.[week - 1] || 0),
      0
    );
    return weeks;
  }, {});
  const cumulativeByWeek = [1, 2, 3, 4].reduce((weeks, week) => {
    weeks[week] = [1, 2, 3, 4]
      .filter((weekNumber) => weekNumber <= week)
      .reduce((sum, weekNumber) => sum + Number(lookAheadByWeek[weekNumber] || 0), 0);
    return weeks;
  }, {});
  const latestSavedReport = savedReports[0] || {};
  const selectedShortfallReason =
    formData.shortfallReason === "Others"
      ? formData.customShortfallReason
      : formData.shortfallReason || latestSavedReport.shortfallReason || "";
  const selectedRiskReason =
    formData.riskReason === "Others"
      ? formData.customRiskReason
      : formData.riskReason || latestSavedReport.riskReason || "";
  const reasonRows = [
    selectedShortfallReason || "No shortfall reason recorded yet.",
    formData.monthlySummary || latestSavedReport.monthlySummary || "No monthly summary recorded yet.",
  ];
  const riskRows = [
    selectedRiskReason || "No next-two-weeks risk recorded yet.",
    formData.lookAhead || latestSavedReport.lookAhead || "No look ahead note recorded yet.",
  ];

  const handleSave = async () => {
    const shortfallReason =
      formData.shortfallReason === "Others" ? formData.customShortfallReason : formData.shortfallReason;
    const riskReason = formData.riskReason === "Others" ? formData.customRiskReason : formData.riskReason;

    if (formData.shortfallReason === "Others" && formData.customShortfallReason) {
      await addReason("shortfallReasons", formData.customShortfallReason, currentUser?.email);
    }

    if (formData.riskReason === "Others" && formData.customRiskReason) {
      await addReason("riskReasons", formData.customRiskReason, currentUser?.email);
    }

    await saveWeeklyReport({
      week: currentWeek,
      lookAhead: formData.lookAhead,
      monthlySummary: formData.monthlySummary,
      shortfallReason,
      riskReason,
      rows: reportRows,
      createdBy: currentUser?.email || "system",
    });

    setSaveMessage("Weekly report notes saved.");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-4 shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border border-slate-700 text-center text-xs">
            <thead>
              <tr>
                <th colSpan={14} className="border border-slate-700 bg-slate-200 p-2 text-left text-base font-bold">
                  Elan The Presidential, Gurgaon
                </th>
              </tr>
              <tr>
                <th colSpan={14} className="border border-slate-700 bg-slate-900 p-2 text-left text-sm font-semibold text-white">
                  Leighton India Contractors Pvt. Ltd
                </th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 p-2" />
                <th colSpan={4} className="border border-slate-700 p-2">1</th>
                <th colSpan={3} className="border border-slate-700 p-2">2</th>
                <th colSpan={5} className="border border-slate-700 p-2">3</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 p-2" />
                <th colSpan={4} className="border border-slate-700 p-2">Weekly Progress</th>
                <th colSpan={3} className="border border-slate-700 p-2">Look Ahead</th>
                <th colSpan={5} className="border border-slate-700 p-2">Summary for the Month</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 p-2" />
                <th colSpan={4} className="border border-slate-700 p-2">
                  {currentWeek} Progress
                </th>
                <th colSpan={3} className="border border-slate-700 p-2">Plan</th>
                <th colSpan={5} className="border border-slate-700 p-2">For the Month w/s As on Date</th>
              </tr>
              <tr className="bg-yellow-100">
                <th className="border border-slate-700 p-2">Location</th>
                <th className="border border-slate-700 p-2">Plan FTW</th>
                <th className="border border-slate-700 p-2">Achieved</th>
                <th className="border border-slate-700 p-2">% Achv</th>
                <th className="border border-slate-700 p-2">Weekly Shortfall (-)</th>
                <th className="border border-slate-700 p-2">Week 2</th>
                <th className="border border-slate-700 p-2">Week 3</th>
                <th className="border border-slate-700 p-2">Week 4</th>
                <th className="border border-slate-700 p-2">Plan</th>
                <th className="border border-slate-700 p-2">Achieved</th>
                <th className="border border-slate-700 p-2">% Achv</th>
                <th className="border border-slate-700 p-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length > 0 ? reportRows.map((row) => {
                const rowMonthPlan = Number(row.monthPlan || row.plannedQuantity || row.plan || 0);
                const rowMonthAchieved = Number(row.monthAchieved ?? row.achieved ?? 0);
                const rowBalance = rowMonthPlan - rowMonthAchieved;

                return (
                  <tr key={row.key || row.location} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-700 p-2 text-left font-semibold">{row.location}</td>
                    <td className="border border-slate-700 p-2">{formatQty(row.plan)}</td>
                    <td className="border border-slate-700 p-2">{formatQty(row.achieved)}</td>
                    <td className="border border-slate-700 p-2">{row.percentage}%</td>
                    <td className={`border border-slate-700 p-2 font-bold ${row.shortfall < 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatQty(row.shortfall)}
                    </td>
                    <td className="border border-slate-700 p-2">{currentWeekNumber < 2 ? formatQty(row.weeklyPlan?.[1]) : "-"}</td>
                    <td className="border border-slate-700 p-2">{currentWeekNumber < 3 ? formatQty(row.weeklyPlan?.[2]) : "-"}</td>
                    <td className="border border-slate-700 p-2">{currentWeekNumber < 4 ? formatQty(row.weeklyPlan?.[3]) : "-"}</td>
                    <td className="border border-slate-700 p-2">{formatQty(rowMonthPlan)}</td>
                    <td className="border border-slate-700 p-2">{formatQty(rowMonthAchieved)}</td>
                    <td className="border border-slate-700 p-2">{getPercent(rowMonthAchieved, rowMonthPlan)}</td>
                    <td className="border border-slate-700 p-2">{formatQty(rowBalance)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="border border-slate-700 p-3 text-left" colSpan={12}>
                    No weekly progress rows available yet.
                  </td>
                </tr>
              )}
              <tr className="bg-green-200 font-bold">
                <td className="border border-slate-700 p-2 text-left">Total</td>
                <td className="border border-slate-700 p-2">{formatQty(totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(totalAchieved)}</td>
                <td className="border border-slate-700 p-2">{percentage}%</td>
                <td className={`border border-slate-700 p-2 ${shortfall < 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatQty(shortfall)}
                </td>
                <td className="border border-slate-700 p-2">{formatQty(lookAheadByWeek[2])}</td>
                <td className="border border-slate-700 p-2">{formatQty(lookAheadByWeek[3])}</td>
                <td className="border border-slate-700 p-2">{formatQty(lookAheadByWeek[4])}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthPlan || totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthAchieved || totalAchieved)}</td>
                <td className="border border-slate-700 p-2">{getPercent(totalAchieved, monthPlan || totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthBalance || balance)}</td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-700 p-2 text-left">Cumulative Total</td>
                <td colSpan={4} className="border border-slate-700 p-2">{formatQty(totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(cumulativeByWeek[2])}</td>
                <td className="border border-slate-700 p-2">{formatQty(cumulativeByWeek[3])}</td>
                <td className="border border-slate-700 p-2">{formatQty(cumulativeByWeek[4])}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthPlan || totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthAchieved || totalAchieved)}</td>
                <td className="border border-slate-700 p-2">{getPercent(monthAchieved || totalAchieved, monthPlan || totalPlan)}</td>
                <td className="border border-slate-700 p-2">{formatQty(monthBalance || balance)}</td>
              </tr>
              <tr className="font-bold">
                <td className="border border-slate-700 p-2 text-left">% Achieved</td>
                <td colSpan={4} className="border border-slate-700 p-2">{percentage}%</td>
                <td colSpan={3} className="border border-slate-700 p-2" />
                <td colSpan={4} className="border border-slate-700 p-2">{getPercent(totalAchieved, monthPlan || totalPlan)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <table className="w-full border border-slate-700 text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th colSpan={2} className="border border-slate-700 p-2">Reason for Shortfall</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="w-20 border border-slate-700 p-2">S.No.</th>
                <th className="border border-slate-700 p-2">Hindrances</th>
              </tr>
            </thead>
            <tbody>
              {reasonRows.map((reason, index) => (
                <tr key={reason}>
                  <td className="border border-slate-700 p-2 text-center">{index + 1}</td>
                  <td className="border border-slate-700 p-2">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full border border-slate-700 text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th colSpan={2} className="border border-slate-700 p-2">Risk for Next Two Weeks</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="w-20 border border-slate-700 p-2">S.No.</th>
                <th className="border border-slate-700 p-2">Hindrances</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map((risk, index) => (
                <tr key={risk}>
                  <td className="border border-slate-700 p-2 text-center">{index + 1}</td>
                  <td className="border border-slate-700 p-2">{risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="text-2xl font-bold">Weekly Notes</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <textarea
            className="min-h-28 rounded-lg border p-3"
            placeholder="Look Ahead"
            value={formData.lookAhead}
            onChange={(event) => setFormData({ ...formData, lookAhead: event.target.value })}
          />
          <textarea
            className="min-h-28 rounded-lg border p-3"
            placeholder="Monthly Summary"
            value={formData.monthlySummary}
            onChange={(event) => setFormData({ ...formData, monthlySummary: event.target.value })}
          />
          <div>
            <select
              className="w-full rounded-lg border p-3"
              value={formData.shortfallReason}
              onChange={(event) => setFormData({ ...formData, shortfallReason: event.target.value })}
            >
              <option value="">Reasons For Shortfall</option>
              {shortfallOptions.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              <option value="Others">Others</option>
            </select>
            {formData.shortfallReason === "Others" && (
              <input
                className="mt-3 w-full rounded-lg border p-3"
                placeholder="Custom shortfall reason"
                value={formData.customShortfallReason}
                onChange={(event) => setFormData({ ...formData, customShortfallReason: event.target.value })}
              />
            )}
          </div>
          <div>
            <select
              className="w-full rounded-lg border p-3"
              value={formData.riskReason}
              onChange={(event) => setFormData({ ...formData, riskReason: event.target.value })}
            >
              <option value="">Risks For Next Two Weeks</option>
              {riskOptions.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              <option value="Others">Others</option>
            </select>
            {formData.riskReason === "Others" && (
              <input
                className="mt-3 w-full rounded-lg border p-3"
                placeholder="Custom risk"
                value={formData.customRiskReason}
                onChange={(event) => setFormData({ ...formData, customRiskReason: event.target.value })}
              />
            )}
          </div>
        </div>
        <button onClick={handleSave} className="mt-4 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white">
          Save Weekly Progress
        </button>
        {saveMessage && <p className="mt-4 rounded-lg bg-green-50 p-3 font-semibold text-green-700">{saveMessage}</p>}
      </section>
    </div>
  );
}

export default WeeklyReport;
