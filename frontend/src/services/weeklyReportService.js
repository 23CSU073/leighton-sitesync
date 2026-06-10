import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

const getQuantity = (item) => Number(item.actualQuantity ?? item.quantity ?? 0);

const formatQuantity = (value) => Number(value || 0).toFixed(1).replace(".0", "");

const normalizeTower = (tower) => String(tower || "").trim().toLowerCase().replace(/^t(\d+)$/, "tower $1");

const reportGroups = [
  {
    key: "pcc",
    location: "PCC",
    matches: (tower) => normalizeTower(tower) === "pcc",
  },
  {
    key: "typical",
    location: "Typical Towers",
    matches: (tower) =>
      ["tower 1", "tower 2", "tower 14", "tower 15"].includes(normalizeTower(tower)),
  },
  {
    key: "t3456",
    location: "T-3,4,5,6",
    matches: (tower) =>
      ["tower 3", "tower 4", "tower 5", "tower 6"].includes(normalizeTower(tower)),
  },
  {
    key: "area23",
    location: "Area 2 & 3 (T 10,11,12,18,19)",
    matches: (tower) =>
      ["tower 10", "tower 11", "tower 12", "tower 18", "tower 19"].includes(normalizeTower(tower)),
  },
  {
    key: "nta",
    location: "NTA",
    matches: (tower) => normalizeTower(tower) === "nta",
  },
  {
    key: "centralNta",
    location: "Central NTA",
    matches: (tower) => normalizeTower(tower) === "central nta",
  },
];

const getReportGroup = (tower) =>
  reportGroups.find((group) => group.matches(tower)) || {
    key: normalizeTower(tower) || "other",
    location: tower || "Other",
    matches: () => false,
  };

