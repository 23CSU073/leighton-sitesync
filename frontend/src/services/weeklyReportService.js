import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";
import { getSiteGroup } from "../data/siteConfiguration";

const emptyWeeklyRows = () => [
  { location: "PCC", plan: 0, achieved: 0 },
  { location: "Typical Towers", plan: 0, achieved: 0 },
  { location: "Area 2", plan: 0, achieved: 0 },
  { location: "NTA", plan: 0, achieved: 0 },
  { location: "Central NTA", plan: 0, achieved: 0 },
];

const getRowBucket = (location) => {
  const indexMap = {
    PCC: 0,
    "Typical Towers": 1,
    "Area 2": 2,
    NTA: 3,
    "Central NTA": 4,
  };

  return indexMap[location];
};

const sumTotals = (rows, valueKey) =>
  rows.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0);

const sumAchievedTotals = (rows) =>
  rows.reduce(
    (sum, item) => sum + Number(item.actualQuantity ?? item.quantity ?? 0),
    0
  );

const buildWeeklyRows = (plans, achievedData) => {
  const weeklyRows = emptyWeeklyRows();

  plans.forEach((item) => {
    const bucket = getRowBucket(getLocationLabel(item.tower));
    if (bucket === undefined) {
      return;
    }

    weeklyRows[bucket].plan += Number(item.plannedQuantity || 0);
  });

  achievedData.forEach((item) => {
    const bucket = getRowBucket(getLocationLabel(item.tower));
    if (bucket === undefined) {
      return;
    }

    weeklyRows[bucket].achieved += Number(item.actualQuantity || item.quantity || 0);
  });

  return weeklyRows.map((row) => {
    const percentage = row.plan === 0 ? 0 : ((row.achieved / row.plan) * 100).toFixed(1);

    return {
      ...row,
      percentage,
      shortfall: row.achieved - row.plan,
    };
  });
};

const getLocationLabel = (tower) => {
  const group = getSiteGroup(tower);

  if (group === "pcc") return "PCC";
  if (group === "typicalTowers") return "Typical Towers";
  if (group === "area2") return "Area 2";
  if (group === "nta") return "NTA";
  if (group === "centralNta") return "Central NTA";
  return null;
};

export const getWeeklyData = async () => {
  const [planSnapshot, actualSnapshot, progressSnapshot] = await Promise.all([
    getDocs(collection(db, "monthlyPlans")),
    getDocs(collection(db, "actualTracking")),
    getDocs(collection(db, "dailyProgress")),
  ]);

  const plans = planSnapshot.docs.map((doc) => doc.data());
  const actuals = actualSnapshot.docs.map((doc) => doc.data());
  const progress = progressSnapshot.docs.map((doc) => doc.data());
  const achievedData = actuals.length > 0 ? actuals : progress;

  const totalPlan = sumTotals(plans, "plannedQuantity");
  const totalAchieved = sumAchievedTotals(achievedData);
  const percentage = totalPlan === 0 ? 0 : ((totalAchieved / totalPlan) * 100).toFixed(1);
  const balance = totalPlan - totalAchieved;
  const weeklyRows = buildWeeklyRows(plans, achievedData);

  return {
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    weeklyRows,
  };
};
