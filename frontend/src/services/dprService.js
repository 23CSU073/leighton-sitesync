import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "../firebase";

export const addProgress = async (progressData) => {
  try {
    await addDoc(
      collection(db, "dailyProgress"),
      {
        ...progressData,
        createdAt: serverTimestamp(),
      }
    );

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const deleteProgress = async (progressId) => {
  try {
    // Firestore rules enforce Admin/Planner deletes; this keeps the client aligned.
    await deleteDoc(doc(db, "dailyProgress", progressId));

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const subscribeToProgress = (callback) => {
  const q = query(
    collection(db, "dailyProgress"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    callback(data);
  });
};
