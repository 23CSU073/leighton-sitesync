import { getWeeklyData } from "./weeklyReportService";

const roundQuantity = (value) => Number(Number(value || 0).toFixed(1));

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeActivity = (activity) => {
  const normalized = normalizeText(activity);

  return normalized.includes("concrete") ? "concrete" : normalized;
};

const getReconciliationKey = (item) =>
  [
    normalizeText(item.tower),
    normalizeText(item.level),
    normalizeText(item.pour || item.core),
    normalizeActivity(item.activity),
  ].join("|");

const getReconciliationLabel = (item) =>
  [item.tower, item.level, item.pour || item.core, item.activity]
    .filter(Boolean)
    .join(" / ");

const getProgressReason = (item) => item.reason || item.hindranceReason || "";

const isApplicableReason = (reason) =>
  Boolean(reason) && normalizeText(reason) !== "not applicable";

const buildReasonMap = (progress) => {
  const reasonMap = new Map();

  progress.forEach((item) => {
    const reason = getProgressReason(item);

    if (!isApplicableReason(reason)) {
      return;
    }

    const key = getReconciliationKey(item);
    const existing = reasonMap.get(key) || { reasons: new Set(), dates: new Set() };

    existing.reasons.add(reason);
    if (item.date) {
      existing.dates.add(item.date);
    }
    reasonMap.set(key, existing);
  });

  return reasonMap;
};

const buildDailyLogMap = (progress) => {
  const dailyLogMap = new Map();

  progress.forEach((item) => {
    const key = getReconciliationKey(item);
    const existing = dailyLogMap.get(key) || { dates: new Set(), reasons: new Set() };
    const reason = getProgressReason(item);

    if (item.date) {
      existing.dates.add(item.date);
    }

    if (reason) {
      existing.reasons.add(reason);
    }

    dailyLogMap.set(key, existing);
  });

  return dailyLogMap;
};

const normalizePipeKey = (key) => {
  const [tower, level, pour, activity] = String(key || "").split("|");

  return [
    normalizeText(tower),
    normalizeText(level),
    normalizeText(pour),
    normalizeActivity(activity),
  ].join("|");
};

const getReasonsForKey = (reasonMap, key) => {
  const entry = reasonMap.get(key) || reasonMap.get(normalizePipeKey(key));

  return [...(entry?.reasons || [])].join(", ");
};

const getReasonDatesForKey = (reasonMap, key) => {
  const entry = reasonMap.get(key) || reasonMap.get(normalizePipeKey(key));

  return [...(entry?.dates || [])].sort().join(", ");
};

const getDailyLogEntryForKey = (dailyLogMap, key) =>
  dailyLogMap.get(key) || dailyLogMap.get(normalizePipeKey(key));

const buildReconciliationReport = (actuals, progress) => {
  const actualMap = new Map();
  const dailyMap = new Map();
  const reasonMap = buildReasonMap(progress);

  actuals.forEach((item) => {
    const key = getReconciliationKey(item);
    const existing = actualMap.get(key) || { label: getReconciliationLabel(item), actual: 0 };

    existing.actual += Number(item.actualQuantity || 0);
    actualMap.set(key, existing);
  });

  progress.forEach((item) => {
    const key = getReconciliationKey(item);
    const existing = dailyMap.get(key) || {
      label: getReconciliationLabel(item),
      daily: 0,
      dates: new Set(),
    };

    existing.daily += Number(item.quantity || 0);
    if (item.date) {
      existing.dates.add(item.date);
    }
    dailyMap.set(key, existing);
  });

  return [...new Set([...actualMap.keys(), ...dailyMap.keys()])]
    .map((key) => {
      const actual = actualMap.get(key);
      const daily = dailyMap.get(key);
      const actualQuantity = Number(actual?.actual || 0);
      const dailyQuantity = Number(daily?.daily || 0);
      const variance = dailyQuantity - actualQuantity;
      let status = "Matched";

      if (actualQuantity > 0 && dailyQuantity === 0) {
        status = "Daily Log Missing";
      } else if (actualQuantity === 0 && dailyQuantity !== 0) {
        status = "Only Daily Log Found";
      } else if (Math.abs(variance) > 0.1) {
        status = "Quantity Mismatch";
      }

      return {
        "Tower / Level / Pour / Activity": actual?.label || daily?.label || "Unmapped",
        "Actual Tracking": roundQuantity(actualQuantity),
        "Daily Logged": roundQuantity(dailyQuantity),
        Variance: roundQuantity(variance),
        Status: status,
        "Daily Log Dates": [...(daily?.dates || [])].sort().join(", "),
        "Shortfall Reason": getReasonsForKey(reasonMap, key),
      };
    })
    .filter((row) => row["Actual Tracking"] > 0 || row["Daily Logged"] !== 0);
};

