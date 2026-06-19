import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";

const getQuantity = (item) => Number(item.actualQuantity ?? item.quantity ?? 0);

const formatQuantity = (value) => Number(value || 0).toFixed(1).replace(".0", "");

const normalizeTower = (tower) => String(tower || "").trim().toLowerCase().replace(/^t(\d+)$/, "tower $1");

const normalizeCompact = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const itemHasPcc = (item) =>
  [item?.tower, item?.level, item?.pour, item?.activity, item?.location]
    .some((value) => normalizeCompact(value).includes("pcc"));

const reportGroups = [
  {
    key: "pcc",
    location: "PCC",
    matches: (item) => itemHasPcc(item),
  },
  {
    key: "typical",
    location: "Typical Towers",
    matches: (item) =>
      ["tower 1", "tower 2", "tower 3", "tower 4", "tower 5", "tower 6", "tower 14", "tower 15"].includes(normalizeTower(item?.tower)),
  },
  {
    key: "area23",
    location: "Area 2 & 3 (T 10,11,12,18,19)",
    matches: (item) =>
      ["tower 10", "tower 11", "tower 12", "tower 18", "tower 19"].includes(normalizeTower(item?.tower)),
  },
  {
    key: "nta",
    location: "NTA",
    matches: (item) => normalizeTower(item?.tower) === "nta",
  },
  {
    key: "centralNta",
    location: "Central NTA",
    matches: (item) => normalizeTower(item?.tower) === "central nta",
  },
];

