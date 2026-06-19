import {
  buildWeeklyValues,
  findConcreteWorkbookLayout,
  getMonthLabelFromDate,
  getWeekIndexFromDate,
  getCell,
  getRowTotal,
  isRealLevelName,
  isRealTowerName,
  isSpecialAreaName,
} from "./concreteWorkbook.js";

const normalize = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeCompact = (value) =>
  String(value ?? "")
    .replace(/[^a-z0-9]+/gi, "")
    .trim()
    .toLowerCase();

const toNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
};

const isTotalAchievedHeader = (value) => {
  const normalized = normalizeCompact(value);

  return normalized === "totalachievedqty" ||
    normalized === "totalachievedquantity";
};

const findLastHeaderIndex = (row, predicate) => {
  for (let index = row.length - 1; index >= 0; index -= 1) {
    if (predicate(row[index])) {
      return index;
    }
  }

  return -1;
};

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

const findDayWiseLayout = (rows) => {
  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map(normalize);

    return normalized.includes("date") &&
      normalized.includes("tower / location") &&
      normalized.some((cell) => cell.includes("level/pour")) &&
      normalized.includes("quantity");
  });
  const headerRow = rows[headerRowIndex] || [];

  return {
    headerRowIndex,
    columns: {
      date: headerRow.findIndex((cell) => normalize(cell) === "date"),
      tower: headerRow.findIndex((cell) => normalize(cell) === "tower / location"),
      levelPour: headerRow.findIndex((cell) => normalize(cell).includes("level/pour")),
      quantity: headerRow.findIndex((cell) => normalize(cell) === "quantity"),
      achievedTotal: findLastHeaderIndex(headerRow, isTotalAchievedHeader),
    },
  };
};

const hasDayWiseLayout = (layout) =>
  layout.headerRowIndex >= 0 &&
  ["date", "tower", "levelPour", "quantity", "achievedTotal"].every(
    (key) => layout.columns[key] >= 0
  );

const extractDayWiseActualTracking = (rows, layout) => {
  const actualRows = [];
  const seenDates = new Set();
  let month = "";
  let currentBlock = null;

  const flushBlock = () => {
    if (!currentBlock || seenDates.has(currentBlock.dateKey) || currentBlock.achievedTotal <= 0) {
      return;
    }

    const weekIndex = getWeekIndexFromDate(currentBlock.date);

    if (weekIndex === null) {
      return;
    }

    const plannedTotal = currentBlock.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    if (plannedTotal <= 0) {
      return;
    }

    seenDates.add(currentBlock.dateKey);
    month = month || getMonthLabelFromDate(currentBlock.date);

    currentBlock.items.forEach((item) => {
      const actualQuantity = currentBlock.achievedTotal * (item.quantity / plannedTotal);
      const weeklyActual = [0, 0, 0, 0];

      weeklyActual[weekIndex] = actualQuantity;

      actualRows.push({
        month,
        monthLabel: month,
        date: currentBlock.date,
        tower: item.tower,
        level: item.level,
        pour: item.pour,
        activity: "Concrete",
        actualQuantity,
        weeklyActual,
      });
    });
  };

  rows.slice(layout.headerRowIndex + 1).forEach((row) => {
    const dateCell = getCell(row, layout.columns.date);
    const achievedTotal = toNumber(getCell(row, layout.columns.achievedTotal));
    const dateKey = dateCell instanceof Date
      ? dateCell.toISOString()
      : String(dateCell || "").trim();
    const tower = String(getCell(row, layout.columns.tower) || "").trim();
    const quantity = toNumber(getCell(row, layout.columns.quantity));

    if (dateKey.toLowerCase().startsWith("total")) {
      flushBlock();
      currentBlock = null;
      return;
    }

    if (dateKey) {
      flushBlock();
      currentBlock = {
        date: dateCell,
        dateKey,
        achievedTotal,
        items: [],
      };
    }

    if (!currentBlock || !tower || quantity <= 0) {
      return;
    }

    const { level, pour } = splitLevelPour(getCell(row, layout.columns.levelPour));

    currentBlock.items.push({
      tower,
      level,
      pour,
      quantity,
    });
  });

  flushBlock();

  return actualRows;
};

export const extractActualTracking = (rows) => {
  const dayWiseLayout = findDayWiseLayout(rows);

  if (hasDayWiseLayout(dayWiseLayout)) {
    return extractDayWiseActualTracking(rows, dayWiseLayout);
  }

  let currentTower = "";
  let currentLevel = "";
  let currentPour = "";
  let currentActivity = "";
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

    if (String(rowType || "").trim() !== "Actual" && isRealLevelName(levelCell)) {
      currentLevel = String(levelCell).trim();
    }

    if (isSpecialAreaName(levelCell)) {
      currentTower = String(levelCell).trim();
      currentLevel = String(levelCell).trim();
    }

    if (String(rowType || "").trim() === "Plan") {
      currentPour = pourCell ? String(pourCell).trim() : currentPour;
      currentActivity = activityCell ? String(activityCell).trim() : currentActivity;
      return;
    }

    if (String(rowType || "").trim() !== "Actual") {
      return;
    }

    if (String(levelCell || "").trim()) {
      return;
    }

    const quantity = getRowTotal(row, layout);
    const weeklyActual = buildWeeklyValues(row, layout.dateColumns);
    const pour = pourCell ? String(pourCell).trim() : currentPour;
    const activity = activityCell ? String(activityCell).trim() : currentActivity;
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
