import LeightonLogo from "../components/LeightonLogo";

const modules = [
  {
    page: "dashboard",
    title: "KPI Dashboard",
    description: "Live planned vs actual metrics, variance, delay heatmap, and targets.",
    color: "bg-slate-900",
    roles: ["Admin", "Planner", "Site Engineer"],
  },
  {
    page: "daily-progress",
    title: "Daily Progress",
    description: "Capture site engineer concrete progress by tower, level, core, and shift.",
    color: "bg-green-700",
    roles: ["Admin", "Site Engineer"],
  },
  {
    page: "monthly-plans",
    title: "Monthly Planning",
    description: "Upload and parse monthly plan Excel sheets into Firestore.",
    color: "bg-orange-600",
    roles: ["Admin", "Planner"],
  },
  {
    page: "actual-upload",
    title: "Actual Tracking Upload",
    description: "Replace actual tracking source data from engineer Excel uploads.",
    color: "bg-red-700",
    roles: ["Admin", "Site Engineer"],
  },
  {
    page: "weekly-report",
    title: "Weekly Progress Report",
    description: "Review current week, look-ahead targets, delay analysis, and continuity.",
    color: "bg-cyan-700",
    roles: ["Admin", "Planner", "Site Engineer"],
  },
  {
    page: "reports",
    title: "Report Center",
    description: "Export concrete, combined weekly, and delay reports to CSV or PDF.",
    color: "bg-blue-700",
    roles: ["Admin", "Planner"],
  },
  {
    page: "site-layout",
    title: "Site Layout",
    description: "View project area and tower layout context.",
    color: "bg-purple-700",
    roles: ["Admin", "Planner", "Site Engineer"],
  },
];

function Home({ currentUser, onLogout, setCurrentPage }) {
  const renderModuleCard = (module) => {
    const hasAccess = module.roles.includes(currentUser?.role);

    return (
      <button
        key={module.page}
        onClick={() => hasAccess && setCurrentPage(module.page)}
        disabled={!hasAccess}
        className={`rounded-xl bg-white p-5 text-left shadow transition ${
          hasAccess
            ? "hover:-translate-y-0.5 hover:shadow-lg"
            : "cursor-not-allowed opacity-50"
        }`}
      >
        <div className={`mb-4 h-2 w-24 rounded-full ${module.color}`} />
        <h2 className="text-2xl font-bold text-slate-900">{module.title}</h2>
        <p className="mt-2 text-slate-600">{module.description}</p>
        {!hasAccess && (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Restricted to {module.roles.join(", ")}
          </p>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <div className="mb-8 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <LeightonLogo />
            <h1 className="mt-4 text-4xl font-bold text-slate-900">Leighton SiteSync</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Construction planning, progress control, actual tracking, and management reporting.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 p-4 text-sm">
            <p className="font-bold text-slate-900">{currentUser?.email}</p>
            <p className="mt-1 text-slate-600">{currentUser?.role}</p>
            <button
              onClick={onLogout}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {modules.map((module) => renderModuleCard(module))}
      </div>
    </div>
  );
}

export default Home;
