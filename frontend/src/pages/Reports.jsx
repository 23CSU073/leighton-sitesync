import { useEffect, useState } from "react";

import { getReports } from "../services/reportService";
import { exportCsv, printReport } from "../utils/exportCsv";

const reportConfig = [
  {
    key: "concreteReport",
    title: "Daily Report",
    description: "Tower and location level planned vs actual concrete quantities.",
    filename: "concrete-report.csv",
  },
  {
    key: "combinedReport",
    title: "Weekly Report",
    description: "Current week progress with upcoming weekly planned targets.",
    filename: "combined-weekly-report.csv",
  },
  {
    key: "delayReport",
    title: "Monthly Summary",
    description: "Shortfall observations and monthly management summary.",
    filename: "monthly-summary.csv",
  },
];

function Reports() {
  const [reports, setReports] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        setReports(data);
      } catch (error) {
        console.error(error);
        setErrorMessage("Reports could not be loaded.");
      }
    };

    fetchReports();
  }, []);

  const renderPreview = (rows) => {
    if (!rows || rows.length === 0) {
      return <p className="mt-4 rounded-lg bg-slate-100 p-4 text-slate-600">No rows available.</p>;
    }

    const headers = Object.keys(rows[0]);

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
            {rows.slice(0, 4).map((row, index) => (
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

  return (
    <div>
      <p className="mb-8 text-slate-600">Export daily, weekly, monthly, Excel-compatible CSV, and print-ready reports.</p>
      {errorMessage && (
        <p className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-700">
          {errorMessage}
        </p>
      )}

      {!reports ? (
        <div className="rounded-xl bg-white p-6 shadow">Loading reports...</div>
      ) : (
        <div className="space-y-5">
          {reportConfig.map((report) => {
            const rows = reports[report.key] || [];

            return (
              <section key={report.key} className="rounded-xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{report.title}</h2>
                    <p className="mt-1 text-slate-600">{report.description}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {rows.length} rows ready
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => exportCsv(report.filename, rows)}
                      className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => printReport(report.title, rows)}
                      className="rounded-lg bg-slate-800 px-4 py-3 font-semibold text-white"
                    >
                      Print PDF
                    </button>
                  </div>
                </div>

                {renderPreview(rows)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reports;
