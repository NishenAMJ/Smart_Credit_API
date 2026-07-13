import { useEffect, useMemo, useState } from "react";
import {
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
  updateSmsEnabled,
  type SendSmsResponse,
  type SmsBorrower,
  type SmsSettings,
} from "../lib/sms-api";

type SmsPageProps = {
  session: LenderSession;
};

const MAX_MESSAGE_LENGTH = 480;

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
    message.trim() &&
    !isSending,
  );

  const addBorrower = (borrower: SmsBorrower) => {
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
          Add SMS_API_URL, SMS_API_TOKEN, and SMS_SENDER_ID to Backend/.env
          before sending. The token is never exposed to this page.
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
                          onClick={() => setSelectedBorrowerId(borrower.borrowerId)}
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
