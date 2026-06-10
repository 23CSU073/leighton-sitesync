import LeightonLogo from "./LeightonLogo";

const navItems = [
  { page: "dashboard", label: "Dashboard" },
  { page: "daily-progress", label: "Daily Progress" },
  { page: "monthly-plans", label: "Monthly Planning" },
  { page: "actual-upload", label: "Actual Track Upload" },
  { page: "weekly-report", label: "Weekly Progress" },
  { page: "reports", label: "Report Center" },
  { page: "site-layout", label: "Site Layout" },
];

function AppShell({ children, currentPage, currentUser, onLogout, setCurrentPage, title }) {
  const renderNavButton = (item, isMobile = false) => (
    <button
      key={item.page}
      onClick={() => setCurrentPage(item.page)}
      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
        currentPage === item.page
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-200"
      } ${isMobile ? "min-w-[7rem] text-center text-xs" : "w-full"}`}
    >
      {item.label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white p-5 lg:block">
        <LeightonLogo />
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-500">{currentUser?.email}</p>
          <p className="mt-1 text-sm text-slate-600">{currentUser?.role}</p>
        </div>
        <nav className="mt-8 space-y-2">{navItems.map((item) => renderNavButton(item))}</nav>
        <button
          onClick={onLogout}
          className="absolute bottom-5 left-5 right-5 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white"
        >
          Logout
        </button>
      </aside>

      <main className="pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Leighton SiteSync</p>
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white lg:hidden"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="p-5">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3 lg:hidden">
        {navItems.map((item) => renderNavButton(item, true))}
      </nav>
    </div>
  );
}

export default AppShell;
