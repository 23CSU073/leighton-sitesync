import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export const getWeeklyData = async () => {

  // Monthly Plan
  const planSnapshot =
    await getDocs(
      collection(db, "monthlyPlans")
    );

  const plans =
    planSnapshot.docs.map(doc => doc.data());


  // Actual Tracking
  const actualSnapshot =
    await getDocs(
      collection(db, "actualTracking")
    );

  const actuals =
    actualSnapshot.docs.map(doc => doc.data());


  // Daily Progress
  const progressSnapshot =
    await getDocs(
      collection(db, "dailyProgress")
    );

  const progress =
    progressSnapshot.docs.map(doc => doc.data());


  // Use actualTracking if available
  const achievedData =
    actuals.length > 0
      ? actuals
      : progress;


  // Month Total Plan
  const totalPlan =
    plans.reduce(
      (sum, item) =>
        sum + Number(item.plannedQuantity || 0),
      0
    );


  // Month Total Achieved
  const totalAchieved =
    achievedData.reduce(
      (sum, item) =>
        sum +
        Number(
          item.actualQuantity ||
          item.quantity ||
          0
        ),
      0
    );


  // Percentage
  const percentage =
    totalPlan === 0
      ? 0
      : (
          (totalAchieved / totalPlan) *
          100
        ).toFixed(1);


  // Balance
  const balance =
    totalPlan - totalAchieved;


  return {

    totalPlan,

    totalAchieved,

    percentage,

    balance

  };

};