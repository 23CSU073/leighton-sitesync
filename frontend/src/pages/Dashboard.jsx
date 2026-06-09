import { useEffect, useState } from "react";
import { subscribeToProgress } from "../services/dprService";

function Dashboard({ setCurrentPage }) {
  const [progressList, setProgressList] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToProgress((data) => {
      setProgressList(data);
    });

    return () => unsubscribe();
  }, []);

  // Today's Date
  const today = new Date().toISOString().split("T")[0];

  // Today's Entries
  const todayEntries = progressList.filter(
    (item) => item.date === today
  );

  // Today's Concrete
  const totalConcreteToday = todayEntries.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  // Day Shift Concrete
  const dayShiftConcrete = todayEntries
    .filter((item) => item.shift === "Day")
    .reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

  // Night Shift Concrete
  const nightShiftConcrete = todayEntries
    .filter((item) => item.shift === "Night")
    .reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

  // Active Towers
  const activeTowers = new Set(
    todayEntries.map((item) => item.tower)
  ).size;

  // Active Cores
  const activeCores = new Set(
    todayEntries.map((item) => item.core)
  ).size;

  return (
    <div className="min-h-screen bg-slate-100 p-5">

      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      <h1 className="text-4xl font-bold mb-6">
        KPI Dashboard
      </h1>

      <div className="grid gap-4">

        <div className="bg-blue-600 text-white p-5 rounded-xl shadow">
          <p>Today's Concrete</p>
          <h2 className="text-4xl font-bold">
            {totalConcreteToday} Cum
          </h2>
        </div>

        <div className="bg-green-600 text-white p-5 rounded-xl shadow">
          <p>Day Shift Concrete</p>
          <h2 className="text-4xl font-bold">
            {dayShiftConcrete} Cum
          </h2>
        </div>

        <div className="bg-indigo-600 text-white p-5 rounded-xl shadow">
          <p>Night Shift Concrete</p>
          <h2 className="text-4xl font-bold">
            {nightShiftConcrete} Cum
          </h2>
        </div>

        <div className="bg-orange-500 text-white p-5 rounded-xl shadow">
          <p>Total Entries</p>
          <h2 className="text-4xl font-bold">
            {todayEntries.length}
          </h2>
        </div>

        <div className="bg-purple-600 text-white p-5 rounded-xl shadow">
          <p>Active Towers</p>
          <h2 className="text-4xl font-bold">
            {activeTowers}
          </h2>
        </div>

        <div className="bg-pink-600 text-white p-5 rounded-xl shadow">
          <p>Active Cores</p>
          <h2 className="text-4xl font-bold">
            {activeCores}
          </h2>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;