const formatQuantity = (value) => Number(value || 0).toFixed(1).replace(".0", "");

const buildMonthlySummaryReport = (plans, actuals, progress) => {
  const summaryMap = new Map();
  const hasActualUpload = actuals.length > 0;
  const actualSource = hasActualUpload ? actuals : progress;

  plans.forEach((plan) => {
    const key = getReconciliationKey(plan);
    const existing = summaryMap.get(key) || {
      key,
      label: getReconciliationLabel(plan),
      planned: 0,
      actual: 0,
    };

    existing.planned += Number(plan.monthPlan || plan.plannedQuantity || 0);
    summaryMap.set(key, existing);
  });

  actualSource.forEach((item) => {
    const key = getReconciliationKey(item);
    const existing = summaryMap.get(key) || {
      key,
      label: getReconciliationLabel(item),
      planned: 0,
      actual: 0,
    };

    existing.actual += hasActualUpload
      ? Number(item.actualQuantity || item.quantity || 0)
      : Number(item.quantity || item.actualQuantity || 0);
    summaryMap.set(key, existing);
  });

  return [...summaryMap.values()]
    .map((item) => {
      const shortfall = Math.max(item.planned - item.actual, 0);

      return {
        key: item.key,
        location: item.label,
        planned: item.planned,
        actual: item.actual,
        shortfall,
        achievement: item.planned === 0 ? 0 : ((item.actual / item.planned) * 100).toFixed(1),
        observation:
          `${item.label} achieved ${formatQuantity(item.actual)} cum against planned ${formatQuantity(item.planned)} cum. ` +
          `A shortfall of ${formatQuantity(shortfall)} cum was observed.`,
      };
    })
    .filter((item) => item.planned > 0 || item.actual > 0)
    .sort((first, second) => second.shortfall - first.shortfall);
};

