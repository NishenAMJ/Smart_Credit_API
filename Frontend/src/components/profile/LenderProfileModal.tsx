import { useEffect, useState, type FormEvent } from "react";
import type { LenderSession } from "../../lib/lender-session";
import {
  fetchLenderProfile,
  updateLenderProfile,
  type LenderProfile,
} from "../../lib/lender-profile-api";

type LenderProfileModalProps = {
  session: LenderSession;
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: (profile: LenderProfile) => void;
};

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  businessName: string;
  responseTimeHours: string;
  preferredRegions: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toFormState(profile: LenderProfile): ProfileFormState {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    district: profile.district ?? "",
    businessName: profile.businessName ?? "",
    responseTimeHours: String(profile.responseTimeHours),
    preferredRegions: profile.preferredRegions.join(", "),
  };
}

export default function LenderProfileModal({
  session,
  isOpen,
  onClose,
  onProfileSaved,
}: LenderProfileModalProps) {
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [formState, setFormState] = useState<ProfileFormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        const loadedProfile = await fetchLenderProfile(session.lenderId);

        if (isMounted) {
          setProfile(loadedProfile);
          setFormState(toFormState(loadedProfile));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load lender profile.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, session.lenderId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  if (!isOpen) {
    return null;
  }

  function updateField<Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) {
    setFormState((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updatedProfile = await updateLenderProfile(session.lenderId, {
        fullName: formState.fullName,
        email: formState.email,
        phone: formState.phone,
        address: formState.address,
        city: formState.city,
        district: formState.district,
        businessName: formState.businessName,
        responseTimeHours: Number(formState.responseTimeHours),
        preferredRegions: formState.preferredRegions
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      });

      setProfile(updatedProfile);
      setFormState(toFormState(updatedProfile));
      setSuccessMessage("Profile updated successfully.");
      onProfileSaved(updatedProfile);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save lender profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="borrower-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="borrower-modal lender-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lender-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="borrower-modal__header">
          <div>
            <p className="eyebrow">Lender profile</p>
            <h2 className="section-title" id="lender-profile-title">
              Edit your profile
            </h2>
            <p className="section-subtitle">
              Update the business details borrowers and internal workflows rely
              on.
            </p>
          </div>
          <button
            type="button"
            className="borrower-modal__close"
            aria-label="Close profile editor"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <div className="borrower-modal__body">
          {isLoading ? (
            <div className="borrower-modal__state">Loading profile...</div>
          ) : error && !formState ? (
            <div className="borrower-modal__state borrower-modal__state--error">
              {error}
            </div>
          ) : profile && formState ? (
            <div className="borrower-modal__content">
              <section className="lender-profile-summary">
                <article className="borrower-detail-card">
                  <p className="borrower-detail-card__label">KYC Status</p>
                  <p className="borrower-detail-card__value">
                    {formatLabel(profile.kycStatus)}
                  </p>
                </article>
                <article className="borrower-detail-card">
                  <p className="borrower-detail-card__label">
                    Available Capital
                  </p>
                  <p className="borrower-detail-card__value">
                    {formatCurrency(profile.availableCapital)}
                  </p>
                </article>
                <article className="borrower-detail-card">
                  <p className="borrower-detail-card__label">Rating</p>
                  <p className="borrower-detail-card__value">
                    {profile.rating !== null
                      ? profile.rating.toFixed(1)
                      : "Not available"}
                  </p>
                </article>
                <article className="borrower-detail-card">
                  <p className="borrower-detail-card__label">Registration No</p>
                  <p className="borrower-detail-card__value">
                    {profile.businessRegistrationNo ?? "Not available"}
                  </p>
                </article>
              </section>

              {successMessage ? (
                <p className="create-ad-banner create-ad-banner--primary">
                  {successMessage}
                </p>
              ) : null}
              {error ? (
                <p className="create-ad-banner create-ad-banner--error">
                  {error}
                </p>
              ) : null}

              <form className="lender-profile-form" onSubmit={handleSubmit}>
                <div className="create-ad-form-grid">
                  <label className="create-ad-field">
                    <span className="create-ad-field__label">Full Name</span>
                    <input
                      className="input"
                      type="text"
                      value={formState.fullName}
                      onChange={(event) =>
                        updateField("fullName", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Business Name
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={formState.businessName}
                      onChange={(event) =>
                        updateField("businessName", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">Email</span>
                    <input
                      className="input"
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">Phone</span>
                    <input
                      className="input"
                      type="text"
                      value={formState.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field create-ad-field--full">
                    <span className="create-ad-field__label">Address</span>
                    <input
                      className="input"
                      type="text"
                      value={formState.address}
                      onChange={(event) =>
                        updateField("address", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">City</span>
                    <input
                      className="input"
                      type="text"
                      value={formState.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">District</span>
                    <input
                      className="input"
                      type="text"
                      value={formState.district}
                      onChange={(event) =>
                        updateField("district", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Response Time (hours)
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="72"
                      value={formState.responseTimeHours}
                      onChange={(event) =>
                        updateField("responseTimeHours", event.target.value)
                      }
                    />
                  </label>

                  <label className="create-ad-field create-ad-field--full">
                    <span className="create-ad-field__label">
                      Preferred Regions
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={formState.preferredRegions}
                      onChange={(event) =>
                        updateField("preferredRegions", event.target.value)
                      }
                      placeholder="Colombo, Kandy, Galle"
                    />
                  </label>
                </div>

                <div className="lender-profile-form__actions">
                  <button
                    type="button"
                    className="create-ad-button create-ad-button--ghost"
                    onClick={() => setFormState(toFormState(profile))}
                    disabled={isSaving}
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    className="create-ad-button create-ad-button--primary"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
