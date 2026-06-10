import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";

const collectionName = "monthlyPlans";
const maxBatchWrites = 450;

const getPlanMonthKey = (month, year) =>
  `${year}-${String(month).padStart(2, "0")}`;

const getMonthLabel = (month, year) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const getPlanDate = (plan) => {
  if (Number.isFinite(Number(plan.month)) && Number.isFinite(Number(plan.year))) {
    return {
      month: Number(plan.month),
      year: Number(plan.year),
    };
  }

  const date = new Date(`${plan.monthLabel || plan.month || ""} 1`);

  if (!Number.isNaN(date.getTime())) {
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  }

  return {
    month: 0,
    year: 0,
  };
};

const commitOperations = async (operations) => {
  for (let index = 0; index < operations.length; index += maxBatchWrites) {
    const batch = writeBatch(db);
    const chunk = operations.slice(index, index + maxBatchWrites);

    chunk.forEach((operation) => operation(batch));

    await batch.commit();
  }
};

export const addMonthlyPlan = async (planData) => {
  try {
    await addDoc(collection(db, collectionName), {
      ...planData,
      status: planData.status || "active",
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const uploadMonthlyPlanner = async ({
  rows,
  month,
  year,
  uploadedBy = "system",
  fileName = "",
}) => {
  const snapshot = await getDocs(collection(db, collectionName));
  const uploadedAt = serverTimestamp();
  const planId = getPlanMonthKey(month, year);
  const monthLabel = getMonthLabel(month, year);
  const operations = [];

  snapshot.docs
    .filter((document) => {
      const data = document.data();

      return Number(data.month) === Number(month) && Number(data.year) === Number(year);
    })
    .forEach((document) => {
      operations.push((batch) => batch.delete(document.ref));
    });

  rows.forEach((row) => {
    const reference = doc(collection(db, collectionName));

    operations.push((batch) =>
      batch.set(reference, {
        ...row,
        month,
        monthLabel,
        year,
        planId,
        planMonthKey: planId,
        uploadedBy,
        uploadedAt,
        createdAt: uploadedAt,
        fileName,
        fileUrl: "",
        status: "active",
      })
    );
  });

  await commitOperations(operations);

  return planId;
};

export const subscribeToMonthlyPlans = (callback) => {
  return onSnapshot(collection(db, collectionName), (snapshot) => {
    const plans = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((first, second) => {
        const firstDate = getPlanDate(first);
        const secondDate = getPlanDate(second);
        const firstKey = getPlanMonthKey(firstDate.month, firstDate.year);
        const secondKey = getPlanMonthKey(secondDate.month, secondDate.year);

        return secondKey.localeCompare(firstKey);
      });

    callback(plans);
  });
};

export const archiveMonthlyPlan = (id) =>
  updateDoc(doc(db, collectionName, id), {
    status: "archived",
    archivedAt: serverTimestamp(),
  });
