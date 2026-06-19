import { useEffect, useState } from "react";

import { delayReasons } from "../data/delayReasons";
import { buildReportsFromWeeklyData } from "../services/reportService";
import { subscribeToWeeklyData } from "../services/weeklyReportService";
import { exportCsv, printReport } from "../utils/exportCsv";

const reportConfig = [
  {
    key: "concreteReport",
    title: "Daily Report",
    description: "Current-date engineer daily progress entries.",
    filename: "daily-report.csv",
  },
  {
    key: "combinedReport",
    title: "Weekly Report",
    description: "Week 1 to Week 4 planned, actual, balance, and achievement.",
    filename: "combined-weekly-report.csv",
  },
  {
    key: "delayReport",
    title: "Monthly Summary",
    description: "Shortfall observations and monthly management summary.",
    filename: "monthly-summary.csv",
  },
  {
    key: "monthlyPerformanceReport",
    title: "Previous Months Performance",
    description: "Historical planned, achieved, variance, and weekly breakdown.",
    filename: "monthly-performance.csv",
  },
  {
    key: "dailyReconciliationReport",
    title: "Daily Log Reconciliation",
    description: "Uploaded actual tracking compared with engineer daily logs.",
    filename: "daily-log-reconciliation.csv",
  },
];

const filterableReportKeys = ["delayReport", "dailyReconciliationReport"];

const initialReportFilter = {
  fromDate: "",
  toDate: "",
  sortBy: "",
  reason: "",
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getRowDates = (row) =>
  String(row["Daily Log Dates"] || row.Date || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const getFirstRowDate = (row) => getRowDates(row)[0] || "";

const isDateInRange = (dateValue, fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  return (!fromDate || dateValue >= fromDate) && (!toDate || dateValue <= toDate);
};

const getTowerSortValue = (row) =>
  String(row.Tower || row.Location || row["Tower / Level / Pour / Activity"] || "");

function Reports() {
  const [reports, setReports] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportFilters, setReportFilters] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToWeeklyData((weeklyData) => {
      try {
        setReports(buildReportsFromWeeklyData(weeklyData));
      } catch (error) {
        console.error(error);
        setErrorMessage("Reports could not be loaded.");
      }
    });

    return () => unsubscribe();
  }, []);

  const renderPreview = (rows, report) => {
    if (!rows || rows.length === 0) {
      return <p className="mt-4 rounded-lg bg-slate-100 p-4 text-slate-600">No rows available.</p>;
    }

    const headers = Object.keys(rows[0]);
    const previewRows = report.key === "delayReport" ? rows : rows.slice(0, 4);

    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-slate-100">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border p-2 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td key={header} className="border p-2">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getReportTitle = (report) => {
    if (report.key === "concreteReport" && reports?.reportDates?.dailyReportDateLabel) {
      return `${report.title} - ${reports.reportDates.dailyReportDateLabel}`;
    }

    return report.title;
  };

  const getReportFilename = (report) => {
    if (report.key === "concreteReport" && reports?.reportDates?.dailyReportDate) {
      return `daily-report-${reports.reportDates.dailyReportDate}.csv`;
    }

    return report.filename;
  };

  const updateReportFilter = (reportKey, field, value) => {
    setReportFilters((current) => ({
      ...current,
      [reportKey]: {
        ...initialReportFilter,
        ...(current[reportKey] || {}),
        [field]: value,
      },
    }));
  };

  const getFilteredRows = (report, rows) => {
    if (!filterableReportKeys.includes(report.key)) {
      return rows;
    }

    const filters = {
      ...initialReportFilter,
      ...(reportFilters[report.key] || {}),
    };
    const filteredRows = rows.filter((row) => {
      const dates = getRowDates(row);
      const reason = normalizeText(row["Shortfall Reason"] || row.Reason);
      const matchesDate =
        !filters.fromDate && !filters.toDate
          ? true
          : dates.some((date) => isDateInRange(date, filters.fromDate, filters.toDate));
      const matchesReason = filters.reason
        ? reason
            .split(",")
            .map((value) => normalizeText(value))
            .includes(normalizeText(filters.reason))
        : true;

      return matchesDate && matchesReason;
    });

    if (filters.sortBy === "tower") {
      return [...filteredRows].sort((first, second) =>
        getTowerSortValue(first).localeCompare(getTowerSortValue(second), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }

    if (filters.sortBy === "date") {
      return [...filteredRows].sort((first, second) =>
        getFirstRowDate(first).localeCompare(getFirstRowDate(second))
      );
    }

    return filteredRows;
  };

  const renderReportFilters = (report) => {
    if (!filterableReportKeys.includes(report.key)) {
      return null;
    }

    const filters = {
      ...initialReportFilter,
      ...(reportFilters[report.key] || {}),
    };

    return (
      <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">From Date</span>
          <input
            type="date"
            className="w-full rounded-lg border bg-white p-3"
            value={filters.fromDate}
            onChange={(event) => updateReportFilter(report.key, "fromDate", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">To Date</span>
          <input
            type="date"
            className="w-full rounded-lg border bg-white p-3"
            value={filters.toDate}
            onChange={(event) => updateReportFilter(report.key, "toDate", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">Sort</span>
          <select
            className="w-full rounded-lg border bg-white p-3"
            value={filters.sortBy}
            onChange={(event) => updateReportFilter(report.key, "sortBy", event.target.value)}
          >
            <option value="">Default</option>
            <option value="date">Date Wise</option>
            <option value="tower">Tower Wise Ascending</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">Shortfall Reason</span>
          <select
            className="w-full rounded-lg border bg-white p-3"
            value={filters.reason}
            onChange={(event) => updateReportFilter(report.key, "reason", event.target.value)}
          >
            <option value="">All Reasons</option>
            {delayReasons
              .filter((reason) => reason !== "Not Applicable")
              .map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
          </select>
        </label>
      </div>
    );
  };

  return (
    <div>
      <p className="mb-8 text-slate-600">Export daily, weekly, monthly, Excel-compatible CSV, and print-ready reports.</p>
      {errorMessage && (
        <p className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-700">
          {errorMessage}
        </p>
      )}
      {reports?.weeklyData && !reports.weeklyData.hasTodayProgress && (
        <p className="mb-5 rounded-lg bg-amber-50 p-4 font-semibold text-amber-800">
          Warning: Please log your Daily Progress Tracking for today ({reports.weeklyData.todayKey}).
        </p>
      )}

      {!reports ? (
        <div className="rounded-xl bg-white p-6 shadow">Loading reports...</div>
      ) : (
        <div className="space-y-5">
          {reportConfig.map((report) => {
            const rows = reports[report.key] || [];
            const filteredRows = getFilteredRows(report, rows);

            return (
              <section key={report.key} className="rounded-xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{getReportTitle(report)}</h2>
                    <p className="mt-1 text-slate-600">{report.description}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {filteredRows.length} rows ready
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => exportCsv(getReportFilename(report), filteredRows)}
                      className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => printReport(getReportTitle(report), filteredRows)}
                      className="rounded-lg bg-slate-800 px-4 py-3 font-semibold text-white"
                    >
                      Print PDF
                    </button>
                  </div>
                </div>

                {renderReportFilters(report)}
                {renderPreview(filteredRows, report)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reports;
