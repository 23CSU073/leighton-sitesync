import { useState } from "react";

import { parseExcelFile } from "../utils/excelParser";
import { extractActualTracking } from "../utils/extractActualTracking";
import { addActualTracking } from "../services/actualTrackingService";

function ActualUpload({ setCurrentPage }) {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    try {
      const rows = await parseExcelFile(file);
      const actualRows = extractActualTracking(rows);

      for (const row of actualRows) {
        await addActualTracking(row);
      }

      setUploaded(true);
      alert("Actual Excel uploaded successfully");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        {"<- Back"}
      </button>

      <h1 className="text-4xl font-bold mb-8">
        Actual Excel Upload
      </h1>

      <div className="bg-white p-6 rounded-xl shadow">
        <p className="text-xl font-semibold mb-5">
          Upload Actual Tracking Excel
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={handleUpload}
          className={`mt-5 w-full text-white p-4 rounded-xl ${
            uploaded ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {uploaded ? "Uploaded Successfully" : "Upload Actual"}
        </button>

        {file && (
          <div className="mt-5">
            <p>Selected File:</p>
            <p className="font-bold">{file.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActualUpload;
