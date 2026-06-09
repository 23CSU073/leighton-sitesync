import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

export const addActualTracking = async (
  actualRow
) => {

  try {

    await addDoc(
      collection(db, "actualTracking"),
      {
        ...actualRow,
        createdAt: serverTimestamp()
      }
    );

    return true;

  } catch (error) {

    console.error(error);

    return false;

  }

};