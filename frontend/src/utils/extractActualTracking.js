const getCell = (row, index) => row?.[index] ?? null;

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

    if (towerCell && typeof towerCell === "string" && towerCell.startsWith("Tower")) {
      currentTower = towerCell.trim();
    }

    if (towerCell === "PCC" || towerCell === "NTA" || towerCell === "Central NTA") {
      currentTower = towerCell.trim();
    }

    if (levelCell && typeof levelCell === "string") {
      currentLevel = levelCell.trim();
    }

    if (rowType !== "Actual") {
      return;
    }

    const quantity = getMonthlyTotal(row);
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
