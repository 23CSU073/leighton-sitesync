import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import { db } from "../firebase";

const collectionName = "actualTracking";
const maxBatchWrites = 450;

const getMonthDate = (monthLabel) => {
  const date = new Date(`${monthLabel || ""} 1`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getMonthKey = (actualRow) => {
  if (actualRow.actualMonthKey || actualRow.monthKey) {
    return actualRow.actualMonthKey || actualRow.monthKey;
  }

  const date = getMonthDate(actualRow.monthLabel || actualRow.month);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const commitOperations = async (operations) => {
  for (let index = 0; index < operations.length; index += maxBatchWrites) {
    const batch = writeBatch(db);
    const chunk = operations.slice(index, index + maxBatchWrites);

    chunk.forEach((operation) => operation(batch));

    await batch.commit();
  }
};

export const replaceActualTracking = async (actualRows) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const uploadedAt = serverTimestamp();
    const operations = [];
    const monthKeys = new Set(actualRows.map(getMonthKey));

    snapshot.docs
      .filter((document) => monthKeys.has(getMonthKey(document.data())))
      .forEach((document) => {
        operations.push((batch) => batch.delete(document.ref));
      });

    actualRows.forEach((actualRow) => {
      const reference = doc(collection(db, collectionName));
      const actualMonthKey = getMonthKey(actualRow);

      operations.push((batch) =>
        batch.set(reference, {
          ...actualRow,
          actualMonthKey,
          monthKey: actualMonthKey,
          uploadedAt,
          createdAt: uploadedAt,
          source: "actual-excel",
        })
      );
    });

    await commitOperations(operations);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const deleteActualTrackingUpload = async (monthKey) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const operations = [];

    snapshot.docs
      .filter((document) => getMonthKey(document.data()) === monthKey)
      .forEach((document) => {
        operations.push((batch) => batch.delete(document.ref));
      });

    await commitOperations(operations);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const subscribeToActualTracking = (callback) =>
  onSnapshot(collection(db, collectionName), (snapshot) => {
    callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
  });
