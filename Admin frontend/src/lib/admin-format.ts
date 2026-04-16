import type { FirestoreTimestamp } from "./api";

// Formats a Firestore timestamp into a short locale date for admin tables.
export function formatFirestoreDate(value?: FirestoreTimestamp): string {
  if (!value?._seconds) {
    return "N/A";
  }

  return new Date(value._seconds * 1000).toLocaleDateString();
}
