export const extractMonthlyPlan = (rows) => {

  let currentTower = "";
  let currentLevel = "";

  const plans = [];

  rows.forEach((row) => {

    // Update tower memory
    if (row.__EMPTY_3) {
      currentTower = row.__EMPTY_3;
    }

    // Update level memory
    if (row.__EMPTY_4) {
      currentLevel = row.__EMPTY_4;
    }

    const pour = row.__EMPTY_5;
    const activity = row.__EMPTY_7;

    // Quantity is usually stored in cumulative column
    const quantity = Number(row.__EMPTY_37);

    if (
      currentTower &&
      currentLevel &&
      pour &&
      activity &&
      quantity > 0
    ) {

      plans.push({
        month: "June 2026",

        tower: currentTower,

        level: currentLevel,

        pour,

        activity,

        plannedQuantity: quantity
      });

    }

  });

  return plans;
};