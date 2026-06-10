import {
  buildWeeklyValues,
  findConcreteWorkbookLayout,
  getCell,
  getRowTotal,
  isRealLevelName,
  isRealTowerName,
  isSpecialAreaName,
} from "./concreteWorkbook.js";

const isConcreteActivity = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase() === "concrete";

export const extractActualTracking = (rows) => {
  let currentTower = "";
  let currentLevel = "";
  const actualRows = [];
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

    if (String(rowType || "").trim() !== "Actual" || !isConcreteActivity(activityCell)) {
      return;
    }

    const quantity = getRowTotal(row, layout);
    const weeklyActual = buildWeeklyValues(row, layout.dateColumns);
    const pour = pourCell ? String(pourCell).trim() : "";
    const activity = String(activityCell).trim();
    const signature = [
      currentTower,
      currentLevel,
      pour,
      activity,
      quantity,
    ].join("|");

    if (!currentTower || !currentLevel || quantity <= 0 || seen.has(signature)) {
      return;
    }

    seen.add(signature);

    actualRows.push({
      month: layout.month,
      monthLabel: layout.month,
      tower: currentTower,
      level: currentLevel,
      pour,
      activity,
      actualQuantity: quantity,
      weeklyActual,
    });
  });

  return actualRows;
};
