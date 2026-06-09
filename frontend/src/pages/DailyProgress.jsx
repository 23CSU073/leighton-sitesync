import { useState, useEffect } from "react";
import {
  addProgress,
  subscribeToProgress,
} from "../services/dprService";

import { towers } from "../data/towers";
import { levels } from "../data/levels";
import { cores } from "../data/cores";

function DailyProgress({ setCurrentPage }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],

    tower: "",
    level: "",
    core: "",

    shift: "",

    activity: "",
    quantity: "",
  });

  const [progressList, setProgressList] = useState([]);

  // Real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToProgress((data) => {
      setProgressList(data);
    });

    return () => unsubscribe();
  }, []);

  // KPI Card
  const totalConcreteToday = progressList.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newEntry = {
      date: formData.date,

      engineerName: "Site Engineer",

      tower: formData.tower,
      level: formData.level,
      core: formData.core,

      shift: formData.shift,

      activity: formData.activity,

      quantity: Number(formData.quantity),
    };

    const success = await addProgress(newEntry);

    if (success) {
      alert("Progress Saved to Firestore");

      setFormData({
        date: new Date().toISOString().split("T")[0],

        tower: "",
        level: "",
        core: "",

        shift: "",

        activity: "",
        quantity: "",
      });
    } else {
      alert("Failed to Save Progress");
    }
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

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        {/* Date */}
        <div>
          <label className="block mb-2 font-semibold">
            Date
          </label>

          <input
            type="date"
            className="w-full p-4 rounded-xl border bg-white"
            value={formData.date}
            onChange={(e) =>
              setFormData({
                ...formData,
                date: e.target.value,
              })
            }
          />
        </div>

        {/* Shift */}
        <div>
          <label className="block mb-2 font-semibold">
            Shift
          </label>

          <select
            className="w-full p-4 rounded-xl border bg-white"
            value={formData.shift}
            onChange={(e) =>
              setFormData({
                ...formData,
                shift: e.target.value,
              })
            }
          >
            <option value="">
              Select Shift
            </option>

            <option value="Day">
              Day Shift
            </option>

            <option value="Night">
              Night Shift
            </option>
          </select>
        </div>

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
        <input
          type="text"
          placeholder="Enter Activity"
          className="w-full p-4 rounded-xl border bg-white"
          value={formData.activity}
          onChange={(e) =>
            setFormData({
              ...formData,
              activity: e.target.value,
            })
          }
        />

        {/* Quantity */}
        <div>
          <input
            type="number"
            placeholder="Concrete Quantity (Cum)"
            className="w-full p-4 rounded-xl border bg-white"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantity: e.target.value,
              })
            }
          />

          <p className="text-sm text-blue-600 font-semibold mt-2">
            Unit: Cum
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-green-600 text-white p-4 rounded-xl text-xl font-semibold"
        >
          Submit Progress
        </button>

      </form>

      {/* KPI Card */}
      <div className="mt-10 bg-green-600 text-white p-5 rounded-xl shadow">
        <p className="text-sm">
          Total Concrete Progress
        </p>

        <h2 className="text-4xl font-bold mt-2">
          {totalConcreteToday} Cum
        </h2>
      </div>

      {/* Progress Ledger */}
      <div className="mt-8">
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
                  <strong>Engineer:</strong> {item.engineerName}
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
                  <strong>Shift:</strong> {item.shift}
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