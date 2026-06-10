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

    snapshot.docs.forEach((document) => {
      operations.push((batch) => batch.delete(document.ref));
    });

    actualRows.forEach((actualRow) => {
      const reference = doc(collection(db, collectionName));

      operations.push((batch) =>
        batch.set(reference, {
          ...actualRow,
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

export const subscribeToActualTracking = (callback) =>
  onSnapshot(collection(db, collectionName), (snapshot) => {
    callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
  });
