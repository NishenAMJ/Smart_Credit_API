/** @format */

import * as Location from "expo-location";

import apiClient from "../axios.config";

export type LocationVisibility = "hidden" | "approximate" | "exact";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type SaveLocationPayload = Coordinates & {
  city?: string;
  district?: string;
  visibility?: LocationVisibility;
};

export type NearbyUserLocation = Coordinates & {
  userId: string;
  role: "borrower" | "lender";
  city?: string;
  district?: string;
  visibility: LocationVisibility;
  distanceKm: number;
};

async function getCurrentCoordinates(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission denied.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

async function saveMyLocation(payload: SaveLocationPayload) {
  const response = await apiClient.patch("/location/me", payload);
  return response.data?.data ?? response.data;
}

async function saveCurrentLocation(options?: {
  city?: string;
  district?: string;
  visibility?: LocationVisibility;
}) {
  const coordinates = await getCurrentCoordinates();
  return saveMyLocation({
    ...coordinates,
    ...options,
  });
}

async function getNearbyLenders(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}): Promise<NearbyUserLocation[]> {
  const response = await apiClient.get("/location/lenders/nearby", {
    params: {
      lat: params.latitude,
      lng: params.longitude,
      radiusKm: params.radiusKm,
      limit: params.limit,
    },
  });

  return response.data?.data ?? [];
}

async function getNearbyBorrowers(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}): Promise<NearbyUserLocation[]> {
  const response = await apiClient.get("/location/borrowers/nearby", {
    params: {
      lat: params.latitude,
      lng: params.longitude,
      radiusKm: params.radiusKm,
      limit: params.limit,
    },
  });

  return response.data?.data ?? [];
}

export const locationService = {
  getCurrentCoordinates,
  saveMyLocation,
  saveCurrentLocation,
  getNearbyLenders,
  getNearbyBorrowers,
};
