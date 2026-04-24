import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { FIRESTORE_COLLECTIONS } from "../../constants/firestore";
import type { UserDocument } from "../../types/firestore";
import { db } from "../firebase/config";

export async function getUserById(userId: string) {
  const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTIONS.users, userId));
  return snapshot.exists() ? (snapshot.data() as UserDocument) : null;
}

export async function getUsersByRole(role: "borrower" | "lender") {
  const usersRef = collection(db, FIRESTORE_COLLECTIONS.users);
  const usersQuery = query(usersRef, where("role", "array-contains", role), limit(20));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((item) => item.data() as UserDocument);
}

export async function getUserByIdentifier(identifier: string) {
  const usersRef = collection(db, FIRESTORE_COLLECTIONS.users);
  const normalized = identifier.trim().toLowerCase();

  const emailSnapshot = await getDocs(
    query(usersRef, where("email", "==", normalized), limit(1)),
  );

  if (!emailSnapshot.empty) {
    const docSnapshot = emailSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...(docSnapshot.data() as UserDocument),
    };
  }

  const phoneSnapshot = await getDocs(
    query(usersRef, where("phone", "==", identifier.trim()), limit(1)),
  );

  if (!phoneSnapshot.empty) {
    const docSnapshot = phoneSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...(docSnapshot.data() as UserDocument),
    };
  }

  return null;
}
