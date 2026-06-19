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

export const getCell = (row, index) => row?.[index] ?? null;

export const parseWorkbookDate = (value) => {
  if (value instanceof Date) {
    return new Date(value.getTime() + 12 * 60 * 60 * 1000);
  }

  if (typeof value === "number" && value > 20000) {
    return new Date(Math.round((value - 25569) * 86400 * 1000) + 12 * 60 * 60 * 1000);
  }

  return new Date(value);
};

export const isRealTowerName = (value) =>
  typeof value === "string" &&
  (/^(Tower\s*\d+|T\d+|PCC|NTA|Central NTA|Club House)$/i.test(value.trim()) ||
    normalizeCompact(value) === "pcc");

export const isSpecialAreaName = (value) =>
  typeof value === "string" &&
  (/^(PCC|NTA|Central NTA|Club House)$/i.test(value.trim()) ||
    normalizeCompact(value) === "pcc");

export const isRealLevelName = (value) =>
  typeof value === "string" &&
  value.trim() !== "" &&
  !/^(Level|Tower|Plan|Actual|S\.No\.|Elements\/Pours|Elements)$/i.test(value.trim());

export const getWeekIndexFromDate = (value) => {
  const date = parseWorkbookDate(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getDate();

  if (day >= 1 && day <= 7) return 0;
  if (day >= 8 && day <= 14) return 1;
  if (day >= 15 && day <= 22) return 2;
  if (day >= 23 && day <= 30) return 3;
  return null;
};

export const getMonthLabelFromDate = (value) => {
  const date = parseWorkbookDate(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

export const findConcreteWorkbookLayout = (rows) => {
  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => normalize(cell).includes("plan") && normalize(cell).includes("actual"))
  );
  const headerRow = rows[headerRowIndex] || [];
  const columns = {
    tower: headerRow.findIndex((cell) => normalize(cell) === "tower"),
    level: headerRow.findIndex((cell) => normalize(cell) === "level"),
    pour: headerRow.findIndex((cell) => normalize(cell).includes("elements/pours")),
    rowType: headerRow.findIndex((cell) => normalize(cell).includes("plan") && normalize(cell).includes("actual")),
    activity: headerRow.findIndex((cell) => normalize(cell) === "elements"),
  };
  const dateColumns = headerRow
    .map((cell, index) => ({
      cell,
      index,
      date: parseWorkbookDate(cell),
    }))
    .filter((item) => item.cell !== null && item.cell !== "")
    .filter((item) => !Number.isNaN(item.date.getTime()))
    .map((item) => ({
      ...item,
      weekIndex: getWeekIndexFromDate(item.date),
    }))
    .filter((item) => item.weekIndex !== null);
  const totalColumns = headerRow
    .map((cell, index) => ({ cell: normalize(cell), index }))
    .filter((item) => item.cell.includes("total"))
    .map((item) => item.index);

  return {
    headerRowIndex,
    columns,
    dateColumns,
    totalColumns,
    month: getMonthLabelFromDate(dateColumns[0]?.date),
  };
};

export const sumColumns = (row, columns) =>
  columns.reduce((sum, column) => sum + Number(getCell(row, column) || 0), 0);

export const buildWeeklyValues = (row, dateColumns) =>
  [0, 1, 2, 3].map((weekIndex) =>
    sumColumns(
      row,
      dateColumns
        .filter((column) => column.weekIndex === weekIndex)
        .map((column) => column.index)
    )
  );

export const buildCumulativeCutoffValues = (row, dateColumns) =>
  [7, 14, 22, 30].map((cutoffDay) =>
    sumColumns(
      row,
      dateColumns
        .filter((column) => column.date.getDate() <= cutoffDay)
        .map((column) => column.index)
    )
  );

export const getSummaryCumulativePlanValues = (rows, layout) => {
  const firstTotalColumn = layout.totalColumns[0] ?? Infinity;
  const dateColumns = layout.dateColumns.filter((column) => column.index < firstTotalColumn);
  const cutoffColumns = [7, 14, 22, 30].map((cutoffDay) =>
    dateColumns
      .filter((column) => column.date.getDate() <= cutoffDay)
      .at(-1)
  );

  if (cutoffColumns.some((column) => !column)) {
    return [0, 0, 0, 0];
  }

  return rows.reduce(
    (totals, row) => {
      const rowType = normalize(getCell(row, layout.columns.rowType));
      const level = normalize(getCell(row, layout.columns.level));

      if (rowType !== "plan" || !level.includes("cumm") || !level.includes("plan")) {
        return totals;
      }

      return totals.map(
        (total, index) => total + Number(getCell(row, cutoffColumns[index].index) || 0)
      );
    },
    [0, 0, 0, 0]
  );
};

export const getRowTotal = (row, layout) => {
  const totalFromHeader = sumColumns(row, layout.totalColumns);

  if (totalFromHeader > 0) {
    return totalFromHeader;
  }

  return sumColumns(row, layout.dateColumns.map((column) => column.index));
};
