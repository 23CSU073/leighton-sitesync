import { useEffect, useMemo, useState } from "react";

import { deleteProgress, subscribeToProgress } from "../services/dprService";
import { exportCsv } from "../utils/exportCsv";

const getMonthKeyFromDate = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey || "").split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const getCore = (item) => item.core || item.pour || "";

const getLoggedBy = (item) => item.engineerName || item.createdByEmail || item.createdBy || "";

const getReason = (item) => item.reason || item.hindranceReason || "";

const toHistoryRow = (item) => ({
  id: item.id,
  Date: item.date || "",
  Tower: item.tower || "",
  Core: getCore(item),
  Level: item.level || "",
  Activity: item.activity || "",
  "Quantity (Cum)": Number(item.quantity || 0),
  Shift: item.shift || "",
  "Reason / Remarks": getReason(item),
  "Logged By": getLoggedBy(item),
});

const filterRows = (rows, filters) =>
  rows.filter((row) => {
    const matchesTower = filters.tower ? row.Tower === filters.tower : true;
    const matchesActivity = filters.activity ? row.Activity === filters.activity : true;
    const matchesFromDate = filters.fromDate ? row.Date && row.Date >= filters.fromDate : true;
    const matchesToDate = filters.toDate ? row.Date && row.Date <= filters.toDate : true;

    return matchesTower && matchesActivity && matchesFromDate && matchesToDate;
  });

function LogHistory({ currentUser }) {
  const [progress, setProgress] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [filters, setFilters] = useState({
    tower: "",
    activity: "",
    fromDate: "",
    toDate: "",
  });
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToProgress(setProgress);

    return () => unsubscribe();
  }, []);

  const monthOptions = useMemo(() => {
    const keys = new Set(progress.map((item) => getMonthKeyFromDate(item.date)));

    return [...keys]
      .filter(Boolean)
      .sort()
      .reverse()
      .map((key) => ({ key, label: getMonthLabel(key) }));
  }, [progress]);

  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].key);
    }
  }, [monthOptions, selectedMonth]);

  const monthlyRows = progress
    .filter((item) => getMonthKeyFromDate(item.date) === selectedMonth)
    .sort((first, second) =>
      String(first.date || "").localeCompare(String(second.date || ""))
    )
    .map(toHistoryRow);
  const filteredRows = filterRows(monthlyRows, filters);
  const towerOptions = [...new Set(monthlyRows.map((row) => row.Tower).filter(Boolean))].sort();
  const activityOptions = [...new Set(monthlyRows.map((row) => row.Activity).filter(Boolean))].sort();
  const normalizedRole = String(currentUser?.role || "").trim().toLowerCase();
  const canDelete = ["admin", "planner"].includes(normalizedRole);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleDelete = async (row) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this log?");

    if (!confirmed) {
      return;
    }

    setDeletingId(row.id);
    setErrorMessage("");

    const success = await deleteProgress(row.id);

    setDeletingId("");

    if (!success) {
      setErrorMessage("Daily progress log could not be deleted.");
    }
  };

  const exportRows = filteredRows.map(({ id, ...row }) => row);

  return (
    <div className="space-y-5">
      {errorMessage && (
        <p className="rounded-lg bg-red-50 p-4 font-semibold text-red-700">{errorMessage}</p>
      )}

      <section className="rounded-lg bg-white p-5 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Log History</h2>
            <p className="mt-1 text-slate-600">Historical Daily Progress entries.</p>
          </div>
          <button
            type="button"
            onClick={() => exportCsv(`log-history-${selectedMonth || "all"}.csv`, exportRows)}
            disabled={filteredRows.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Month</span>
            <select
              className="w-full rounded-lg border bg-white p-3 font-semibold"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {monthOptions.length === 0 ? (
                <option value="">No months available</option>
              ) : (
                monthOptions.map((month) => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Tower</span>
            <select
              className="w-full rounded-lg border bg-white p-3"
              value={filters.tower}
              onChange={(event) => updateFilter("tower", event.target.value)}
            >
              <option value="">All Towers</option>
              {towerOptions.map((tower) => (
                <option key={tower} value={tower}>
                  {tower}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Activity</span>
            <select
              className="w-full rounded-lg border bg-white p-3"
              value={filters.activity}
              onChange={(event) => updateFilter("activity", event.target.value)}
            >
              <option value="">All Activities</option>
              {activityOptions.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">From Date</span>
            <input
              type="date"
              className="w-full rounded-lg border bg-white p-3"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-600">To Date</span>
            <input
              type="date"
              className="w-full rounded-lg border bg-white p-3"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
            />
          </label>
        </div>
      </section>

      {monthlyRows.length === 0 ? (
        <section className="rounded-lg bg-white p-5 shadow">
          <p className="font-semibold text-slate-700">No logs available for this month.</p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-lg bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Daily Progress Logs</h2>
            <p className="text-sm font-semibold text-slate-500">{filteredRows.length} rows</p>
          </div>

          <table className="w-full min-w-[1120px] border text-sm">
            <thead className="bg-slate-100">
              <tr>
                {[
                  "Date",
                  "Tower",
                  "Core",
                  "Level",
                  "Activity",
                  "Quantity (Cum)",
                  "Shift",
                  "Reason / Remarks",
                  "Logged By",
                  "Action",
                ].map((header) => (
                  <th key={header} className="border p-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="border p-3 text-slate-600" colSpan={10}>
                    No rows match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border p-3">{row.Date}</td>
                    <td className="border p-3">{row.Tower}</td>
                    <td className="border p-3">{row.Core}</td>
                    <td className="border p-3">{row.Level}</td>
                    <td className="border p-3">{row.Activity}</td>
                    <td className="border p-3">{row["Quantity (Cum)"]}</td>
                    <td className="border p-3">{row.Shift}</td>
                    <td className="border p-3">{row["Reason / Remarks"]}</td>
                    <td className="border p-3">{row["Logged By"]}</td>
                    <td className="border p-3">
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === row.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-slate-500">View only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default LogHistory;
