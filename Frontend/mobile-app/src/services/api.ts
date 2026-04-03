/** @format */

import { Platform } from "react-native";

const DEFAULT_PORT = 3000;

function getDefaultApiBaseUrl() {
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiBaseUrl();