const getReportGroup = (item) =>
  reportGroups.find((group) => group.matches(item)) || {
    key: normalizeTower(item?.tower) || "other",
    location: item?.tower || "Other",
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

const getActualMonthKey = (actual) => {
  if (actual?.actualMonthKey || actual?.monthKey) {
    return actual.actualMonthKey || actual.monthKey;
  }

  if (Number.isFinite(Number(actual?.month)) && Number.isFinite(Number(actual?.year))) {
    return `${actual.year}-${String(actual.month).padStart(2, "0")}`;
  }

  const date = getMonthDate(actual?.monthLabel || actual?.month);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getDateMonthKey = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentMonthKey = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabelFromKey = (monthKey) => {
  const [year, month] = String(monthKey || "").split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const getReportingPlans = (plans, selectedMonthKey) => {
  const requestedMonthPlans = selectedMonthKey
    ? plans.filter((plan) => getPlanMonthKey(plan) === selectedMonthKey)
    : [];

  if (requestedMonthPlans.length > 0) {
    return requestedMonthPlans;
  }

  if (selectedMonthKey) {
    return [];
  }

  const currentMonthPlans = plans.filter((plan) => getPlanMonthKey(plan) === getCurrentMonthKey());

  if (currentMonthPlans.length > 0) {
    return currentMonthPlans;
  }

  return [];
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
  if (day >= 15 && day <= 22) return 2;
  if (day >= 23 && day <= 30) return 3;
  return null;
};

const getPlanDateWeeklyValues = (item) => {
  const weekIndex = item?.planDate ? getWeekIndex(item.planDate, getPlanMonthLabel(item)) : null;

  if (weekIndex === null) {
    return null;
  }

  const quantity = Number(item.plannedQuantity || item.monthPlan || 0);
  const weeklyPlan = [0, 0, 0, 0];

  weeklyPlan[weekIndex] = quantity;

  return weeklyPlan;
};

const buildCumulativeFromWeekly = (weeklyPlan) =>
  weeklyPlan.map((_, index) =>
    weeklyPlan
      .slice(0, index + 1)
      .reduce((sum, value) => sum + Number(value || 0), 0)
  );

const getCurrentWeekIndex = (plans) => {
  const plan = plans.find((item) => item.monthLabel || item.month);
  const monthLabel = getPlanMonthLabel(plan);

  return getWeekIndex(new Date(), monthLabel) ?? 0;
};

const getMonthOptions = (plans) =>
  [...new Set(plans.map(getPlanMonthKey))]
    .sort()
    .reverse()
    .map((key) => ({ key, label: formatMonthLabelFromKey(key) }));

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
      level: item.level || "",
      pour: item.pour || "",
      activity: item.activity || "",
      month: getPlanMonthLabel(item),
      monthLabel: getPlanMonthLabel(item),
      weeklyPlan: [0, 0, 0, 0],
      cumulativePlan: [0, 0, 0, 0],
      plannedQuantity: 0,
      monthPlan: 0,
    };
    const dateWeeklyPlan = getPlanDateWeeklyValues(item);
    const weeklyPlan = dateWeeklyPlan || (Array.isArray(item.weeklyPlan) ? item.weeklyPlan : []);
    const cumulativePlan = dateWeeklyPlan
      ? buildCumulativeFromWeekly(dateWeeklyPlan)
      : Array.isArray(item.cumulativePlan)
        ? item.cumulativePlan
        : buildCumulativeFromWeekly(weeklyPlan);

    existing.plannedQuantity += Number(item.plannedQuantity || 0);
    existing.monthPlan += Number(item.monthPlan || item.plannedQuantity || 0);
    existing.weeklyPlan = existing.weeklyPlan.map(
      (value, index) => value + Number(weeklyPlan[index] || 0)
    );
    existing.cumulativePlan = existing.cumulativePlan.map((value, index) => {
      const cumulativeValue = Number(cumulativePlan[index] || 0);

      if (cumulativeValue > 0) {
        return value + cumulativeValue;
      }

      return (
        value +
        weeklyPlan
          .slice(0, index + 1)
          .reduce((sum, weeklyValue) => sum + Number(weeklyValue || 0), 0)
      );
    });

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

const buildMonthlyActualMap = (achievedData, planMap) => {
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

const buildMonthlyActualMapToWeek = (achievedData, planMap, weekIndex, useUploadedActuals) => {
  const actualMap = new Map();

  achievedData.forEach((item) => {
    const key = findMatchingPlanKey(item, planMap);

    if (!key) {
      return;
    }

    if (useUploadedActuals) {
      const weeklyActual = Array.isArray(item.weeklyActual) ? item.weeklyActual : [];
      const actual = weeklyActual.length > 0
        ? weeklyActual
            .slice(0, weekIndex + 1)
            .reduce((sum, value) => sum + Number(value || 0), 0)
        : getQuantity(item);

      actualMap.set(key, (actualMap.get(key) || 0) + actual);
      return;
    }

    const plan = planMap.get(key);
    const itemWeekIndex = getWeekIndex(item.date, plan?.month);

    if (itemWeekIndex !== null && itemWeekIndex <= weekIndex) {
      actualMap.set(key, (actualMap.get(key) || 0) + getQuantity(item));
    }
  });

  return actualMap;
};

const buildWeeklyReportRows = (plans, achievedData, currentWeekIndex, useUploadedActuals) => {
  const planMap = buildPlanMap(plans);
  const weeklyActualMap = buildActualMap(achievedData, planMap, currentWeekIndex, useUploadedActuals);
  const monthlyActualMap = buildMonthlyActualMapToWeek(achievedData, planMap, currentWeekIndex, useUploadedActuals);
  const groupMap = new Map();

  [...planMap.values()].forEach((plan) => {
    const group = getReportGroup(plan);
    const existing = groupMap.get(group.key) || {
      key: group.key,
      location: group.location,
      plan: 0,
      achieved: 0,
      weeklyPlan: [0, 0, 0, 0],
      cumulativePlan: [0, 0, 0, 0],
      monthPlan: 0,
      monthAchieved: 0,
    };

    const hasWeeklyPlan = plan.weeklyPlan.some((value) => Number(value || 0) > 0);
    const planForWeek = hasWeeklyPlan
      ? Number(plan.weeklyPlan[currentWeekIndex] || 0)
      : Number(plan.plannedQuantity || 0);

    existing.plan += planForWeek;
    existing.achieved += Number(weeklyActualMap.get(plan.key) || 0);
    existing.monthAchieved += Number(monthlyActualMap.get(plan.key) || 0);
    existing.monthPlan += plan.weeklyPlan
      .slice(0, currentWeekIndex + 1)
      .reduce((sum, value) => sum + Number(value || 0), 0) || Number(plan.monthPlan || plan.plannedQuantity || 0);
    existing.weeklyPlan = existing.weeklyPlan.map(
      (value, index) => value + Number(plan.weeklyPlan[index] || 0)
    );
    existing.cumulativePlan = existing.cumulativePlan.map(
      (value, index) => value + Number(plan.cumulativePlan[index] || 0)
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

const buildMonthPerformanceRows = (plans, actuals, progress) =>
  getMonthOptions(plans).map((month) => {
    const monthPlans = getReportingPlans(plans, month.key);
    const planMap = buildPlanMap(monthPlans);
    const monthActuals = actuals.filter((actual) => getActualMonthKey(actual) === month.key);
    const monthProgress = progress.filter((item) => getDateMonthKey(item.date) === month.key);
    const useUploadedActuals = monthActuals.length > 0;
    const achievedData = useUploadedActuals ? monthActuals : monthProgress;
    const actualMap = buildMonthlyActualMap(achievedData, planMap);
    const planned = [...planMap.values()].reduce(
      (sum, plan) => sum + Number(plan.monthPlan || plan.plannedQuantity || 0),
      0
    );
    const achieved = [...actualMap.values()].reduce((sum, value) => sum + Number(value || 0), 0);
    const weeklyBreakdown = [0, 1, 2, 3].map((weekIndex) => {
      const weeklyRows = buildWeeklyReportRows(monthPlans, achievedData, weekIndex, useUploadedActuals);
      const weekPlanned = weeklyRows.reduce(
        (sum, row) => sum + Number(row.weeklyPlan?.[weekIndex] || 0),
        0
      );
      const weekAchieved = weeklyRows.reduce((sum, row) => sum + Number(row.achieved || 0), 0);

      return {
        week: `Week ${weekIndex + 1}`,
        planned: weekPlanned,
        achieved: weekAchieved,
        variance: weekAchieved - weekPlanned,
      };
    });

    return {
      monthKey: month.key,
      monthLabel: month.label,
      planned,
      achieved,
      variance: achieved - planned,
      percentage: planned === 0 ? 0 : ((achieved / planned) * 100).toFixed(1),
      weeklyBreakdown,
    };
  });

const getWeeklySnapshotId = (monthKey, weekIndex) =>
  `${monthKey || "unknown-month"}-week-${Number(weekIndex || 0) + 1}`;

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

export const buildWeeklyData = ({ plans = [], actuals = [], progress = [], selectedWeekIndex, selectedMonthKey } = {}) => {
  const activePlans = getReportingPlans(plans, selectedMonthKey);
  const currentMonthKey = getCurrentMonthKey();
  const selectedMonth = activePlans[0] ? getPlanMonthKey(activePlans[0]) : selectedMonthKey || currentMonthKey;
  const missingCurrentMonthPlan = !selectedMonthKey && activePlans.length === 0;
  const missingSelectedMonthPlan = Boolean(selectedMonthKey) && activePlans.length === 0;
  const monthActuals = selectedMonth
    ? actuals.filter((actual) => getActualMonthKey(actual) === selectedMonth)
    : actuals;
  const monthProgress = selectedMonth
    ? progress.filter((item) => getDateMonthKey(item.date) === selectedMonth)
    : progress;
  const useUploadedActuals = monthActuals.length > 0;
  const achievedData = useUploadedActuals ? monthActuals : monthProgress;
  const currentWeekIndex = Number.isInteger(selectedWeekIndex)
    ? Math.min(Math.max(selectedWeekIndex, 0), 3)
    : getCurrentWeekIndex(activePlans);
  const weeklyRows = buildWeeklyRows(activePlans, achievedData, currentWeekIndex, useUploadedActuals);
  const weeklyReportRows = buildWeeklyReportRows(activePlans, achievedData, currentWeekIndex, useUploadedActuals);
  const lookAheadWeeks = buildLookAheadWeeks(activePlans, currentWeekIndex);
  const totalMonthPlan = activePlans.reduce(
    (sum, item) => sum + Number(item.monthPlan || item.plannedQuantity || 0),
    0
  );
  const totalPlan = weeklyReportRows.reduce((sum, item) => sum + Number(item.plan || 0), 0);
  const totalAchieved = weeklyReportRows.reduce((sum, item) => sum + Number(item.achieved || 0), 0);
  const percentage = totalPlan === 0 ? 0 : ((totalAchieved / totalPlan) * 100).toFixed(1);
  const balance = totalPlan - totalAchieved;
  const delayAnalysis = buildDelayAnalysis(weeklyRows);
  const reportHistory = buildReportHistory(activePlans, monthProgress, currentWeekIndex);
  const todayKey = new Date().toISOString().split("T")[0];
  const hasTodayProgress = progress.some((item) => item.date === todayKey);
  const monthOptions = getMonthOptions(plans);
  const monthPerformanceRows = buildMonthPerformanceRows(plans, actuals, progress);

  return {
    totalPlan,
    totalMonthPlan,
    totalAchieved,
    percentage,
    balance,
    currentWeek: `Week ${currentWeekIndex + 1}`,
    currentWeekIndex,
    selectedMonth,
    selectedMonthLabel: formatMonthLabelFromKey(selectedMonth),
    missingCurrentMonthPlan,
    missingSelectedMonthPlan,
    monthOptions,
    hasTodayProgress,
    todayKey,
    dataSource: useUploadedActuals ? "Actual Tracking Excel" : "Daily Progress",
    weeklyRows,
    weeklyReportRows,
    lookAheadWeeks,
    delayAnalysis,
    reportHistory,
    monthPerformanceRows,
    plans: activePlans,
    actuals: monthActuals,
    progress: monthProgress,
  };
};

export const ensureWeeklyReportSnapshot = async (weeklyData, createdBy = "system") => {
  if (!weeklyData?.selectedMonth) {
    return null;
  }

  const id = getWeeklySnapshotId(weeklyData.selectedMonth, weeklyData.currentWeekIndex);
  const reference = doc(db, "weeklyReports", id);

  await setDoc(
    reference,
    {
      autoGenerated: true,
      week: weeklyData.currentWeek,
      weekIndex: weeklyData.currentWeekIndex,
      monthKey: weeklyData.selectedMonth,
      monthLabel: weeklyData.selectedMonthLabel,
      totalPlan: weeklyData.totalPlan,
      totalAchieved: weeklyData.totalAchieved,
      percentage: weeklyData.percentage,
      balance: weeklyData.balance,
      rows: weeklyData.weeklyReportRows,
      dataSource: weeklyData.dataSource,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
};

export const subscribeToWeeklyData = (callback, options = {}) => {
  const state = {
    plans: [],
    actuals: [],
    progress: [],
  };

  const emit = () => callback(buildWeeklyData({ ...state, ...options }));

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
  const id = report.monthKey
    ? getWeeklySnapshotId(report.monthKey, report.weekIndex)
    : null;
  const payload = {
    ...report,
    autoGenerated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const reference = id
    ? doc(db, "weeklyReports", id)
    : await addDoc(collection(db, "weeklyReports"), {
        ...payload,
        createdAt: serverTimestamp(),
      });

  if (id) {
    await setDoc(reference, payload, { merge: true });
  }

  await addDoc(collection(db, "lookAhead"), {
    week: report.week,
    monthKey: report.monthKey || "",
    text: report.lookAhead || "",
    createdBy: report.createdBy,
    createdAt: serverTimestamp(),
  });

  return id || reference.id;
};

export const subscribeToWeeklyReports = (callback) => {
  const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
  });
};