const formatReportDate = (dateValue) => {
  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? dateValue
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getWeeklyValues = (item, field) => {
  const values = Array.isArray(item?.[field]) ? item[field] : [];

  return [0, 1, 2, 3].map((index) => Number(values[index] || 0));
};

const getWeekIndexFromPlanDate = (dateValue) => {
  const date = new Date(dateValue);

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

const getPlanWeeklyValues = (plan) => {
  const weekIndex = getWeekIndexFromPlanDate(plan.planDate);

  if (weekIndex !== null) {
    const quantity = Number(plan.plannedQuantity || plan.monthPlan || 0);
    const values = [0, 0, 0, 0];

    values[weekIndex] = quantity;

    return values;
  }

  const weeklyPlan = getWeeklyValues(plan, "weeklyPlan");

  if (weeklyPlan.some((value) => value > 0)) {
    return weeklyPlan;
  }

  const cumulativePlan = getWeeklyValues(plan, "cumulativePlan");

  return cumulativePlan.map((value, index) =>
    index === 0 ? value : value - cumulativePlan[index - 1]
  );
};

const getWeeklyPlanValues = (plans) =>
  {
    return [0, 1, 2, 3].map((weekIndex) =>
      plans.reduce((sum, plan) => {
        const weeklyPlan = getPlanWeeklyValues(plan);

        return sum + weeklyPlan[weekIndex];
      }, 0)
    );
  };

export const buildReportsFromWeeklyData = (weeklyData) => {
  const {
    lookAheadWeeks = [],
    monthPerformanceRows = [],
    actuals = [],
    progress = [],
    todayKey = new Date().toISOString().split("T")[0],
    totalPlan,
    totalAchieved,
    percentage,
    balance,
    currentWeek = "Current Week",
    selectedMonth,
    plans = [],
  } = weeklyData;

  const concreteReport = progress
    .filter((row) => row.date === todayKey)
    .map((row) => ({
      Date: formatReportDate(row.date),
      Area: row.area || "",
      Tower: row.tower || "",
      Level: row.level || "",
      Pour: row.pour || row.core || "",
      Shift: row.shift || "",
      Activity: row.activity || "",
      Quantity: roundQuantity(row.quantity),
      Engineer: row.engineerName || "",
      "Shortfall Reason": isApplicableReason(getProgressReason(row)) ? getProgressReason(row) : "",
    }));

  const selectedMonthPerformance =
    monthPerformanceRows.find((month) => month.monthKey === selectedMonth) ||
    monthPerformanceRows[0];
  const weeklyPlannedValues = getWeeklyPlanValues(plans);
  const hasWeeklyPlannedValues = weeklyPlannedValues.some((value) => value > 0);
  const combinedReport = selectedMonthPerformance?.weeklyBreakdown?.length
    ? selectedMonthPerformance.weeklyBreakdown.map((week, index) => {
        const planned = hasWeeklyPlannedValues
          ? weeklyPlannedValues[index]
          : Number(week.planned || 0);
        const actual = Number(week.achieved || 0);

        return {
          Week: week.week,
          Planned: roundQuantity(planned),
          Actual: roundQuantity(actual),
          Balance: roundQuantity(planned - actual),
          Variance: roundQuantity(actual - planned),
          "Achievement %": planned === 0 ? 0 : ((actual / planned) * 100).toFixed(1),
        };
      })
    : [
        {
          Week: currentWeek,
          Planned: roundQuantity(totalPlan),
          Actual: roundQuantity(totalAchieved),
          Balance: roundQuantity(balance),
          Variance: roundQuantity(totalAchieved - totalPlan),
          "Achievement %": percentage,
        },
        ...lookAheadWeeks.map((week) => ({
          Week: week.label,
          Planned: roundQuantity(week.value),
          Actual: 0,
          Balance: roundQuantity(week.value),
          Variance: roundQuantity(-week.value),
          "Achievement %": 0,
        })),
      ];

  const dailyLogMap = buildDailyLogMap(progress);
  const monthlySummaryRows = buildMonthlySummaryReport(plans, actuals, progress);
  const delayReport = monthlySummaryRows.map((item) => {
    const dailyLogEntry = getDailyLogEntryForKey(dailyLogMap, item.key);
    const hasDailyLogs = Boolean(dailyLogEntry);
    const dailyLogDates = [...(dailyLogEntry?.dates || [])].sort().join(", ");
    const shortfallReasons = [...(dailyLogEntry?.reasons || [])].join(", ");

    return {
      Location: item.location,
      Planned: roundQuantity(item.planned),
      Actual: roundQuantity(item.actual),
      Shortfall: roundQuantity(item.shortfall),
      "Achievement %": item.achievement,
      Observation: item.observation,
      "Daily Log Dates": hasDailyLogs ? dailyLogDates : "-",
      "Shortfall Reason": hasDailyLogs ? shortfallReasons : "-",
    };
  });

  const monthlyPerformanceReport = monthPerformanceRows.map((month) => ({
    Month: month.monthLabel,
    Planned: roundQuantity(month.planned),
    Achieved: roundQuantity(month.achieved),
    Variance: roundQuantity(month.variance),
    "Achievement %": month.percentage,
    "Week 1": roundQuantity(month.weeklyBreakdown?.[0]?.achieved),
    "Week 2": roundQuantity(month.weeklyBreakdown?.[1]?.achieved),
    "Week 3": roundQuantity(month.weeklyBreakdown?.[2]?.achieved),
    "Week 4": roundQuantity(month.weeklyBreakdown?.[3]?.achieved),
  }));
  const dailyReconciliationReport = buildReconciliationReport(actuals, progress);

  return {
    concreteReport,
    combinedReport,
    delayReport,
    monthlyPerformanceReport,
    dailyReconciliationReport,
    weeklyData,
    reportDates: {
      dailyReportDate: todayKey,
      dailyReportDateLabel: formatReportDate(todayKey),
    },
  };
};

export const getReports = async () => buildReportsFromWeeklyData(await getWeeklyData());
