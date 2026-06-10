import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

const usersCollection = "users";

export const authRoles = ["Admin", "Site Engineer", "Planner"];

const buildUserProfile = async (user, fallbackRole = "Site Engineer") => {
  const reference = doc(db, usersCollection, user.uid);
  const snapshot = await getDoc(reference);

  if (snapshot.exists()) {
    return {
      uid: user.uid,
      email: user.email,
      ...snapshot.data(),
    };
  }

  const profile = {
    email: user.email,
    role: fallbackRole,
    displayName: user.email?.split("@")[0] || "Site User",
    createdAt: serverTimestamp(),
  };

  await setDoc(reference, profile);

  return {
    uid: user.uid,
    ...profile,
  };
};

const updateUserRole = async (user, role) => {
  const reference = doc(db, usersCollection, user.uid);
  const snapshot = await getDoc(reference);
  const profile = {
    email: user.email,
    role,
    displayName: user.email?.split("@")[0] || "Site User",
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    reference,
    snapshot.exists() ? profile : { ...profile, createdAt: serverTimestamp() },
    { merge: true }
  );

  return {
    uid: user.uid,
    ...profile,
  };
};

export const loginUser = async ({ email, password }) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);

  return buildUserProfile(credential.user);
};

export const registerUser = async ({ email, password, role }) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    return buildUserProfile(credential.user, role);
  } catch (error) {
    if (error.code !== "auth/email-already-in-use") {
      throw error;
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);

    return updateUserRole(credential.user, role);
  }
};

export const logoutUser = () => signOut(auth);

export const subscribeToAuthUser = (callback) =>
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    const profile = await buildUserProfile(user);

    callback(profile);
  });
