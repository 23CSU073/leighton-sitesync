export const extractActualTracking = (rows) => {

  let currentTower = "";
  let currentLevel = "";
  let currentPour = "";

  const actualRows = [];

  rows.forEach((row) => {

    // Remember tower
    if (row.Unnamed_4 || row["Unnamed: 4"]) {
      currentTower = row.Unnamed_4 || row["Unnamed: 4"];
    }

    // Remember level
    if (row.Unnamed_5 || row["Unnamed: 5"]) {
      currentLevel = row.Unnamed_5 || row["Unnamed: 5"];
    }

    // Remember pour
    if (row.Unnamed_6 || row["Unnamed: 6"]) {
      currentPour = row.Unnamed_6 || row["Unnamed: 6"];
    }

    // Only Actual rows
    if (
      row.Unnamed_7 !== "Actual" &&
      row["Unnamed: 7"] !== "Actual"
    ) {
      return;
    }

    const activity =
      row.Unnamed_8 ||
      row["Unnamed: 8"] ||
      "Concrete";

    Object.keys(row).forEach((key) => {

      if (
        typeof row[key] === "number" &&
        row[key] > 0
      ) {

        if (
          currentTower &&
          currentLevel &&
          currentPour
        ) {

          actualRows.push({

            month: "June 2026",

            tower: currentTower,

            level: currentLevel,

            pour: currentPour,

            activity,

            actualQuantity: row[key]

          });

        }

      }

    });

  });

  return actualRows;

};