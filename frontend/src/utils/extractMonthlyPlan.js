import {
  buildWeeklyValues,
  findConcreteWorkbookLayout,
  getCell,
  getRowTotal,
  isRealLevelName,
  isRealTowerName,
  isSpecialAreaName,
} from "./concreteWorkbook.js";

export const extractMonthlyPlan = (rows) => {
  let currentTower = "";
  let currentLevel = "";
  const plans = [];
  const seen = new Set();
  const layout = findConcreteWorkbookLayout(rows);
  const { columns } = layout;

  rows.forEach((row) => {
    const towerCell = getCell(row, columns.tower);
    const levelCell = getCell(row, columns.level);
    const pourCell = getCell(row, columns.pour);
    const rowType = getCell(row, columns.rowType);
    const activityCell = getCell(row, columns.activity);

    if (isRealTowerName(towerCell)) {
      currentTower = String(towerCell).trim();
    }

    if (isRealLevelName(levelCell)) {
      currentLevel = String(levelCell).trim();
    }

    if (isSpecialAreaName(levelCell)) {
      currentTower = String(levelCell).trim();
      currentLevel = String(levelCell).trim();
    }

    if (String(rowType || "").trim() !== "Plan") {
      return;
    }

    const quantity = getRowTotal(row, layout);
    const weeklyPlan = buildWeeklyValues(row, layout.dateColumns);
    const pour = pourCell ? String(pourCell).trim() : "";
    const activity = activityCell ? String(activityCell).trim() : "";
    const isSpecialSection = ["PCC", "NTA", "Central NTA"].includes(currentTower);
    const signature = [
      currentTower,
      currentLevel,
      pour,
      activity,
      quantity,
    ].join("|");

    if (
      !currentTower ||
      !currentLevel ||
      (!pour && !isSpecialSection) ||
      quantity <= 0 ||
      seen.has(signature)
    ) {
      return;
    }

    seen.add(signature);

    plans.push({
      month: "June 2026",
      monthLabel: layout.month,
      tower: currentTower,
      level: currentLevel,
      pour,
      activity,
      plannedQuantity: quantity,
      monthPlan: quantity,
      weeklyPlan,
    });
  });

  return plans;
};
