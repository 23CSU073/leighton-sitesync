import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

export const addMonthlyPlan = async (planData) => {

  try {

    await addDoc(
      collection(db, "monthlyPlans"),
      {
        ...planData,
        createdAt: serverTimestamp()
      }
    );

    return true;

  } catch (error) {

    console.error(error);

    return false;
  }

};