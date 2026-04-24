import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { FIRESTORE_COLLECTIONS } from "../../constants/firestore";
import type { AdDocument } from "../../types/firestore";
import { db } from "../firebase/config";

export async function getActiveAdsForLocation(location?: string) {
  const adsRef = collection(db, FIRESTORE_COLLECTIONS.ads);
  const adsQuery = location
    ? query(
        adsRef,
        where("status", "==", "active"),
        where("location", "==", location),
        limit(20),
      )
    : query(adsRef, where("status", "==", "active"), limit(20));

  const snapshot = await getDocs(adsQuery);
  return snapshot.docs.map((item) => item.data() as AdDocument);
}

export async function getActiveAds(limitCount = 10) {
  const adsRef = collection(db, FIRESTORE_COLLECTIONS.ads);
  const adsQuery = query(adsRef, where("status", "==", "active"), limit(limitCount));
  const snapshot = await getDocs(adsQuery);
  return snapshot.docs.map((item) => item.data() as AdDocument);
}
