import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Check,
  MessageSquareText,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchSmsSettings,
  searchSmsBorrowers,
  sendBorrowerSms,
  updatePaymentReceivedSms,
  updateSmsEnabled,
  type SendSmsResponse,
  type SmsBorrower,
  type SmsSettings,
} from "../lib/sms-api";

type SmsPageProps = {
  session: LenderSession;
};

const MAX_MESSAGE_LENGTH = 480;
const ALLOWED_TEMPLATE_VARIABLES = new Set([
  "borrowerName",
  "amount",
  "paymentDate",
  "remainingBalance",
]);

function getTemplateError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return "Payment message is required.";
  if (normalized.length > MAX_MESSAGE_LENGTH)
    return "Payment message cannot exceed 480 characters.";
  const variables = [...normalized.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(
    (match) => match[1],
  );
  const unsupported = variables.find(
    (variable) => !ALLOWED_TEMPLATE_VARIABLES.has(variable),
  );
  return unsupported
    ? `Unsupported template variable: {{${unsupported}}}.`
    : null;
}

export default function SmsPage({ session }: SmsPageProps) {
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [borrowers, setBorrowers] = useState<SmsBorrower[]>([]);
  const [selectedBorrowers, setSelectedBorrowers] = useState<SmsBorrower[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isSavingPaymentMessage, setIsSavingPaymentMessage] = useState(false);
  const [paymentMessageSaved, setPaymentMessageSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendSmsResponse | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [nextSettings, nextBorrowers] = await Promise.all([
          fetchSmsSettings(),
          searchSmsBorrowers(""),
        ]);
        if (!isMounted) return;
        setSettings(nextSettings);
        setPaymentMessage(nextSettings.paymentReceived.template);
        setBorrowers(nextBorrowers);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load SMS.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session.lenderId]);

  useEffect(() => {
    if (isLoading) return;
    let isMounted = true;
    const timeout = window.setTimeout(() => {
      const runSearch = async () => {
        try {
          setIsSearching(true);
          const results = await searchSmsBorrowers(search.trim());
          if (isMounted) setBorrowers(results);
        } catch (searchError) {
          if (isMounted) {
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Failed to search borrowers.",
            );
          }
        } finally {
          if (isMounted) setIsSearching(false);
        }
      };
      void runSearch();
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [isLoading, search]);

  const selectedIds = useMemo(
    () => new Set(selectedBorrowers.map((borrower) => borrower.borrowerId)),
    [selectedBorrowers],
  );
  const smsSegments =
    message.length === 0 ? 0 : Math.ceil(message.length / 160);
  const canSend = Boolean(
    settings?.enabled &&
    settings.configured &&
    selectedBorrowers.length > 0 &&
    selectedBorrowers.length <= 50 &&
    message.trim() &&
    message.trim().length <= MAX_MESSAGE_LENGTH &&
    !isSending,
  );

  const addBorrower = (borrower: SmsBorrower) => {
    if (selectedBorrowers.length >= 50) {
      setError("You can send one message to at most 50 borrowers.");
      return;
    }
    if (!borrower.phone?.trim()) {
      setError(`${borrower.fullName} does not have a usable phone number.`);
      return;
    }
    setSelectedBorrowers((current) =>
      current.some((item) => item.borrowerId === borrower.borrowerId)
        ? current
        : [...current, borrower],
    );
  };

  const removeBorrower = (borrowerId: string) => {
    setSelectedBorrowers((current) =>
      current.filter((borrower) => borrower.borrowerId !== borrowerId),
    );
  };

  const handleToggle = async () => {
    if (!settings) return;
    try {
      setIsToggling(true);
      setError(null);
      setSettings(await updateSmsEnabled(!settings.enabled));
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update SMS sending.",
      );
    } finally {
      setIsToggling(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Message is required.");
      return;
    }
    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      setError("Message cannot exceed 480 characters.");
      return;
    }
    if (!canSend) return;
    try {
      setIsSending(true);
      setError(null);
      setSendResult(null);
      const result = await sendBorrowerSms(
        selectedBorrowers.map((borrower) => borrower.borrowerId),
        message,
      );
      setSendResult(result);

      const sentIds = new Set(
        result.results
          .filter((item) => item.status === "sent")
          .map((item) => item.borrowerId),
      );
      setSelectedBorrowers((current) =>
        current.filter((borrower) => !sentIds.has(borrower.borrowerId)),
      );
      if (result.failed === 0) setMessage("");
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send SMS.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const savePaymentMessage = async (enabled: boolean) => {
    if (!settings) return;
    const templateError = getTemplateError(paymentMessage);
    if (templateError) {
      setError(templateError);
      return;
    }
    try {
      setIsSavingPaymentMessage(true);
      setPaymentMessageSaved(false);
      setError(null);
      const paymentReceived = await updatePaymentReceivedSms(
        enabled,
        paymentMessage,
      );
      setSettings((current) =>
        current ? { ...current, paymentReceived } : current,
      );
      setPaymentMessage(paymentReceived.template);
      setPaymentMessageSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save the payment received message.",
      );
    } finally {
      setIsSavingPaymentMessage(false);
    }
  };

  return (
    <section className="dashboard-panel sms-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Borrower communication</p>
          <h1 className="page-title">SMS</h1>
          <p className="page-subtitle">
            Select borrowers connected to your loans and send them a direct SMS.
          </p>
          <p className="dashboard-context-pill">
            SMS desk: {session.displayName}
          </p>
        </div>

        <article className="sms-switch-card">
          <div>
            <p className="sms-switch-card__label">SMS sending</p>
            <p className="sms-switch-card__status">
              {settings?.enabled ? "Enabled" : "Paused"}
            </p>
          </div>
          <button
            type="button"
            className={`sms-switch${settings?.enabled ? " sms-switch--enabled" : ""}`}
            role="switch"
            aria-checked={settings?.enabled ?? false}
            aria-label="Enable or pause all SMS sending"
            disabled={!settings || isToggling}
            onClick={() => void handleToggle()}
          >
            <span />
          </button>
        </article>
      </header>

      {error ? <div className="sms-alert sms-alert--error">{error}</div> : null}
      {!isLoading && settings && !settings.configured ? (
        <div className="sms-alert sms-alert--warning">
          SMS delivery is not configured on the server. Contact the system
          administrator before sending messages.
        </div>
      ) : null}
      {sendResult ? (
        <div className="sms-alert sms-alert--success">
          <Check size={18} /> Sent {sendResult.sent} of {sendResult.attempted}{" "}
          messages{sendResult.failed ? `; ${sendResult.failed} failed.` : "."}
        </div>
      ) : null}

      {isLoading ? (
        <section className="card loading-card">
          Loading SMS workspace...
        </section>
      ) : (
        <div className="sms-workspace">
          <section className="card sms-recipient-panel">
            <div>
              <h2 className="section-title">Choose borrowers</h2>
              <p className="section-subtitle">
                Search only borrowers with a loan relationship to this lender.
              </p>
            </div>

            <label className="sms-search-field">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                maxLength={100}
                value={search}
                placeholder="Search borrowers"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="sms-borrower-results">
              {isSearching ? (
                <p className="sms-empty-state">Searching borrowers...</p>
              ) : borrowers.length > 0 ? (
                borrowers.map((borrower) => {
                  const isSelected = selectedIds.has(borrower.borrowerId);
                  return (
                    <article
                      className="sms-borrower-row"
                      key={borrower.borrowerId}
                    >
                      <div className="sms-borrower-avatar" aria-hidden="true">
                        {borrower.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="sms-borrower-row__copy">
                        <button
                          type="button"
                          className="borrower-name borrower-name--button"
                          onClick={() =>
                            setSelectedBorrowerId(borrower.borrowerId)
                          }
                        >
                          {borrower.fullName}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={isSelected}
                        onClick={() => addBorrower(borrower)}
                      >
                        <UserPlus size={16} /> {isSelected ? "Added" : "Add"}
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="sms-empty-state">No linked borrowers found.</p>
              )}
            </div>
          </section>

          <section className="card sms-compose-panel">
            <div>
              <h2 className="section-title">Compose message</h2>
              <p className="section-subtitle">
                Sender: {settings?.sender ?? "Not configured"}
              </p>
            </div>

            <div
              className="sms-recipient-array"
              aria-label="Selected recipients"
            >
              {selectedBorrowers.length > 0 ? (
                selectedBorrowers.map((borrower) => (
                  <span
                    className="sms-recipient-chip"
                    key={borrower.borrowerId}
                  >
                    {borrower.fullName}
                    <button
                      type="button"
                      aria-label={`Remove ${borrower.fullName}`}
                      onClick={() => removeBorrower(borrower.borrowerId)}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
              ) : (
                <p className="sms-empty-state">
                  Add borrowers to the recipient array.
                </p>
              )}
            </div>

            <label className="sms-message-field">
              <span>Message</span>
              <textarea
                value={message}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={9}
                placeholder="Type the SMS message..."
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={Boolean(
                  message && message.trim().length > MAX_MESSAGE_LENGTH,
                )}
              />
              <small>
                {message.length}/{MAX_MESSAGE_LENGTH} characters · {smsSegments}{" "}
                SMS segment{smsSegments === 1 ? "" : "s"}
              </small>
            </label>

            <div className="sms-compose-actions">
              <p>
                <MessageSquareText size={17} /> {selectedBorrowers.length}{" "}
                recipient
                {selectedBorrowers.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                className="button button-primary sms-send-button"
                disabled={!canSend}
                onClick={() => void handleSend()}
              >
                <Send size={17} /> {isSending ? "Sending..." : "Send SMS"}
              </button>
            </div>

            {!settings?.enabled ? (
              <p className="sms-disabled-note">
                SMS sending is paused. Enable the switch to allow manual or
                future automated messages.
              </p>
            ) : null}
          </section>
        </div>
      )}

      {!isLoading && settings ? (
        <section className="card sms-payment-automation">
          <div className="sms-payment-automation__header">
            <div className="sms-payment-automation__title">
              <span className="sms-payment-automation__icon" aria-hidden="true">
                <BellRing size={20} />
              </span>
              <div>
                <h2 className="section-title">Payment received message</h2>
                <p className="section-subtitle">
                  Automatically notify the borrower after an installment is
                  recorded successfully.
                </p>
              </div>
            </div>
            <div className="sms-payment-automation__switch">
              <span>
                {settings.paymentReceived.enabled ? "Enabled" : "Paused"}
              </span>
              <button
                type="button"
                className={`sms-switch${settings.paymentReceived.enabled ? " sms-switch--enabled" : ""}`}
                role="switch"
                aria-checked={settings.paymentReceived.enabled}
                aria-label="Send the saved message when a payment is received"
                disabled={isSavingPaymentMessage || !paymentMessage.trim()}
                onClick={() =>
                  void savePaymentMessage(!settings.paymentReceived.enabled)
                }
              >
                <span />
              </button>
            </div>
          </div>

          <div className="sms-payment-automation__body">
            <label className="sms-message-field">
              <span>Saved message</span>
              <textarea
                value={paymentMessage}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={5}
                placeholder="Write the confirmation sent after a payment..."
                onChange={(event) => {
                  setPaymentMessage(event.target.value);
                  setPaymentMessageSaved(false);
                }}
                aria-invalid={Boolean(getTemplateError(paymentMessage))}
              />
              <small>
                {paymentMessage.length}/{MAX_MESSAGE_LENGTH} characters
              </small>
            </label>

            <div className="sms-template-help">
              <p>Available details</p>
              <div>
                <code>{"{{borrowerName}}"}</code>
                <code>{"{{amount}}"}</code>
                <code>{"{{paymentDate}}"}</code>
                <code>{"{{remainingBalance}}"}</code>
              </div>
              <p>
                Preview:{" "}
                {paymentMessage
                  .replace(/{{\s*borrowerName\s*}}/g, "Nadeesha Perera")
                  .replace(/{{\s*amount\s*}}/g, "LKR 25,000.00")
                  .replace(
                    /{{\s*paymentDate\s*}}/g,
                    new Date().toISOString().slice(0, 10),
                  )
                  .replace(/{{\s*remainingBalance\s*}}/g, "LKR 75,000.00") ||
                  "Your rendered message will appear here."}
              </p>
            </div>

            <div className="sms-payment-automation__actions">
              <p>
                {!settings.enabled
                  ? "Turn on the main SMS sending switch before automatic messages can be sent."
                  : paymentMessageSaved
                    ? "Payment received message saved."
                    : "Only future recorded payments will use this message."}
              </p>
              <button
                type="button"
                className="button button-primary"
                disabled={isSavingPaymentMessage || !paymentMessage.trim()}
                onClick={() =>
                  void savePaymentMessage(settings.paymentReceived.enabled)
                }
              >
                <Check size={17} />
                {isSavingPaymentMessage ? "Saving..." : "Save message"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {selectedBorrowerId ? (
        <BorrowerSidePanel
          session={session}
          borrowerId={selectedBorrowerId}
          onClose={() => setSelectedBorrowerId(null)}
        />
      ) : null}
    </section>
  );
}
