import { useState } from "react";

import Home from "./pages/Home";
import SiteLayout from "./pages/SiteLayout";
import DailyProgress from "./pages/DailyProgress";
import MonthlyPlans from "./pages/MonthlyPlans";
import Dashboard from "./pages/Dashboard";

function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const renderPage = () => {
    switch (currentPage) {
      case "site-layout":
        return <SiteLayout setCurrentPage={setCurrentPage} />;

      case "daily-progress":
        return <DailyProgress setCurrentPage={setCurrentPage} />;

      case "monthly-plans":
        return <MonthlyPlans setCurrentPage={setCurrentPage} />;

      case "dashboard":
        return <Dashboard setCurrentPage={setCurrentPage} />;

      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  return <>{renderPage()}</>;
}

export default App;