import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { BorrowerHomeScreen } from "./BorrowerHomeScreen";
import { LenderHomeScreen } from "./LenderHomeScreen";
import { ScreenLoader } from "../../components/feedback/ScreenLoader";
import { getActiveAds } from "../../services/firestore/ads";
import { getUserById } from "../../services/firestore/users";
import type { AdDocument, UserDocument } from "../../types/firestore";

type DashboardScreenProps = {
  userId: string;
};

export function DashboardScreen({ userId }: DashboardScreenProps) {
  const [user, setUser] = useState<UserDocument | null>(null);
  const [ads, setAds] = useState<AdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const currentUser = await getUserById(userId);
      setUser(currentUser);
      setAds(await getActiveAds(8));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [userId]);

  if (loading) {
    return <ScreenLoader label="Loading Smart Credit+ data..." />;
  }

  if (!user) {
    Alert.alert("User not found", "We could not load your user profile.");
    return <ScreenLoader label="Unable to load profile..." />;
  }

  const role = Array.isArray(user.role) ? user.role[0] : user.role;

  if (role === "lender") {
    return (
      <LenderHomeScreen
        user={user}
        ads={ads}
        refreshing={refreshing}
        onRefresh={() => void loadData(true)}
      />
    );
  }

  return (
    <BorrowerHomeScreen
      user={user}
      ads={ads}
      refreshing={refreshing}
      onRefresh={() => void loadData(true)}
    />
  );
}
