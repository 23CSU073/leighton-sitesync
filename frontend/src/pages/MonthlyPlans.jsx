import { useEffect, useMemo, useState } from "react";

import { parseExcelFile } from "../utils/excelParser";
import { extractMonthlyPlan } from "../utils/extractMonthlyPlan";
import {
  deleteMonthlyPlanner,
  subscribeToMonthlyPlans,
  uploadMonthlyPlanner,
} from "../services/monthlyPlanService";

const currentDate = new Date();

const getPlanStatus = (plan) => plan.status || "active";

const getPlanDate = (plan) => {
  if (Number.isFinite(Number(plan.month)) && Number.isFinite(Number(plan.year))) {
    return {
      month: Number(plan.month),
      year: Number(plan.year),
    };
  }

  const date = new Date(`${plan.monthLabel || plan.month || ""} 1`);

  if (!Number.isNaN(date.getTime())) {
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  }

  return {
    month: "",
    year: "",
  };
};

const getPlanMonthKey = (plan) => {
  if (plan.planMonthKey || plan.planId) {
    return plan.planMonthKey || plan.planId;
  }

  const planDate = getPlanDate(plan);

  return `${planDate.year}-${String(planDate.month).padStart(2, "0")}`;
};

function MonthlyPlans() {
  const [file, setFile] = useState(null);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [plans, setPlans] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingPlanKey, setDeletingPlanKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToMonthlyPlans(setPlans);

    return () => unsubscribe();
  }, []);

  const planGroups = useMemo(() => {
    const grouped = plans.reduce((groups, plan) => {
      const status = getPlanStatus(plan);
      const planDate = getPlanDate(plan);
      const key = getPlanMonthKey(plan);

      groups[key] = groups[key] || {
        ...plan,
        ...planDate,
        status,
        planMonthKey: key,
        rowCount: 0,
        totalPlanned: 0,
      };
      groups[key].rowCount += 1;
      groups[key].totalPlanned += Number(plan.plannedQuantity || 0);

      return groups;
    }, {});

    return Object.values(grouped);
  }, [plans]);

  const activePlans = planGroups.filter((plan) => getPlanStatus(plan) === "active");
  const previousPlans = planGroups.filter((plan) => getPlanStatus(plan) === "archived");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      const rows = await parseExcelFile(file);
      const extractedPlans = extractMonthlyPlan(rows);

      if (extractedPlans.length === 0) {
        setMessage("No monthly planning rows were found in this workbook.");
        return;
      }

      await uploadMonthlyPlanner({
        rows: extractedPlans,
        month,
        year,
        uploadedBy: "Admin",
        fileName: file.name,
      });

      setFile(null);
      setMessage("Monthly planner uploaded. This month replaced any previous upload for the same month/year.");
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Please check the Excel format and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    const planKey = plan.planMonthKey || plan.planId;

    if (!planKey) {
      setMessage("This upload could not be identified for deletion.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the monthly planner for ${plan.month}/${plan.year}? This removes all rows for this upload.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPlanKey(planKey);
      setMessage("");
      const deleted = await deleteMonthlyPlanner(planKey);

      setMessage(
        deleted
          ? "Monthly planner upload deleted."
          : "Monthly planner could not be deleted. Please try again."
      );
    } catch (error) {
      console.error(error);
      setMessage("Monthly planner could not be deleted. Please try again.");
    } finally {
      setDeletingPlanKey("");
    }
  };

  const renderPlanCard = (plan) => (
    <div className="rounded-lg bg-white p-5 shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-slate-500">
            {getPlanStatus(plan) === "active" ? "Active Plan" : "Previous Plan"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {plan.month}/{plan.year}
          </h2>
          <p className="mt-1 text-slate-600">{plan.fileName || "Excel planner"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
            {getPlanStatus(plan)}
          </span>
          <button
            type="button"
            onClick={() => handleDeletePlan(plan)}
            disabled={deletingPlanKey === (plan.planMonthKey || plan.planId)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingPlanKey === (plan.planMonthKey || plan.planId) ? "Deleting..." : "Delete Upload"}
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-sm text-slate-600">Rows</p>
          <p className="text-2xl font-bold">{plan.rowCount}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-sm text-slate-600">Planned Quantity</p>
          <p className="text-2xl font-bold">{plan.totalPlanned.toFixed(1)} Cum</p>
        </div>
      </div>
      {plan.fileUrl && (
        <a className="mt-4 inline-block font-semibold text-blue-700" href={plan.fileUrl}>
          Download
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="text-2xl font-bold">Upload Monthly Planner</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="number"
            min="1"
            max="12"
            className="rounded-lg border p-3"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          />
          <input
            type="number"
            min="2024"
            className="rounded-lg border p-3"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            className="rounded-lg border p-3 md:col-span-2"
            onChange={(event) => setFile(event.target.files[0])}
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-5 w-full rounded-lg bg-orange-600 p-4 font-semibold text-white"
        >
          {uploading ? "Uploading..." : "Upload Plan"}
        </button>
        {message && <p className="mt-4 rounded-lg bg-slate-100 p-4 font-semibold">{message}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Active Plans</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {activePlans.length > 0 ? activePlans.map((plan) => (
          <div key={plan.planMonthKey || plan.planId || plan.id}>{renderPlanCard(plan)}</div>
        )) : (
          <div className="rounded-lg bg-white p-5 shadow">No active plan uploaded yet.</div>
        )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Previous Plans</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {previousPlans.length > 0 ? previousPlans.map((plan) => (
            <div key={plan.planId || plan.id}>{renderPlanCard(plan)}</div>
          )) : (
            <div className="rounded-lg bg-white p-5 shadow">No archived plans yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default MonthlyPlans;
