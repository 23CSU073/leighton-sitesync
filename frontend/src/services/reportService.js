import { getWeeklyData } from "./weeklyReportService";

const roundQuantity = (value) => Number(Number(value || 0).toFixed(1));

export const getReports = async () => {
  const weeklyData = await getWeeklyData();
  const {
    weeklyRows = [],
    lookAheadWeeks = [],
    delayAnalysis = [],
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    currentWeek = "Current Week",
  } = weeklyData;

  const concreteReport = weeklyRows.map((row) => ({
    Tower: row.location,
    Planned: roundQuantity(row.plan),
    Actual: roundQuantity(row.achieved),
    Balance: roundQuantity(row.plan - row.achieved),
    Variance: roundQuantity(row.shortfall),
    "Achievement %": row.percentage,
  }));

  const combinedReport = [
    {
      Week: currentWeek,
      Planned: roundQuantity(totalPlan),
      Actual: roundQuantity(totalAchieved),
      Balance: roundQuantity(balance),
      Variance: roundQuantity(totalAchieved - totalPlan),
      "Achievement %": percentage,
    },
    ...lookAheadWeeks.map((week) => ({
      Week: week.label,
      Planned: roundQuantity(week.value),
      Actual: 0,
      Balance: roundQuantity(week.value),
      Variance: roundQuantity(-week.value),
      "Achievement %": 0,
    })),
  ];

  const delayReport = delayAnalysis.map((item) => ({
    Location: item.location,
    Planned: roundQuantity(item.planned),
    Actual: roundQuantity(item.actual),
    Shortfall: roundQuantity(item.shortfall),
    "Achievement %": item.achievement,
    "Likely Reasons": "",
    Observation: item.observation,
  }));

  return {
    concreteReport,
    combinedReport,
    delayReport,
    weeklyData,
  };
};
