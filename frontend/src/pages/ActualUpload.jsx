import { useEffect, useMemo, useState } from "react";

import { parseExcelFile } from "../utils/excelParser";
import { extractActualTracking } from "../utils/extractActualTracking";
import {
  deleteActualTrackingUpload,
  replaceActualTracking,
  subscribeToActualTracking,
} from "../services/actualTrackingService";

const getMonthDate = (monthLabel) => {
  const date = new Date(`${monthLabel || ""} 1`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getActualMonthKey = (actualRow) => {
  if (actualRow.actualMonthKey || actualRow.monthKey) {
    return actualRow.actualMonthKey || actualRow.monthKey;
  }

  const date = getMonthDate(actualRow.monthLabel || actualRow.month);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

function ActualUpload() {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actualRows, setActualRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [deletingMonthKey, setDeletingMonthKey] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToActualTracking(setActualRows);

    return () => unsubscribe();
  }, []);

  const uploadedSummary = useMemo(() => {
    if (actualRows.length === 0) {
      return null;
    }

    return {
      rows: actualRows.length,
      totalQuantity: actualRows.reduce(
        (sum, row) => sum + Number(row.actualQuantity || 0),
        0
      ),
      towers: new Set(actualRows.map((row) => row.tower)).size,
      month: actualRows.find((row) => row.monthLabel || row.month)?.monthLabel ||
        actualRows.find((row) => row.month)?.month ||
        "Uploaded actuals",
    };
  }, [actualRows]);

  const uploadedSummaries = useMemo(() => {
    const groups = actualRows.reduce((monthGroups, row) => {
      const monthKey = getActualMonthKey(row);

      monthGroups[monthKey] = monthGroups[monthKey] || {
        monthKey,
        month: row.monthLabel || row.month || monthKey,
        rows: 0,
        totalQuantity: 0,
        towers: new Set(),
      };
      monthGroups[monthKey].rows += 1;
      monthGroups[monthKey].totalQuantity += Number(row.actualQuantity || 0);
      monthGroups[monthKey].towers.add(row.tower);

      return monthGroups;
    }, {});

    return Object.values(groups)
      .map((group) => ({
        ...group,
        towers: group.towers.size,
      }))
      .sort((first, second) => second.monthKey.localeCompare(first.monthKey));
  }, [actualRows]);

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please select an Excel file first.");
      return;
    }

    try {
      setUploading(true);
      setUploaded(false);
      setErrorMessage("");
      setStatusMessage("");

      const rows = await parseExcelFile(file);
      const actualRows = extractActualTracking(rows);

      if (actualRows.length === 0) {
        setErrorMessage("No actual quantity rows were found in this workbook.");
        return;
      }

      const saved = await replaceActualTracking(actualRows);

      if (!saved) {
        setErrorMessage("Actual rows could not be saved. Please try again.");
        return;
      }

      const totalQuantity = actualRows.reduce(
        (sum, row) => sum + Number(row.actualQuantity || 0),
        0
      );
      const towers = new Set(actualRows.map((row) => row.tower)).size;

      setSummary({
        rows: actualRows.length,
        totalQuantity,
        towers,
      });
      setUploaded(true);
      setFile(null);
      setStatusMessage("Actual tracking upload saved.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Upload failed. Please check the Excel format and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteActualUpload = async (upload) => {
    const confirmed = window.confirm(
      `Delete actual tracking for ${upload.month}? This removes all rows for this upload.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingMonthKey(upload.monthKey);
      setErrorMessage("");
      setStatusMessage("");
      const deleted = await deleteActualTrackingUpload(upload.monthKey);

      setStatusMessage(
        deleted
          ? "Actual tracking upload deleted."
          : "Actual tracking upload could not be deleted. Please try again."
      );
      setSummary(null);
      setUploaded(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("Actual tracking upload could not be deleted. Please try again.");
    } finally {
      setDeletingMonthKey("");
    }
  };

  return (
    <div>
      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-xl font-semibold mb-5">
          Upload Actual Tracking Excel
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files[0]);
            setUploaded(false);
            setSummary(null);
            setErrorMessage("");
            setStatusMessage("");
          }}
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-5 w-full text-white p-4 rounded-xl ${
            uploaded ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {uploading
            ? "Uploading Actuals..."
            : uploaded
              ? "Uploaded Successfully"
              : "Upload Actual"}
        </button>

        {file && (
          <div className="mt-5">
            <p>Selected File:</p>
            <p className="font-bold">{file.name}</p>
          </div>
        )}

        {!file && uploadedSummary && (
          <div className="mt-5 rounded-lg bg-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-600">Current Firestore Upload</p>
            <p className="mt-1 font-bold">{uploadedSummary.month}</p>
          </div>
        )}

        {summary && (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Rows Imported</p>
              <p className="text-2xl font-bold">{summary.rows}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Total Actual</p>
              <p className="text-2xl font-bold">{summary.totalQuantity} Cum</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Locations</p>
              <p className="text-2xl font-bold">{summary.towers}</p>
            </div>
          </div>
        )}

        {!summary && uploadedSummary && (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Rows Uploaded</p>
              <p className="text-2xl font-bold">{uploadedSummary.rows}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Total Actual</p>
              <p className="text-2xl font-bold">{uploadedSummary.totalQuantity} Cum</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">Locations</p>
              <p className="text-2xl font-bold">{uploadedSummary.towers}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p className="mt-5 rounded-lg bg-green-50 p-4 font-semibold text-green-700">
            {statusMessage}
          </p>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-2xl font-bold">Uploaded Actual Tracking</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {uploadedSummaries.length > 0 ? uploadedSummaries.map((upload) => (
            <div key={upload.monthKey} className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">Actual Upload</p>
                  <h3 className="mt-1 text-2xl font-bold">{upload.month}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteActualUpload(upload)}
                  disabled={deletingMonthKey === upload.monthKey}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingMonthKey === upload.monthKey ? "Deleting..." : "Delete Upload"}
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="text-sm text-slate-600">Rows</p>
                  <p className="text-2xl font-bold">{upload.rows}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="text-sm text-slate-600">Total Actual</p>
                  <p className="text-2xl font-bold">{upload.totalQuantity.toFixed(1)} Cum</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="text-sm text-slate-600">Locations</p>
                  <p className="text-2xl font-bold">{upload.towers}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl bg-white p-5 shadow">No actual tracking upload found.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ActualUpload;
