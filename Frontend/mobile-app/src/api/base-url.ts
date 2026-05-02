/** @format */

import { NativeModules, Platform } from "react-native";

const DEFAULT_PORT = 3000;

function getMetroHostName() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL;
  const serverHost = NativeModules.PlatformConstants?.ServerHost;

  if (typeof scriptUrl !== "string") {
    if (typeof serverHost === "string") {
      return serverHost.split(":")[0] ?? null;
    }

    return null;
  }

  try {
    const normalizedUrl = scriptUrl.replace(/^exp(s)?:\/\//, "http$1://");
    const parsed = new URL(normalizedUrl);
    return parsed.hostname || null;
  } catch {
    const match = scriptUrl.match(/^[a-z]+:\/\/([^:/]+)(?::\d+)?/i);
    return match?.[1] ?? null;
  }
}

function getDefaultApiBaseUrl() {
  const metroHostName = getMetroHostName();

  if (metroHostName) {
    return `http://${metroHostName}:${DEFAULT_PORT}/api`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }

  return `http://localhost:${DEFAULT_PORT}/api`;
}

export function getApiBaseUrl() {
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiBaseUrl()).trim();
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}
