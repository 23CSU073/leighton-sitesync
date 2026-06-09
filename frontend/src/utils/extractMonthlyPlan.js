const getCell = (row, index) => row?.[index] ?? null;

const isRealTowerName = (value) =>
  typeof value === "string" &&
  /^(Tower\s*\d+|PCC|NTA|Central NTA)$/i.test(value.trim());

const isRealLevelName = (value) =>
  typeof value === "string" &&
  !/^(Level|Tower|Plan|Actual|S\.No\.|Elements\/Pours|Elements)$/i.test(value.trim());

const isSpecialAreaName = (value) =>
  typeof value === "string" &&
  /^(PCC|NTA|Central NTA)$/i.test(value.trim());

const getMonthlyTotal = (row) => {
  const candidateIndexes = [38, 39, 40];

  for (const index of candidateIndexes) {
    const value = Number(getCell(row, index));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
};

const getWeekIndexFromHeader = (headerCell) => {
  if (!headerCell) {
    return null;
  }

  const date = new Date(headerCell);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getUTCDate();

  if (day >= 1 && day <= 7) return 0;
  if (day >= 8 && day <= 14) return 1;
  if (day >= 15 && day <= 21) return 2;
  if (day >= 22 && day <= 31) return 3;
  return null;
};

const buildWeekColumnMap = (rows) => {
  const headerRow = rows[4] || [];
  const weekColumns = [[], [], [], []];

  for (let index = 8; index <= 37; index += 1) {
    const weekIndex = getWeekIndexFromHeader(headerRow[index]);
    if (weekIndex !== null) {
      weekColumns[weekIndex].push(index);
    }
  }

  return weekColumns;
};

export const extractMonthlyPlan = (rows) => {
  let currentTower = "";
  let currentLevel = "";
  const plans = [];
  const seen = new Set();
  const weekColumns = buildWeekColumnMap(rows);

  rows.forEach((row) => {
    const towerCell = getCell(row, 3);
    const levelCell = getCell(row, 4);
    const pourCell = getCell(row, 5);
    const rowType = getCell(row, 6);
    const activityCell = getCell(row, 7);

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

    if (rowType !== "Plan") {
      return;
    }

    const quantity = getMonthlyTotal(row);
    const weeklyPlan = weekColumns.map((columns) =>
      columns.reduce((sum, columnIndex) => sum + Number(getCell(row, columnIndex) || 0), 0)
    );
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
      tower: currentTower,
      level: currentLevel,
      pour,
      activity,
      plannedQuantity: quantity,
      weeklyPlan,
    });
  });

  return plans;
};
