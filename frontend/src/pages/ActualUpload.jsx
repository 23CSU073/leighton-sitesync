import { useEffect, useMemo, useState } from "react";

import { parseExcelFile } from "../utils/excelParser";
import { extractActualTracking } from "../utils/extractActualTracking";
import { replaceActualTracking, subscribeToActualTracking } from "../services/actualTrackingService";

function ActualUpload() {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actualRows, setActualRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please select an Excel file first.");
      return;
    }

    try {
      setUploading(true);
      setUploaded(false);
      setErrorMessage("");

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
    } catch (error) {
      console.error(error);
      setErrorMessage("Upload failed. Please check the Excel format and try again.");
    } finally {
      setUploading(false);
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
      </div>
    </div>
  );
}

export default ActualUpload;
