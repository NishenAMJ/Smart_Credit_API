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
import {
  emailError,
  focusFirstInvalidField,
  getApiFieldErrors,
  numberError,
  normalizePhone,
  optionalText,
  phoneError,
  requiredText,
} from "../../../lib/validation";

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
type ProfileErrors = Partial<Record<keyof ProfileFormState, string>>;

function validateProfileForm(form: ProfileFormState): ProfileErrors {
  const errors: ProfileErrors = {
    fullName: requiredText(form.fullName, "Full name", { min: 3, max: 120 }),
    email: emailError(form.email),
    phone: phoneError(form.phone, false),
    address: optionalText(form.address, "Business address", { max: 240 }),
    city: optionalText(form.city, "City", { min: 2, max: 80 }),
    district: optionalText(form.district, "District", { min: 2, max: 80 }),
    businessName: optionalText(form.businessName, "Business name", {
      min: 3,
      max: 160,
    }),
    responseTimeHours: numberError(form.responseTimeHours, "Response time", {
      min: 1,
      max: 72,
      integer: true,
    }),
  };
  const regions = [
    ...new Set(
      form.preferredRegions
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (regions.length > 10)
    errors.preferredRegions = "Add no more than 10 preferred regions.";
  else if (regions.some((region) => region.length < 2 || region.length > 80)) {
    errors.preferredRegions = "Each region must contain 2 to 80 characters.";
  }
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as ProfileErrors;
}

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
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [touched, setTouched] = useState<Set<keyof ProfileFormState>>(
    () => new Set(),
  );

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

    const validationErrors = validateProfileForm(formState);
    setTouched(
      new Set(Object.keys(validationErrors) as (keyof ProfileFormState)[]),
    );
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      focusFirstInvalidField(validationErrors);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updatedProfile = await updateLenderProfile(session.lenderId, {
        fullName: formState.fullName.trim(),
        email: formState.email.trim().toLowerCase(),
        phone: formState.phone.trim() ? normalizePhone(formState.phone) : "",
        address: formState.address,
        city: formState.city,
        district: formState.district,
        businessName: formState.businessName,
        responseTimeHours: Number(formState.responseTimeHours),
        preferredRegions: [
          ...new Set(
            formState.preferredRegions
              .split(",")
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          ),
        ],
      });

      setProfile(updatedProfile);
      setFormState(toFormState(updatedProfile));
      setSuccessMessage("Profile updated successfully.");
      onProfileSaved(updatedProfile);
    } catch (saveError) {
      const backendErrors = getApiFieldErrors(saveError);
      if (Object.keys(backendErrors).length) {
        setFieldErrors(backendErrors as ProfileErrors);
        focusFirstInvalidField(backendErrors);
      }
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
            <form
              className="lender-profile-form"
              onSubmit={handleSubmit}
              noValidate
              onBlurCapture={(event) => {
                const key = (event.target as HTMLElement).dataset
                  .validationField as keyof ProfileFormState | undefined;
                if (!key) return;
                setTouched((current) => new Set(current).add(key));
                const next = validateProfileForm(formState);
                setFieldErrors((current) => ({ ...current, [key]: next[key] }));
              }}
            >
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
                        data-validation-field="fullName"
                        aria-invalid={Boolean(fieldErrors.fullName)}
                        className="input"
                        type="text"
                        autoComplete="name"
                        required
                        value={formState.fullName}
                        onChange={(event) =>
                          updateField("fullName", event.target.value)
                        }
                      />
                      {touched.has("fullName") && fieldErrors.fullName ? (
                        <small className="validation-field-error">
                          {fieldErrors.fullName}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field">
                      <span>Email address</span>
                      <input
                        data-validation-field="email"
                        aria-invalid={Boolean(fieldErrors.email)}
                        className="input"
                        type="email"
                        autoComplete="email"
                        required
                        value={formState.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                      {touched.has("email") && fieldErrors.email ? (
                        <small className="validation-field-error">
                          {fieldErrors.email}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field lender-profile-field--full">
                      <span>Phone number</span>
                      <input
                        data-validation-field="phone"
                        aria-invalid={Boolean(fieldErrors.phone)}
                        className="input"
                        type="tel"
                        autoComplete="tel"
                        value={formState.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                      {touched.has("phone") && fieldErrors.phone ? (
                        <small className="validation-field-error">
                          {fieldErrors.phone}
                        </small>
                      ) : null}
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
                        data-validation-field="businessName"
                        aria-invalid={Boolean(fieldErrors.businessName)}
                        className="input"
                        type="text"
                        autoComplete="organization"
                        value={formState.businessName}
                        onChange={(event) =>
                          updateField("businessName", event.target.value)
                        }
                      />
                      {touched.has("businessName") &&
                      fieldErrors.businessName ? (
                        <small className="validation-field-error">
                          {fieldErrors.businessName}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field lender-profile-field--full">
                      <span>Business address</span>
                      <input
                        data-validation-field="address"
                        aria-invalid={Boolean(fieldErrors.address)}
                        className="input"
                        type="text"
                        autoComplete="street-address"
                        value={formState.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                      />
                      {touched.has("address") && fieldErrors.address ? (
                        <small className="validation-field-error">
                          {fieldErrors.address}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field">
                      <span>City</span>
                      <input
                        data-validation-field="city"
                        aria-invalid={Boolean(fieldErrors.city)}
                        className="input"
                        type="text"
                        autoComplete="address-level2"
                        value={formState.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                      />
                      {touched.has("city") && fieldErrors.city ? (
                        <small className="validation-field-error">
                          {fieldErrors.city}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field">
                      <span>District</span>
                      <input
                        data-validation-field="district"
                        aria-invalid={Boolean(fieldErrors.district)}
                        className="input"
                        type="text"
                        autoComplete="address-level1"
                        value={formState.district}
                        onChange={(event) =>
                          updateField("district", event.target.value)
                        }
                      />
                      {touched.has("district") && fieldErrors.district ? (
                        <small className="validation-field-error">
                          {fieldErrors.district}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field">
                      <span>Response time (hours)</span>
                      <input
                        data-validation-field="responseTimeHours"
                        aria-invalid={Boolean(fieldErrors.responseTimeHours)}
                        className="input"
                        type="number"
                        min="1"
                        max="72"
                        value={formState.responseTimeHours}
                        onChange={(event) =>
                          updateField("responseTimeHours", event.target.value)
                        }
                      />
                      {touched.has("responseTimeHours") &&
                      fieldErrors.responseTimeHours ? (
                        <small className="validation-field-error">
                          {fieldErrors.responseTimeHours}
                        </small>
                      ) : null}
                    </label>

                    <label className="lender-profile-field">
                      <span>Preferred regions</span>
                      <input
                        data-validation-field="preferredRegions"
                        aria-invalid={Boolean(fieldErrors.preferredRegions)}
                        className="input"
                        type="text"
                        value={formState.preferredRegions}
                        onChange={(event) =>
                          updateField("preferredRegions", event.target.value)
                        }
                        placeholder="Colombo, Kandy, Galle"
                      />
                      {touched.has("preferredRegions") &&
                      fieldErrors.preferredRegions ? (
                        <small className="validation-field-error">
                          {fieldErrors.preferredRegions}
                        </small>
                      ) : null}
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
                      onClick={() => {
                        setFormState(toFormState(profile));
                        setFieldErrors({});
                        setTouched(new Set());
                      }}
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
