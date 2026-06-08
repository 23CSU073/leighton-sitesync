import { useState } from "react";

import { towers } from "../data/towers";
import { levels } from "../data/levels";
import { cores } from "../data/cores";
import { activities } from "../data/activities";

function DailyProgress({ setCurrentPage }) {
  const [selectedUnit, setSelectedUnit] = useState("");

  const [formData, setFormData] = useState({
    tower: "",
    level: "",
    core: "",
    activity: "",
    quantity: "",
    remarks: "",
  });

  const [progressList, setProgressList] = useState([]);
  const totalConcreteToday = progressList.reduce(
  (total, item) => total + Number(item.quantity || 0),
  0
);

const handleSubmit = (e) => {
  e.preventDefault();

  const newEntry = {
    id: Date.now(),

    date: new Date().toLocaleDateString(),

    tower: formData.tower,

    level: formData.level,

    core: formData.core,

    activity: formData.activity,

    quantity: formData.quantity,
  };

  setProgressList((prev) => [newEntry, ...prev]);

  setFormData({
    tower: "",
    level: "",
    core: "",
    activity: "",
    quantity: "",
  });
};

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      {/* Back Button */}
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-8">
        Daily Progress
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Tower */}
        <select
          className="w-full p-4 rounded-xl border bg-white"
          value={formData.tower}
          onChange={(e) =>
            setFormData({
              ...formData,
              tower: e.target.value,
            })
          }
        >
          <option value="">
            Select Tower
          </option>

          {towers.map((tower) => (
            <option
              key={tower}
              value={tower}
            >
              {tower}
            </option>
          ))}
        </select>

        {/* Level */}
        <select
          className="w-full p-4 rounded-xl border bg-white"
          value={formData.level}
          onChange={(e) =>
            setFormData({
              ...formData,
              level: e.target.value,
            })
          }
        >
          <option value="">
            Select Level
          </option>

          {levels.map((level) => (
            <option
              key={level}
              value={level}
            >
              {level}
            </option>
          ))}
        </select>

        {/* Core */}
        <select
          className="w-full p-4 rounded-xl border bg-white"
          value={formData.core}
          onChange={(e) =>
            setFormData({
              ...formData,
              core: e.target.value,
            })
          }
        >
          <option value="">
            Select Core
          </option>

          {cores.map((core) => (
            <option
              key={core}
              value={core}
            >
              {core}
            </option>
          ))}
        </select>

        {/* Activity */}
        <select
          className="w-full p-4 rounded-xl border bg-white"
          value={formData.activity}
          onChange={(e) => {
            const selectedActivity = activities.find(
              (item) => item.activity === e.target.value
            );

            setSelectedUnit(selectedActivity?.unit || "");

            setFormData({
              ...formData,
              activity: e.target.value,
            });
          }}
        >
          <option value="">
            Select Activity
          </option>

          {activities.map((item) => (
            <option
              key={item.activity}
              value={item.activity}
            >
              {item.activity}
            </option>
          ))}
        </select>

        {/* Quantity */}
        <div>
          <input
            type="number"
            placeholder={
              selectedUnit
                ? `Quantity (${selectedUnit})`
                : "Quantity"
            }
            className="w-full p-4 rounded-xl border bg-white"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantity: e.target.value,
              })
            }
          />

          {selectedUnit && (
            <p className="text-sm text-blue-600 font-semibold mt-2">
              Unit: {selectedUnit}
            </p>
          )}
        </div>


        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-green-600 text-white p-4 rounded-xl text-xl font-semibold"
        >
          Submit Progress
        </button>

      </form>
      {/* Progress Ledger */}

<div className="mt-10">
    <div className="bg-green-600 text-white p-5 rounded-xl shadow mb-6">
  <p className="text-sm">
    Today's Concrete Progress
  </p>

  <h2 className="text-4xl font-bold mt-2">
    {totalConcreteToday} Cum
  </h2>
</div>
  <h2 className="text-2xl font-bold mb-4">
    Today's Progress
  </h2>

  {progressList.length === 0 ? (
    <div className="bg-white p-4 rounded-xl shadow">
      No progress submitted yet.
    </div>
  ) : (
    <div className="space-y-3">
      {progressList.map((item) => (
        <div
          key={item.id}
          className="bg-white p-4 rounded-xl shadow"
        >
          <p>
            <strong>Date:</strong> {item.date}
          </p>

          <p>
            <strong>Tower:</strong> {item.tower}
          </p>

          <p>
            <strong>Level:</strong> {item.level}
          </p>

          <p>
            <strong>Core:</strong> {item.core}
          </p>

          <p>
            <strong>Activity:</strong> {item.activity}
          </p>

          <p>
            <strong>Quantity:</strong> {item.quantity} Cum
          </p>
        </div>
      ))}
    </div>
  )}
</div>
    </div>
  );
}

export default DailyProgress;