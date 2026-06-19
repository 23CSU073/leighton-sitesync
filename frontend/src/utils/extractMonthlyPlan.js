import {
  buildCumulativeCutoffValues,
  buildWeeklyValues,
  findConcreteWorkbookLayout,
  getCell,
  getMonthLabelFromDate,
  getRowTotal,
  getSummaryCumulativePlanValues,
  getWeekIndexFromDate,
  isRealLevelName,
  isRealTowerName,
  isSpecialAreaName,
  parseWorkbookDate,
} from "./concreteWorkbook.js";

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isValidDate = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "" &&
  !Number.isNaN(parseWorkbookDate(value).getTime());

const splitLevelPour = (value) => {
  const text = String(value || "").trim();
  const normalized = text.replace(/\s+/g, " ");

  if (!normalized) {
    return { level: "", pour: "" };
  }

  const levelPourMatch = normalized.match(/^(.*?\bLevel\s*\d+)\s*(?:-|\u2013)?\s*(Pour\s*\d+.*)$/i);

  if (levelPourMatch) {
    return {
      level: levelPourMatch[1].trim(),
      pour: levelPourMatch[2].trim(),
    };
  }

  const parenthesizedPourMatch = normalized.match(/^(.*?)\s*\((Pour\s*\d+.*?)\)$/i);

  if (parenthesizedPourMatch) {
    return {
      level: parenthesizedPourMatch[1].trim(),
      pour: parenthesizedPourMatch[2].trim(),
    };
  }

  const pourOnlyMatch = normalized.match(/^(Pour\s*\d+.*)$/i);

  if (pourOnlyMatch) {
    return {
      level: "",
      pour: pourOnlyMatch[1].trim(),
    };
  }

  return { level: normalized, pour: "" };
};

const findTablePlanLayout = (rows) => {
  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);

    return (
      headers.includes("date") &&
      headers.some((header) => header.includes("tower") || header.includes("location")) &&
      headers.some((header) => header.includes("level") && header.includes("pour")) &&
      headers.includes("quantity")
    );
  });
  const headerRow = rows[headerRowIndex] || [];
  const headers = headerRow.map(normalizeHeader);

  return {
    headerRowIndex,
    columns: {
      date: headers.findIndex((header) => header === "date"),
      tower: headers.findIndex((header) => header.includes("tower") || header.includes("location")),
      levelPour: headers.findIndex((header) => header.includes("level") && header.includes("pour")),
      quantity: headers.findIndex((header) => header === "quantity"),
    },
  };
};

const extractTableMonthlyPlan = (rows) => {
  const layout = findTablePlanLayout(rows);

  if (layout.headerRowIndex < 0 || Object.values(layout.columns).some((index) => index < 0)) {
    return [];
  }

  let currentDate = null;
  const plans = [];
  const seen = new Set();

  rows.slice(layout.headerRowIndex + 1).forEach((row) => {
    const dateCell = getCell(row, layout.columns.date);

    if (isValidDate(dateCell)) {
      currentDate = dateCell;
    }

    const tower = String(getCell(row, layout.columns.tower) || "").trim();
    const quantity = Number(getCell(row, layout.columns.quantity) || 0);
    const weekIndex = getWeekIndexFromDate(currentDate);

    if (!currentDate || !tower || quantity <= 0 || weekIndex === null) {
      return;
    }

    const { level, pour } = splitLevelPour(getCell(row, layout.columns.levelPour));
    const weeklyPlan = [0, 0, 0, 0];
    const cumulativePlan = [0, 0, 0, 0];
    const signature = [parseWorkbookDate(currentDate).toISOString(), tower, level, pour, quantity].join("|");

    if (seen.has(signature)) {
      return;
    }

    seen.add(signature);
    weeklyPlan[weekIndex] = quantity;
    cumulativePlan.fill(quantity, weekIndex);

    plans.push({
      month: getMonthLabelFromDate(currentDate),
      monthLabel: getMonthLabelFromDate(currentDate),
      planDate: parseWorkbookDate(currentDate).toISOString().split("T")[0],
      tower,
      level,
      pour,
      activity: "Concrete",
      plannedQuantity: quantity,
      monthPlan: quantity,
      weeklyPlan,
      cumulativePlan,
      summaryCumulativePlan: [0, 0, 0, 0],
    });
  });

  return plans;
};

export const extractMonthlyPlan = (rows) => {
  const tablePlans = extractTableMonthlyPlan(rows);

  if (tablePlans.length > 0) {
    return tablePlans;
  }

  let currentTower = "";
  let currentLevel = "";
  const plans = [];
  const seen = new Set();
  const layout = findConcreteWorkbookLayout(rows);
  const { columns } = layout;
  const summaryCumulativePlan = getSummaryCumulativePlanValues(rows, layout);

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
    const cumulativePlan = buildCumulativeCutoffValues(row, layout.dateColumns);
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
      cumulativePlan,
      summaryCumulativePlan,
    });
  });

  return plans;
};
