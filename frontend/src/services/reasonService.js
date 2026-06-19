import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

const defaultShortfallReasons = [
  "Manpower shortage",
  "Material delay",
  "Equipment breakdown",
  "Weather",
  "Drawing issue",
  "Client approval delay",
];

const defaultRiskReasons = [
  "Material availability",
  "Manpower availability",
  "Equipment downtime",
  "Weather interruption",
  "Approval dependency",
];

export const subscribeToReasons = (collectionName, callback) => {
  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
  });
};

export const addReason = async (collectionName, name, createdBy = "system", details = {}) => {
  const trimmedName = String(name || "").trim();

  if (!trimmedName) {
    return null;
  }

  const reference = await addDoc(collection(db, collectionName), {
    name: trimmedName,
    ...details,
    createdBy,
    createdAt: serverTimestamp(),
  });

  return reference.id;
};

export const getDefaultShortfallReasons = () => defaultShortfallReasons;

export const getDefaultRiskReasons = () => defaultRiskReasons;