const getMonthDate = (monthLabel) => {
  const date = new Date(`${monthLabel || ""} 1`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getPlanMonthLabel = (plan) => {
  if (plan?.monthLabel) {
    return plan.monthLabel;
  }

  if (Number.isFinite(Number(plan?.month)) && Number.isFinite(Number(plan?.year))) {
    return `${plan.month}/1/${plan.year}`;
  }

  return plan?.month || "";
};

const getPlanMonthKey = (plan) => {
  if (plan?.planMonthKey) {
    return plan.planMonthKey;
  }

  if (Number.isFinite(Number(plan?.month)) && Number.isFinite(Number(plan?.year))) {
    return `${plan.year}-${String(plan.month).padStart(2, "0")}`;
  }

  const date = getMonthDate(getPlanMonthLabel(plan));

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentMonthKey = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getReportingPlans = (plans) => {
  const activePlans = plans.filter((plan) => !plan.status || plan.status === "active");
  const currentMonthPlans = activePlans.filter((plan) => getPlanMonthKey(plan) === getCurrentMonthKey());

  if (currentMonthPlans.length > 0) {
    return currentMonthPlans;
  }

  const latestMonthKey = activePlans
    .map(getPlanMonthKey)
    .sort()
    .at(-1);

  return latestMonthKey
    ? activePlans.filter((plan) => getPlanMonthKey(plan) === latestMonthKey)
    : [];
};

const getWeekIndex = (dateValue, monthLabel) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const monthDate = getMonthDate(monthLabel);

  if (
    date.getFullYear() !== monthDate.getFullYear() ||
    date.getMonth() !== monthDate.getMonth()
  ) {
    return null;
  }

  const day = date.getDate();

  if (day >= 1 && day <= 7) return 0;
  if (day >= 8 && day <= 14) return 1;
  if (day >= 15 && day <= 21) return 2;
  return 3;
};

const getCurrentWeekIndex = (plans) => {
  const plan = plans.find((item) => item.monthLabel || item.month);
  const monthLabel = getPlanMonthLabel(plan);

  return getWeekIndex(new Date(), monthLabel) ?? 0;
};

const getPlanKey = (item) =>
  [item.tower, item.level, item.pour, item.activity]
    .map((value) => String(value || "").trim())
    .join("|");

const getPlanLabel = (item) =>
  [item.tower, item.level, item.pour, item.activity]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");

const buildPlanMap = (plans) => {
  const planMap = new Map();

  plans.forEach((item) => {
    const key = getPlanKey(item);
    const existing = planMap.get(key) || {
      key,
      location: getPlanLabel(item),
      tower: item.tower || "",
      month: getPlanMonthLabel(item),
      monthLabel: getPlanMonthLabel(item),
      weeklyPlan: [0, 0, 0, 0],
      plannedQuantity: 0,
      monthPlan: 0,
    };
    const weeklyPlan = Array.isArray(item.weeklyPlan) ? item.weeklyPlan : [];

    existing.plannedQuantity += Number(item.plannedQuantity || 0);
    existing.monthPlan += Number(item.monthPlan || item.plannedQuantity || 0);
    existing.weeklyPlan = existing.weeklyPlan.map(
      (value, index) => value + Number(weeklyPlan[index] || 0)
    );

    planMap.set(key, existing);
  });

  return planMap;
};

const findMatchingPlanKey = (item, planMap) => {
  const exactKey = getPlanKey(item);

  if (planMap.has(exactKey)) {
    return exactKey;
  }

  const normalizedTower = String(item.tower || "").trim().toLowerCase();
  const normalizedLevel = String(item.level || "").trim().toLowerCase();
  const normalizedPour = String(item.pour || "").trim().toLowerCase();
  const normalizedActivity = String(item.activity || "").trim().toLowerCase();

  return [...planMap.keys()].find((key) => {
    const [tower, level, pour, activity] = key
      .split("|")
      .map((value) => value.trim().toLowerCase());

    return (
      tower === normalizedTower &&
      (!normalizedLevel || level === normalizedLevel) &&
      (!normalizedPour || pour === normalizedPour) &&
      (!normalizedActivity || activity === normalizedActivity)
    );
  });
};

const buildActualMap = (achievedData, planMap, currentWeekIndex, useUploadedActuals) => {
  const actualMap = new Map();

  achievedData.forEach((item) => {
    const key = findMatchingPlanKey(item, planMap);

    if (!key) {
      return;
    }

    if (!useUploadedActuals) {
      const plan = planMap.get(key);
      const weekIndex = getWeekIndex(item.date, plan?.month);

      if (weekIndex !== currentWeekIndex) {
        return;
      }
    }

    const weeklyActual = Array.isArray(item.weeklyActual) ? item.weeklyActual : [];
    const quantity = useUploadedActuals
      ? Number(weeklyActual[currentWeekIndex] ?? getQuantity(item))
      : getQuantity(item);

    actualMap.set(key, (actualMap.get(key) || 0) + quantity);
  });

  return actualMap;
};

const buildWeeklyRows = (plans, achievedData, currentWeekIndex, useUploadedActuals) => {
  const planMap = buildPlanMap(plans);
  const actualMap = buildActualMap(achievedData, planMap, currentWeekIndex, useUploadedActuals);

  return [...planMap.values()]
    .map((plan) => {
      const planForWeek =
        plan.weeklyPlan.some((value) => Number(value || 0) > 0)
          ? Number(plan.weeklyPlan[currentWeekIndex] || 0)
          : Number(plan.plannedQuantity || 0);
      const achieved = Number(actualMap.get(plan.key) || 0);
      const percentage = planForWeek === 0 ? 0 : ((achieved / planForWeek) * 100).toFixed(1);

      return {
        key: plan.key,
        location: plan.location,
        tower: plan.tower,
        plan: planForWeek,
        achieved,
        percentage,
        shortfall: achieved - planForWeek,
        weeklyPlan: plan.weeklyPlan,
        monthPlan: plan.monthPlan || plan.plannedQuantity,
      };
    })
    .filter((row) => row.plan > 0 || row.achieved > 0);
};

const buildMonthlyActualMap = (achievedData, planMap, useUploadedActuals) => {
  const actualMap = new Map();

  achievedData.forEach((item) => {
    const key = findMatchingPlanKey(item, planMap);

    if (!key) {
      return;
    }

    actualMap.set(key, (actualMap.get(key) || 0) + getQuantity(item));
  });

  return actualMap;
};

const buildWeeklyReportRows = (plans, achievedData, currentWeekIndex, useUploadedActuals) => {
  const planMap = buildPlanMap(plans);
  const weeklyActualMap = buildActualMap(achievedData, planMap, currentWeekIndex, useUploadedActuals);
  const monthlyActualMap = buildMonthlyActualMap(achievedData, planMap, useUploadedActuals);
  const groupMap = new Map();

  [...planMap.values()].forEach((plan) => {
    const group = getReportGroup(plan.tower);
    const existing = groupMap.get(group.key) || {
      key: group.key,
      location: group.location,
      plan: 0,
      achieved: 0,
      weeklyPlan: [0, 0, 0, 0],
      monthPlan: 0,
      monthAchieved: 0,
    };

    existing.plan += Number(plan.weeklyPlan[currentWeekIndex] || plan.plannedQuantity || 0);
    existing.achieved += Number(weeklyActualMap.get(plan.key) || 0);
    existing.monthAchieved += Number(monthlyActualMap.get(plan.key) || 0);
    existing.monthPlan += Number(plan.monthPlan || plan.plannedQuantity || 0);
    existing.weeklyPlan = existing.weeklyPlan.map(
      (value, index) => value + Number(plan.weeklyPlan[index] || 0)
    );

    groupMap.set(group.key, existing);
  });

  return [...groupMap.values()]
    .filter((row) => row.plan > 0 || row.achieved > 0 || row.monthPlan > 0 || row.monthAchieved > 0)
    .map((row) => ({
      ...row,
      percentage: row.plan === 0 ? 0 : ((row.achieved / row.plan) * 100).toFixed(1),
      shortfall: row.achieved - row.plan,
      balance: row.monthPlan - row.monthAchieved,
      monthPercentage: row.monthPlan === 0 ? 0 : ((row.monthAchieved / row.monthPlan) * 100).toFixed(1),
    }));
};

const buildLookAheadWeeks = (plans, currentWeekIndex) => {
  const planMap = buildPlanMap(plans);

  return [0, 1, 2, 3]
    .filter((weekIndex) => weekIndex > currentWeekIndex)
    .map((weekIndex) => ({
      label: `Week ${weekIndex + 1}`,
      value: [...planMap.values()].reduce(
        (sum, plan) => sum + Number(plan.weeklyPlan[weekIndex] || 0),
        0
      ),
    }));
};

const buildDelayAnalysis = (weeklyRows) =>
  weeklyRows
    .filter((row) => row.shortfall < 0)
    .map((row) => {
      const shortfall = Math.abs(row.shortfall);

      return {
        key: row.key,
        location: row.location,
        planned: row.plan,
        actual: row.achieved,
        achievement: row.percentage,
        shortfall,
        observation: `${row.location} achieved ${formatQuantity(row.achieved)} cum against planned ${formatQuantity(row.plan)} cum. A shortfall of ${formatQuantity(shortfall)} cum was observed.`,
      };
    });

const buildReportHistory = (plans, progress, currentWeekIndex) => {
  const planMap = buildPlanMap(plans);

  return [...planMap.values()].flatMap((plan) =>
    plan.weeklyPlan
      .map((planned, weekIndex) => {
        if (weekIndex >= currentWeekIndex || Number(planned || 0) <= 0) {
          return null;
        }

        const actual = progress
          .filter((item) => findMatchingPlanKey(item, planMap) === plan.key)
          .filter((item) => getWeekIndex(item.date, plan.month) === weekIndex)
          .reduce((sum, item) => sum + getQuantity(item), 0);
        const percentage = planned === 0 ? 0 : ((actual / planned) * 100).toFixed(1);
        const variance = actual - planned;

        return {
          week: `Week ${weekIndex + 1}`,
          location: plan.location,
          summary:
            variance < 0
              ? `Achieved ${percentage}%, shortfall ${formatQuantity(Math.abs(variance))} cum`
              : `Achieved ${percentage}%, ahead by ${formatQuantity(variance)} cum`,
        };
      })
      .filter(Boolean)
  );
};

export const getWeeklyData = async () => {
  const [planSnapshot, actualSnapshot, progressSnapshot] = await Promise.all([
    getDocs(collection(db, "monthlyPlans")),
    getDocs(collection(db, "actualTracking")),
    getDocs(collection(db, "dailyProgress")),
  ]);

  const plans = planSnapshot.docs.map((document) => document.data());
  const actuals = actualSnapshot.docs.map((document) => document.data());
  const progress = progressSnapshot.docs.map((document) => document.data());

  return buildWeeklyData({ plans, actuals, progress });
};

export const buildWeeklyData = ({ plans = [], actuals = [], progress = [] }) => {
  const activePlans = getReportingPlans(plans);
  const useUploadedActuals = actuals.length > 0;
  const achievedData = useUploadedActuals ? actuals : progress;
  const currentWeekIndex = getCurrentWeekIndex(activePlans);
  const weeklyRows = buildWeeklyRows(activePlans, achievedData, currentWeekIndex, useUploadedActuals);
  const weeklyReportRows = buildWeeklyReportRows(activePlans, achievedData, currentWeekIndex, useUploadedActuals);
  const lookAheadWeeks = buildLookAheadWeeks(activePlans, currentWeekIndex);
  const totalPlan = weeklyReportRows.reduce((sum, item) => sum + Number(item.plan || 0), 0);
  const totalAchieved = weeklyReportRows.reduce((sum, item) => sum + Number(item.achieved || 0), 0);
  const percentage = totalPlan === 0 ? 0 : ((totalAchieved / totalPlan) * 100).toFixed(1);
  const balance = totalPlan - totalAchieved;
  const delayAnalysis = buildDelayAnalysis(weeklyRows);
  const reportHistory = buildReportHistory(activePlans, progress, currentWeekIndex);

  return {
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    currentWeek: `Week ${currentWeekIndex + 1}`,
    dataSource: useUploadedActuals ? "Actual Tracking Excel" : "Daily Progress",
    weeklyRows,
    weeklyReportRows,
    lookAheadWeeks,
    delayAnalysis,
    reportHistory,
    plans: activePlans,
    actuals,
    progress,
  };
};

export const subscribeToWeeklyData = (callback) => {
  const state = {
    plans: [],
    actuals: [],
    progress: [],
  };

  const emit = () => callback(buildWeeklyData(state));

  const unsubscribers = [
    onSnapshot(collection(db, "monthlyPlans"), (snapshot) => {
      state.plans = snapshot.docs.map((document) => document.data());
      emit();
    }),
    onSnapshot(collection(db, "actualTracking"), (snapshot) => {
      state.actuals = snapshot.docs.map((document) => document.data());
      emit();
    }),
    onSnapshot(collection(db, "dailyProgress"), (snapshot) => {
      state.progress = snapshot.docs.map((document) => document.data());
      emit();
    }),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const saveWeeklyReport = async (report) => {
  const reference = await addDoc(collection(db, "weeklyReports"), {
    ...report,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "lookAhead"), {
    week: report.week,
    text: report.lookAhead || "",
    createdBy: report.createdBy,
    createdAt: serverTimestamp(),
  });

  return reference.id;
};

export const subscribeToWeeklyReports = (callback) => {
  const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
  });
};
