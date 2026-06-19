import { useEffect, useState } from "react";

import { addProgress, deleteProgress, subscribeToProgress } from "../services/dprService";
import { delayReasons } from "../data/delayReasons";
import {
  getAreas,
  getLevelsForTower,
  getPoursForTower,
  getTowersForArea,
} from "../data/towerConfig";

const activityOptions = [
  "Vertical Steel",
  "Vertical Formwork / Shuttering",
  "Vertical Concrete",
  "Slab Decking / Shuttering",
  "Steel Finishing",
  "Slab Concrete",
  "Others",
];

const initialFormData = () => ({
  date: new Date().toISOString().split("T")[0],
  area: "",
  tower: "",
  level: "",
  pour: "",
  shift: "",
  activity: "",
  customActivity: "",
  quantity: "",
  reason: "",
  durationInDays: "",
});

const addDays = (dateValue, days) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split("T")[0];
};

function DailyProgress({ currentUser }) {
  const [formData, setFormData] = useState(initialFormData);
  const [progressList, setProgressList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToProgress((data) => {
      setProgressList(data);
    });

    return () => unsubscribe();
  }, []);

  const todayKey = new Date().toISOString().split("T")[0];
  const todayProgressList = progressList.filter((item) => item.date === todayKey);
  const totalConcreteToday = todayProgressList.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.reason) {
      setErrorMessage("Reason selection is compulsory. Choose Not Applicable if there was no hindrance.");
      return;
    }

    if (formData.reason !== "Not Applicable" && Number(formData.durationInDays || 0) <= 0) {
      setErrorMessage("Enter hindrance duration in days.");
      return;
    }

    setSaving(true);
    const durationInDays =
      formData.reason === "Not Applicable" ? 0 : Number(formData.durationInDays || 0);

    const newEntry = {
      date: formData.date,
      engineerName: currentUser?.displayName || currentUser?.email || "Site Engineer",
      createdBy: currentUser?.uid || "",
      createdByEmail: currentUser?.email || "",
      area: formData.area,
      tower: formData.tower,
      level: formData.level,
      pour: formData.pour,
      core: formData.pour,
      shift: formData.shift,
      activity: formData.activity === "Others" ? formData.customActivity : formData.activity,
      quantity: Number(formData.quantity),
      reason: formData.reason,
      hindranceReason: formData.reason,
      startDate: formData.date,
      durationInDays,
      endDate: durationInDays > 0 ? addDays(formData.date, durationInDays) : formData.date,
      delayOffsetDays: formData.reason === "Not Applicable" ? 0 : durationInDays,
    };

    const success = await addProgress(newEntry);
    setSaving(false);

    if (success) {
      setFormData(initialFormData());
      return;
    }

    alert("Failed to save progress");
  };

  const normalizedRole = String(currentUser?.role || "").trim().toLowerCase();
  const canDelete = ["admin", "planner"].includes(normalizedRole);

  const handleDelete = async (item) => {
    if (!canDelete) {
      setErrorMessage("Only Admin and Planner users can delete daily progress entries.");
      return;
    }

    const confirmed = window.confirm(
      `Delete this progress entry for ${item.tower || "this tower"} (${item.quantity} Cum)?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setErrorMessage("");

    const success = await deleteProgress(item.id);
    setDeletingId("");

    if (!success) {
      setErrorMessage("Progress entry could not be deleted.");
    }
  };

  return (
    <>
      {errorMessage && (
        <p className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-700">
          {errorMessage}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-5 rounded-lg bg-white p-5 shadow md:grid-cols-2"
      >
        <label className="block">
          <span className="mb-2 block font-semibold">Date</span>
          <input
            type="date"
            className="w-full rounded-lg border bg-white p-4"
            value={formData.date}
            onChange={(event) => setFormData({ ...formData, date: event.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Shift</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.shift}
            onChange={(event) => setFormData({ ...formData, shift: event.target.value })}
          >
            <option value="">Select Shift</option>
            <option value="Day">Day Shift</option>
            <option value="Night">Night Shift</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Area</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.area}
            onChange={(event) =>
              setFormData({
                ...formData,
                area: event.target.value,
                tower: "",
                level: "",
                pour: "",
              })
            }
          >
            <option value="">Select Area</option>
            {getAreas().map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Tower</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.tower}
            disabled={!formData.area}
            onChange={(event) =>
              setFormData({
                ...formData,
                tower: event.target.value,
                level: "",
                pour: "",
              })
            }
          >
            <option value="">Select Tower</option>
            {getTowersForArea(formData.area).map((tower) => (
              <option key={tower} value={tower}>
                {tower}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Level</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.level}
            disabled={!formData.tower}
            onChange={(event) =>
              setFormData({ ...formData, level: event.target.value, pour: "" })
            }
          >
            <option value="">Select Level</option>
            {getLevelsForTower(formData.tower).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Pour</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.pour}
            disabled={!formData.level}
            onChange={(event) => setFormData({ ...formData, pour: event.target.value })}
          >
            <option value="">Select Pour</option>
            {getPoursForTower(formData.tower).map((pour) => (
              <option key={pour} value={pour}>
                {pour}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-semibold">Activity</span>
          <select
            className="w-full rounded-lg border bg-white p-4"
            value={formData.activity}
            onChange={(event) => setFormData({ ...formData, activity: event.target.value, customActivity: "" })}
          >
            <option value="">Select Activity</option>
            {activityOptions.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </label>

        {formData.activity === "Others" && (
          <input
            type="text"
            placeholder="Specify Activity"
            className="w-full rounded-lg border bg-white p-4"
            value={formData.customActivity}
            onChange={(event) => setFormData({ ...formData, customActivity: event.target.value })}
          />
        )}

        <div>
          <input
            type="number"
            placeholder="Concrete Quantity (Cum)"
            className="w-full rounded-lg border bg-white p-4"
            value={formData.quantity}
            onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
          />
          <p className="mt-2 text-sm font-semibold text-blue-600">Unit: Cum</p>
        </div>

        <label className="block">
          <span className="mb-2 block font-semibold">Reason</span>
          <select
            required
            className="w-full rounded-lg border bg-white p-4"
            value={formData.reason}
            onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
          >
            <option value="">Select Reason</option>
            {delayReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>

        {formData.reason && formData.reason !== "Not Applicable" && (
          <label className="block">
            <span className="mb-2 block font-semibold">Hindrance Duration (Days)</span>
            <input
              type="number"
              min="1"
              className="w-full rounded-lg border bg-white p-4"
              value={formData.durationInDays}
              onChange={(event) => setFormData({ ...formData, durationInDays: event.target.value })}
            />
            {formData.date && formData.durationInDays && (
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Resume after: {addDays(formData.date, formData.durationInDays)}
              </p>
            )}
          </label>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-green-600 p-4 text-xl font-semibold text-white md:col-span-2"
        >
          {saving ? "Saving..." : "Submit Progress"}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-green-600 p-5 text-white shadow">
        <p className="text-sm">Total Concrete Progress</p>
        <h2 className="mt-2 text-4xl font-bold">{totalConcreteToday} Cum</h2>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Today's Progress</h2>
        {todayProgressList.length === 0 ? (
          <div className="rounded-lg bg-white p-4 shadow">No progress submitted yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {todayProgressList.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-4 shadow">
                <p><strong>Date:</strong> {item.date}</p>
                <p><strong>Engineer:</strong> {item.engineerName}</p>
                <p><strong>Area:</strong> {item.area || "Not set"}</p>
                <p><strong>Tower:</strong> {item.tower}</p>
                <p><strong>Level:</strong> {item.level}</p>
                <p><strong>Pour:</strong> {item.pour || item.core}</p>
                <p><strong>Shift:</strong> {item.shift}</p>
                <p><strong>Activity:</strong> {item.activity}</p>
                <p><strong>Quantity:</strong> {item.quantity} Cum</p>
                <p><strong>Reason:</strong> {item.reason || item.hindranceReason || "Not Applicable"}</p>
                {Number(item.delayOffsetDays || 0) > 0 && (
                  <p><strong>Resume After:</strong> {item.endDate}</p>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete Entry"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default DailyProgress;
