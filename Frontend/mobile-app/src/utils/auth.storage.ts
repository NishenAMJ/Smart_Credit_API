/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  ACCESS_TOKEN: "smart_credit_access_token",
  USER_ID: "smart_credit_user_id",
  USER_ROLE: "smart_credit_user_role",
};

const memoryStore: Record<string, string> = {};

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryStore[key] = value;

  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore native storage issues; in-memory fallback keeps dev flow working.
  }
}

async function safeGetItem(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value != null) {
      memoryStore[key] = value;
      return value;
    }
  } catch {
    // If native storage is unavailable, return in-memory value below.
  }

  return memoryStore[key] ?? null;
}

async function safeRemoveItem(key: string): Promise<void> {
  delete memoryStore[key];

  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore native storage issues; in-memory cleanup already happened.
  }
}

// Access token helpers

export async function saveToken(token: string): Promise<void> {
  await safeSetItem(KEYS.ACCESS_TOKEN, token);
}

export async function getToken(): Promise<string | null> {
  return safeGetItem(KEYS.ACCESS_TOKEN);
}

export async function removeToken(): Promise<void> {
  await safeRemoveItem(KEYS.ACCESS_TOKEN);
}

// User id helpers

export async function saveUserId(userId: string): Promise<void> {
  await safeSetItem(KEYS.USER_ID, userId);
}

export async function getUserId(): Promise<string | null> {
  return safeGetItem(KEYS.USER_ID);
}

// Role helpers

export async function saveUserRole(
  role: "borrower" | "lender" | "admin",
): Promise<void> {
  await safeSetItem(KEYS.USER_ROLE, role);
}

export async function getUserRole(): Promise<string | null> {
  return safeGetItem(KEYS.USER_ROLE);
}

// Reads token, user id, and role together.
// Useful at app startup to restore session state.

export async function getFullSession(): Promise<{
  token: string | null;
  userId: string | null;
  role: string | null;
}> {
  const [token, userId, role] = await Promise.all([
    safeGetItem(KEYS.ACCESS_TOKEN),
    safeGetItem(KEYS.USER_ID),
    safeGetItem(KEYS.USER_ROLE),
  ]);
  return { token, userId, role };
}

// Clears all auth values during logout.

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    safeRemoveItem(KEYS.ACCESS_TOKEN),
    safeRemoveItem(KEYS.USER_ID),
    safeRemoveItem(KEYS.USER_ROLE),
  ]);
}

// Saves the full auth session after login/register.

export async function saveAuthSession(data: {
  token: string;
  userId: string;
  role: "borrower" | "lender" | "admin";
}): Promise<void> {
  await Promise.all([
    safeSetItem(KEYS.ACCESS_TOKEN, data.token),
    safeSetItem(KEYS.USER_ID, data.userId),
    safeSetItem(KEYS.USER_ROLE, data.role),
  ]);
}
