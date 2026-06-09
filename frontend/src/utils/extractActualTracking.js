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

const getQuantity = (row) => {
  const candidateIndexes = [38, 39, 40];

  for (const index of candidateIndexes) {
    const value = Number(getCell(row, index));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
};

export const extractActualTracking = (rows) => {
  let currentTower = "";
  let currentLevel = "";
  const actualRows = [];
  const seen = new Set();

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

    if (rowType !== "Actual") {
      return;
    }

    const quantity = getQuantity(row);
    const pour = pourCell ? String(pourCell).trim() : "";
    const activity = activityCell ? String(activityCell).trim() : "Concrete";
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
      month: "June 2026",
      tower: currentTower,
      level: currentLevel,
      pour,
      activity,
      actualQuantity: quantity,
    });
  });

  return actualRows;
};
