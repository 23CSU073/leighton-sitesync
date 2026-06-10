import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADjIidNmu-SevFN52oJz2oAH2i8oKAL_w",
  authDomain: "leighton-sitesync.firebaseapp.com",
  projectId: "leighton-sitesync",
  storageBucket: "leighton-sitesync.firebasestorage.app",
  messagingSenderId: "113165668704",
  appId: "1:113165668704:web:e6560a6b02d74b70dbce05",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
