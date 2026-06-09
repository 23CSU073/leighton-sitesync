import { useState, useEffect } from "react";
import { subscribeToProgress } from "../services/dprService";

function Dashboard({ setCurrentPage }) {
  const [progressList, setProgressList] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToProgress((data) => {
      setProgressList(data);
    });

    return () => unsubscribe();
  }, []);

  const totalConcrete = progressList.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const totalEntries = progressList.length;

  const activeTowers = new Set(
    progressList.map((item) => item.tower)
  ).size;

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      {/* Back Button */}
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      <h1 className="text-4xl font-bold mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-4">

        {/* Total Concrete */}
        <div className="bg-blue-600 text-white p-5 rounded-xl shadow">
          <p>Total Concrete</p>
          <h2 className="text-4xl font-bold">
            {totalConcrete} Cum
          </h2>
        </div>

        {/* Total Entries */}
        <div className="bg-green-600 text-white p-5 rounded-xl shadow">
          <p>Total Entries</p>
          <h2 className="text-4xl font-bold">
            {totalEntries}
          </h2>
        </div>

        {/* Active Towers */}
        <div className="bg-orange-500 text-white p-5 rounded-xl shadow">
          <p>Active Towers</p>
          <h2 className="text-4xl font-bold">
            {activeTowers}
          </h2>
        </div>

      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">
          Recent Activity
        </h2>

        <div className="space-y-3">
          {progressList.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow"
            >
              <p>
                <strong>{item.activity}</strong>
              </p>

              <p>
                {item.tower} | {item.level}
              </p>

              <p>
                {item.quantity} Cum
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;