/** @format */

import apiClient from "../axios.config";
import { getApiErrorMessage } from "../api-error";
import { ENDPOINTS } from "../endpoints";
import { formatAddress, toIsoDate } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type { BorrowerProfile } from "../../types/borrower";

function normalizeProfile(profile: Partial<BorrowerProfile>): BorrowerProfile {
  return {
    userId: String(profile.userId ?? ""),
    fullName: String(profile.fullName ?? ""),
    email: String(profile.email ?? ""),
    phone: String(profile.phone ?? ""),
    photoURL: String(profile.photoURL ?? ""),
    profilePicture: String(profile.profilePicture ?? ""),
    profilePictureUrl: String(profile.profilePictureUrl ?? ""),
    profilePicUrl: String(profile.profilePicUrl ?? ""),
    profilePhotoUrl: String(profile.profilePhotoUrl ?? ""),
    imageUrl: String(profile.imageUrl ?? ""),
    avatarUrl: String(profile.avatarUrl ?? ""),
    nic: String(profile.nic ?? ""),
    dateOfBirth: String(profile.dateOfBirth ?? ""),
    createdAt: toIsoDate(profile.createdAt),
    creditScore: Number(profile.creditScore ?? 0),
    kycVerified: Boolean(profile.kycVerified),
    profileComplete: Boolean(profile.profileComplete),
    employmentStatus: String(profile.employmentStatus ?? ""),
    monthlyIncome: Number(profile.monthlyIncome ?? 0),
    occupation: String(profile.occupation ?? ""),
    address: profile.address ?? {},
  };
}

/**
 * Borrower profile API operations and response normalization.
 */
export const profileService = {
  getMyProfile: async () => {
    const userId = await getUserId();
    if (!userId) throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get(ENDPOINTS.profile.get(userId));
    const profilePayload =
      response.data?.data?.data ?? response.data?.data ?? response.data ?? {};
    return normalizeProfile(profilePayload);
  },

  updateMyProfile: async (data: {
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    monthlyIncome?: string;
    occupation?: string;
  }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("User session expired. Please log in again.");

    // --- Phone: normalise to +94XXXXXXXXX ---
    let phone: string | undefined;
    if (data.phone) {
      const trimmed = data.phone.trim();
      if (/^\+94[0-9]{9}$/.test(trimmed)) {
        // Already correct format — pass through
        phone = trimmed;
      } else {
        const digits = trimmed.replace(/\D/g, "");
        if (digits.startsWith("94") && digits.length === 11) {
          phone = `+${digits}`;
        } else if (digits.startsWith("0") && digits.length === 10) {
          phone = `+94${digits.slice(1)}`;
        } else if (digits.length === 9) {
          phone = `+94${digits}`;
        } else {
          // Cannot normalise — skip instead of sending invalid value
          console.warn(
            "[ProfileService] Phone skipped (invalid format):",
            trimmed,
          );
          phone = undefined;
        }
      }
    }

    // --- Address: only send if we have all required fields ---
    const current = await profileService.getMyProfile();
    const line1 = data.address?.trim() || current.address?.line1 || "";
    const city = current.address?.city || "Colombo";
    const district = current.address?.district || "Colombo";
    const province = current.address?.province || "Western";
    const address = line1 ? { line1, city, district, province } : undefined;

    const payload: Record<string, unknown> = {};
    if (data.fullName) payload.fullName = data.fullName;
    if (data.email) payload.email = data.email.trim();
    if (data.password) payload.password = data.password;
    if (phone) payload.phone = phone;
    if (address) payload.address = address;
    if (data.monthlyIncome) {
      const income = Number(data.monthlyIncome.replace(/[^0-9.]/g, ""));
      if (!isNaN(income)) payload.monthlyIncome = income;
    }
    if (data.occupation) payload.occupation = data.occupation;

    console.log(
      "[ProfileService] Sending update payload:",
      JSON.stringify(payload, null, 2),
    );

    try {
      const response = await apiClient.put(
        ENDPOINTS.profile.update(userId),
        payload,
      );
      return normalizeProfile(response.data ?? {});
    } catch (err) {
      console.error(
        "[ProfileService] PUT failed:",
        getApiErrorMessage(err, "Profile update failed."),
      );
      throw err;
    }
  },

  formatAddress,
};
