function Dashboard({ setCurrentPage }) {
  return (
    <div className="p-5">
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">
        KPI Dashboard
      </h1>
    </div>
  );
}

export default Dashboard;