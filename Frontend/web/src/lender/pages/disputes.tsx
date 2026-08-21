import { useCallback, useEffect, useState } from "react";
import type { LenderSession } from "../lib/lender-session";
import {
  disputeApi,
  subscribeToDisputes,
  uploadDisputeEvidence,
  type Dispute,
  type DisputeCategory,
  type DisputeEvent,
  type EligibleLoan,
} from "../lib/disputes-api";

type DisputeListView = "active" | "history";

const FINISHED_STATUSES = new Set(["resolved", "closed"]);

function getUpdatedAt(dispute: Dispute): number {
  return (dispute.updatedAt?._seconds ?? 0) * 1000;
}

function formatUpdatedAt(dispute: Dispute): string {
  const timestamp = getUpdatedAt(dispute);
  if (!timestamp) return "Update date unavailable";

  return `Updated ${new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))}`;
}

export default function LenderDisputesPage({
  session,
}: {
  session: LenderSession;
}) {
  const [items, setItems] = useState<Dispute[]>([]);
  const [listView, setListView] = useState<DisputeListView>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<EligibleLoan[]>([]);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [category, setCategory] = useState<DisputeCategory>("payment");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [message, setMessage] = useState("");
  const [messageEvidence, setMessageEvidence] = useState<File[]>([]);
  const [evidence, setEvidence] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cases, eligible] = await Promise.all([
        listView === "history"
          ? Promise.all([
              disputeApi.list("resolved"),
              disputeApi.list("closed"),
            ]).then(([resolved, closed]) => ({
              disputes: [...resolved.disputes, ...closed.disputes].sort(
                (left, right) => getUpdatedAt(right) - getUpdatedAt(left),
              ),
            }))
          : disputeApi.list().then((response) => ({
              disputes: response.disputes.filter(
                (dispute) => !FINISHED_STATUSES.has(dispute.status),
              ),
            })),
        disputeApi.loans(),
      ]);
      setItems(cases.disputes);
      setLoans(eligible.loans);
      setError("");
      setSelected((current) =>
        current
          ? (cases.disputes.find((item) => item.id === current.id) ?? null)
          : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to load disputes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [listView]);

  useEffect(() => {
    void load();
    return subscribeToDisputes(session.accessToken, load);
  }, [load, session.accessToken]);
  useEffect(() => {
    if (selected)
      void disputeApi
        .events(selected.id)
        .then((data) => setEvents(data.events));
  }, [selected?.id]);

  async function createCase(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSubmitting(true);
      const evidenceDocumentIds = await Promise.all(
        evidence.slice(0, 5).map((file) => uploadDisputeEvidence(file, loanId)),
      );
      const response = await disputeApi.create({
        loanId,
        category,
        subject,
        description,
        desiredOutcome,
        ...(transactionId.trim()
          ? { transactionId: transactionId.trim() }
          : {}),
        ...(installmentId.trim()
          ? { installmentId: installmentId.trim() }
          : {}),
        evidenceDocumentIds,
      });
      setShowCreate(false);
      setSelected(response.dispute);
      setSubject("");
      setDescription("");
      setDesiredOutcome("");
      setTransactionId("");
      setInstallmentId("");
      setEvidence([]);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to create dispute.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addMessage() {
    if (!selected || !message.trim()) return;
    const documentIds = await Promise.all(
      messageEvidence
        .slice(0, 5)
        .map((file) => uploadDisputeEvidence(file, selected.loanId)),
    );
    await disputeApi.comment(selected.id, message.trim(), documentIds);
    setMessage("");
    setMessageEvidence([]);
    setEvents((await disputeApi.events(selected.id)).events);
  }

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Case management</p>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">
            Raise and follow loan-related cases in real time.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setListView((current) =>
                current === "active" ? "history" : "active",
              );
              setSelected(null);
            }}
          >
            {listView === "active" ? "Previous disputes" : "Active disputes"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowCreate((value) => !value)}
          >
            New dispute
          </button>
        </div>
      </header>
      {error ? (
        <div className="card">
          <p>{error}</p>
        </div>
      ) : null}
      {showCreate ? (
        <form
          className="card"
          style={{ display: "grid", gap: 12, marginBottom: 20 }}
          onSubmit={createCase}
        >
          <h2 className="section-title">Open a dispute</h2>
          <select
            className="input"
            required
            value={loanId}
            onChange={(event) => setLoanId(event.target.value)}
          >
            <option value="">Select a loan</option>
            {loans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.loanId} · {loan.borrowerName ?? loan.status}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Optional transaction ID"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
          />
          <input
            className="input"
            placeholder="Optional installment ID"
            value={installmentId}
            onChange={(event) => setInstallmentId(event.target.value)}
          />
          <select
            className="input"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as DisputeCategory)
            }
          >
            {["payment", "loan_terms", "fraud", "conduct", "other"].map(
              (value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ),
            )}
          </select>
          <input
            className="input"
            required
            minLength={3}
            maxLength={160}
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <textarea
            className="input"
            required
            minLength={10}
            rows={4}
            placeholder="Describe what happened"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <textarea
            className="input"
            required
            minLength={3}
            rows={3}
            placeholder="What outcome would you like?"
            value={desiredOutcome}
            onChange={(event) => setDesiredOutcome(event.target.value)}
          />
          <label>
            Evidence (up to five images or PDFs)
            <input
              className="input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setEvidence(Array.from(event.target.files ?? []).slice(0, 5))
              }
            />
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Uploading and submitting..." : "Submit dispute"}
          </button>
        </form>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, .8fr) minmax(360px, 1.2fr)",
          gap: 20,
        }}
      >
        <div className="card">
          <h2 className="section-title">
            {listView === "active" ? "Active disputes" : "Previous disputes"}
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {isLoading ? (
              <p className="section-subtitle">Loading disputes...</p>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.id}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => setSelected(item)}
                >
                  <strong>{item.subject}</strong>
                  <p>
                    {item.disputeCode} · {item.loanId}
                  </p>
                  <span className="badge badge-gray">
                    {item.status.replace("_", " ")}
                  </span>
                  <small style={{ display: "block", marginTop: 8 }}>
                    {formatUpdatedAt(item)}
                  </small>
                </button>
              ))
            ) : (
              <p className="section-subtitle">
                {listView === "active"
                  ? "No active disputes."
                  : "No previous disputes yet."}
              </p>
            )}
          </div>
        </div>
        <div className="card">
          {selected ? (
            <>
              <h2 className="section-title">{selected.subject}</h2>
              <p className="section-subtitle">{selected.description}</p>
              <p>
                <strong>Desired outcome:</strong> {selected.desiredOutcome}
              </p>
              <p>
                <strong>Status:</strong> {selected.status.replace("_", " ")}
              </p>
              {selected.evidenceDocumentIds.map((documentId) => (
                <button
                  key={documentId}
                  className="secondary-button"
                  onClick={() =>
                    void disputeApi
                      .evidenceAccess(documentId)
                      .then((response) =>
                        window.open(
                          response.accessUrl,
                          "_blank",
                          "noopener,noreferrer",
                        ),
                      )
                  }
                >
                  Open evidence {documentId.slice(0, 8)}
                </button>
              ))}
              {selected.resolution ? (
                <div className="card">
                  <strong>Admin resolution</strong>
                  <p>{selected.resolution.summary}</p>
                  {selected.resolution.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </div>
              ) : null}
              <h3>Timeline</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {events.map((event) => (
                  <div key={event.id} className="card">
                    <strong>{event.type.replaceAll("_", " ")}</strong>
                    <p>{event.message}</p>
                    <small>{event.actorRole}</small>
                    {event.documentIds.map((documentId) => (
                      <button
                        key={documentId}
                        className="secondary-button"
                        onClick={() =>
                          void disputeApi
                            .evidenceAccess(documentId)
                            .then((response) =>
                              window.open(
                                response.accessUrl,
                                "_blank",
                                "noopener,noreferrer",
                              ),
                            )
                        }
                      >
                        Open attached evidence
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {selected.status !== "closed" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    placeholder="Add a message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <input
                    className="input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setMessageEvidence(
                        Array.from(event.target.files ?? []).slice(0, 5),
                      )
                    }
                  />
                  <button
                    className="primary-button"
                    onClick={() => void addMessage()}
                  >
                    Send
                  </button>
                </div>
              ) : null}
              {selected.status === "resolved" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    className="primary-button"
                    onClick={() => void disputeApi.acknowledge(selected.id)}
                  >
                    Acknowledge
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      const reason = window.prompt(
                        "Why should this case be reopened?",
                      );
                      if (reason) void disputeApi.reopen(selected.id, reason);
                    }}
                  >
                    Reopen
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="section-subtitle">
              Select a case to view its timeline.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
