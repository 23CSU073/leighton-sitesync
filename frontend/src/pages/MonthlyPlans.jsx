import { addMonthlyPlan } from "../services/monthlyPlanService";
import {extractMonthlyPlan} from "../utils/extractMonthlyPlan";
import { useState } from "react";
import { parseExcelFile } from "../utils/excelParser";

function MonthlyPlans({ setCurrentPage }) {

  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async () => {

  if (!file) {

    alert("Please select a file first");
    return;

  }

  try {

    // Read Excel
    const rows = await parseExcelFile(file);

    console.log("Excel rows:");
    console.log(rows);

    // Extract useful rows
    const plans = extractMonthlyPlan(rows);

    console.log("Extracted plans:");
    console.log(plans);

    console.log("Total plans =", plans.length);

    // Save into Firestore
    for (const plan of plans) {

      console.log("Saving:", plan);

      await addMonthlyPlan(plan);

    }

    setUploaded(true);

    alert("Monthly Plan Uploaded Successfully");

  }

  catch (error) {

    console.error(error);

    alert("Upload Failed");

  }

};

  return (
    <div className="min-h-screen bg-slate-100 p-5">

      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      <h1 className="text-4xl font-bold mb-8">
        Monthly Plans
      </h1>

      <div className="bg-white p-6 rounded-xl shadow">

        <p className="text-xl font-semibold mb-5">
          Upload Monthly Planner
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
        />

        <button
  onClick={handleUpload}
  className={`mt-5 w-full text-white p-4 rounded-xl font-semibold ${
    uploaded
      ? "bg-green-600"
      : "bg-orange-500"
  }`}
>
  {uploaded
    ? "✓ Uploaded Successfully"
    : "Upload Plan"}
</button>

        {file && (
          <div className="mt-5">

            <p>
              Selected File:
            </p>

            <p className="font-bold">
              {file.name}
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

export default MonthlyPlans;