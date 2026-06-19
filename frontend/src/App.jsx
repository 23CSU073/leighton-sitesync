import { useEffect, useState } from "react";

import ActualUpload from "./pages/ActualUpload";
import AppShell from "./components/AppShell";
import DailyProgress from "./pages/DailyProgress";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import LogHistory from "./pages/LogHistory";
import Login from "./pages/Login";
import MonthlyPlans from "./pages/MonthlyPlans";
import Reports from "./pages/Reports";
import SiteLayout from "./pages/SiteLayout";
import WeeklyReport from "./pages/WeeklyReport";
import { logoutUser, subscribeToAuthUser } from "./services/authService";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = subscribeToAuthUser((user) => {
      setCurrentUser(user);
      if (user) {
        setCurrentPage(user.role === "Site Engineer" ? "daily-progress" : "dashboard");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentPage("home");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "site-layout":
        return <SiteLayout setCurrentPage={setCurrentPage} />;

      case "daily-progress":
        return <DailyProgress currentUser={currentUser} setCurrentPage={setCurrentPage} />;

      case "log-history":
        return <LogHistory currentUser={currentUser} setCurrentPage={setCurrentPage} />;

      case "monthly-plans":
        return <MonthlyPlans setCurrentPage={setCurrentPage} />;

      case "dashboard":
        return <Dashboard currentUser={currentUser} setCurrentPage={setCurrentPage} />;

      case "weekly-report":
        return <WeeklyReport currentUser={currentUser} setCurrentPage={setCurrentPage} />;

      case "actual-upload":
        return <ActualUpload setCurrentPage={setCurrentPage} />;

      case "reports":
        return <Reports setCurrentPage={setCurrentPage} />;

      default:
        return (
          <Home
            currentUser={currentUser}
            onLogout={handleLogout}
            setCurrentPage={setCurrentPage}
          />
        );
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <h1 className="text-2xl font-bold">Loading SiteSync...</h1>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (currentPage === "home") {
    return (
      <Home
        currentUser={currentUser}
        onLogout={handleLogout}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  const pageTitles = {
    dashboard: "Dashboard",
    "monthly-plans": "Monthly Planning",
    "actual-upload": "Actual Track Upload",
    "weekly-report": "Weekly Progress",
    reports: "Report Center",
    "site-layout": "Site Layout",
    "daily-progress": "Daily Progress",
    "log-history": "Log History",
  };

  return (
    <AppShell
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={handleLogout}
      setCurrentPage={setCurrentPage}
      title={pageTitles[currentPage] || "Dashboard"}
    >
      {renderPage()}
    </AppShell>
  );
}

export default App;
