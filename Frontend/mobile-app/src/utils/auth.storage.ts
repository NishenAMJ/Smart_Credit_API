/** @format */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../types/auth";

const KEYS = {
  ACCESS_TOKEN: "smart_credit_access_token",
  AUTH_USER: "smart_credit_auth_user",
};

const memoryStore: Record<string, string> = {};

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryStore[key] = value;

  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // In-memory fallback keeps development flows working when native storage is unavailable.
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
    // Fall back to in-memory value below.
  }

  return memoryStore[key] ?? null;
}

async function safeRemoveItem(key: string): Promise<void> {
  delete memoryStore[key];

  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // In-memory cleanup already happened.
  }
}

export async function saveMobileSession(data: {
  accessToken: string;
  user: AuthUser;
}): Promise<void> {
  await Promise.all([
    safeSetItem(KEYS.ACCESS_TOKEN, data.accessToken),
    safeSetItem(KEYS.AUTH_USER, JSON.stringify(data.user)),
  ]);
}

export async function getMobileSession(): Promise<{
  accessToken: string | null;
  user: AuthUser | null;
}> {
  const [accessToken, rawUser] = await Promise.all([
    safeGetItem(KEYS.ACCESS_TOKEN),
    safeGetItem(KEYS.AUTH_USER),
  ]);

  if (!rawUser) {
    return {
      accessToken,
      user: null,
    };
  }

  try {
    return {
      accessToken,
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    await safeRemoveItem(KEYS.AUTH_USER);
    return {
      accessToken,
      user: null,
    };
  }
}

export async function getUserId(): Promise<string | null> {
  const session = await getMobileSession();
  return session.user?.uid ?? null;
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    safeRemoveItem(KEYS.ACCESS_TOKEN),
    safeRemoveItem(KEYS.AUTH_USER),
  ]);
}
