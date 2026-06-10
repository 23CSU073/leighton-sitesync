import { useEffect, useState } from "react";

import { addProgress, subscribeToProgress } from "../services/dprService";
import {
  getAreas,
  getLevelsForTower,
  getPoursForTower,
  getTowersForArea,
} from "../data/towerConfig";

const initialFormData = () => ({
  date: new Date().toISOString().split("T")[0],
  area: "",
  tower: "",
  level: "",
  pour: "",
  shift: "",
  activity: "",
  quantity: "",
});

function DailyProgress() {
  const [formData, setFormData] = useState(initialFormData);
  const [progressList, setProgressList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProgress((data) => {
      setProgressList(data);
    });

    return () => unsubscribe();
  }, []);

  const totalConcreteToday = progressList.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const newEntry = {
      date: formData.date,
      engineerName: "Site Engineer",
      area: formData.area,
      tower: formData.tower,
      level: formData.level,
      pour: formData.pour,
      core: formData.pour,
      shift: formData.shift,
      activity: formData.activity,
      quantity: Number(formData.quantity),
    };

    const success = await addProgress(newEntry);
    setSaving(false);

    if (success) {
      setFormData(initialFormData());
      return;
    }

    alert("Failed to save progress");
  };

  return (
    <>
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

        <input
          type="text"
          placeholder="Enter Activity"
          className="w-full rounded-lg border bg-white p-4"
          value={formData.activity}
          onChange={(event) => setFormData({ ...formData, activity: event.target.value })}
        />

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
        {progressList.length === 0 ? (
          <div className="rounded-lg bg-white p-4 shadow">No progress submitted yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {progressList.map((item) => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default DailyProgress;
