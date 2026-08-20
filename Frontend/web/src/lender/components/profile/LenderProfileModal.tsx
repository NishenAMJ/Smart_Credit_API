import { useEffect, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Clock3,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
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

  const profileInitial = (
    profile?.businessName ||
    profile?.fullName ||
    session.displayName ||
    "L"
  )
    .slice(0, 1)
    .toUpperCase();

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
        <header className="lender-profile-modal__header">
          <div className="lender-profile-modal__heading">
            <span
              className="lender-profile-modal__heading-icon"
              aria-hidden="true"
            >
              <UserRound size={20} />
            </span>
            <div>
              <p className="eyebrow">Account settings</p>
              <h2 id="lender-profile-title">Lender profile</h2>
              <p>Keep your account and business information accurate.</p>
            </div>
          </div>
          <button
            type="button"
            className="lender-profile-modal__close"
            aria-label="Close profile editor"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="lender-profile-modal__body">
          {isLoading ? (
            <div className="borrower-modal__state">Loading profile...</div>
          ) : error && !formState ? (
            <div className="borrower-modal__state borrower-modal__state--error">
              {error}
            </div>
          ) : profile && formState ? (
            <form className="lender-profile-form" onSubmit={handleSubmit}>
              <aside className="lender-profile-overview">
                <div className="lender-profile-identity">
                  <div
                    className="lender-profile-identity__avatar"
                    aria-hidden="true"
                  >
                    {profileInitial}
                  </div>
                  <div>
                    <h3>{profile.businessName || profile.fullName}</h3>
                    <p>{profile.email}</p>
                  </div>
                </div>

                <div className="lender-profile-verification">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <div>
                    <span>Verification status</span>
                    <strong>{formatLabel(profile.kycStatus)}</strong>
                  </div>
                </div>

                <dl className="lender-profile-facts">
                  <div>
                    <dt>
                      <WalletCards size={17} /> Available capital
                    </dt>
                    <dd>{formatCurrency(profile.availableCapital)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Star size={17} /> Account rating
                    </dt>
                    <dd>
                      {profile.rating !== null
                        ? `${profile.rating.toFixed(1)} / 5`
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <BadgeCheck size={17} /> Registration
                    </dt>
                    <dd>{profile.businessRegistrationNo ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock3 size={17} /> Response target
                    </dt>
                    <dd>{profile.responseTimeHours} hours</dd>
                  </div>
                </dl>

                <p className="lender-profile-overview__note">
                  These details support borrower communication and lender
                  account verification.
                </p>
              </aside>

              <div className="lender-profile-editor">
                {successMessage ? (
                  <div className="lender-profile-notice lender-profile-notice--success">
                    <BadgeCheck size={18} /> {successMessage}
                  </div>
                ) : null}
                {error ? (
                  <div className="lender-profile-notice lender-profile-notice--error">
                    {error}
                  </div>
                ) : null}

                <section className="lender-profile-section">
                  <div className="lender-profile-section__heading">
                    <span>
                      <UserRound size={18} />
                    </span>
                    <div>
                      <h3>Account information</h3>
                      <p>Your primary identity and contact details.</p>
                    </div>
                  </div>
                  <div className="lender-profile-fields">
                    <label className="lender-profile-field">
                      <span>Full name</span>
                      <input
                        className="input"
                        type="text"
                        autoComplete="name"
                        required
                        value={formState.fullName}
                        onChange={(event) =>
                          updateField("fullName", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field">
                      <span>Email address</span>
                      <input
                        className="input"
                        type="email"
                        autoComplete="email"
                        required
                        value={formState.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field lender-profile-field--full">
                      <span>Phone number</span>
                      <input
                        className="input"
                        type="tel"
                        autoComplete="tel"
                        value={formState.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="lender-profile-section">
                  <div className="lender-profile-section__heading">
                    <span>
                      <Building2 size={18} />
                    </span>
                    <div>
                      <h3>Business details</h3>
                      <p>Information shown throughout your lender workspace.</p>
                    </div>
                  </div>
                  <div className="lender-profile-fields">
                    <label className="lender-profile-field lender-profile-field--full">
                      <span>Business name</span>
                      <input
                        className="input"
                        type="text"
                        autoComplete="organization"
                        value={formState.businessName}
                        onChange={(event) =>
                          updateField("businessName", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field lender-profile-field--full">
                      <span>Business address</span>
                      <input
                        className="input"
                        type="text"
                        autoComplete="street-address"
                        value={formState.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field">
                      <span>City</span>
                      <input
                        className="input"
                        type="text"
                        autoComplete="address-level2"
                        value={formState.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field">
                      <span>District</span>
                      <input
                        className="input"
                        type="text"
                        autoComplete="address-level1"
                        value={formState.district}
                        onChange={(event) =>
                          updateField("district", event.target.value)
                        }
                      />
                    </label>

                    <label className="lender-profile-field">
                      <span>Response time (hours)</span>
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

                    <label className="lender-profile-field">
                      <span>Preferred regions</span>
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
                </section>

                <div className="lender-profile-form__actions">
                  <p>
                    <Mail size={16} /> Changes update your lender account
                    profile.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setFormState(toFormState(profile))}
                      disabled={isSaving}
                    >
                      <RotateCcw size={16} /> Reset
                    </button>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={isSaving}
                    >
                      <Save size={16} />
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
