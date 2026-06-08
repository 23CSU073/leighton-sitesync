import siteLayout from "../assets/site-layout.png";

function SiteLayout({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <button
        onClick={() => setCurrentPage("home")}
        className="mb-5 bg-gray-200 px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-5">
        Site Layout
      </h1>

      <div className="bg-white rounded-xl shadow p-3">
        <img
          src={siteLayout}
          alt="Site Layout"
          className="w-full rounded-lg"
        />
      </div>

      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h2 className="font-bold text-xl mb-3">
          Area Information
        </h2>

        <ul className="space-y-2">
          <li>🔵 Area 1 → Towers 1–6, 14 & 15</li>
          <li>🔴 Area 2 → Towers 16–18 & 12</li>
          <li>🟦 Area 3 → Towers 7–10</li>
          <li>🟢 Area 4 → Club House + NTA</li>
        </ul>
      </div>
    </div>
  );
}

export default SiteLayout;