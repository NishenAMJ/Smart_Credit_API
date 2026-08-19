import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSignature,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { SharedLegalDocument } from "../../legal/types";
import {
  acceptLenderAgreement,
  downloadLenderAgreement,
  fetchLenderAgreements,
  fetchLatestLenderAgreement,
  retryLenderAgreementFinalization,
} from "../lib/legal-agreements-api";
import type { LenderSession } from "../lib/lender-session";
import "./agreements.css";

type Props = {
  session: LenderSession;
  initialLoanId?: string | null;
  onInitialLoanHandled?: () => void;
};

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
});

function money(minor: number): string {
  return currency.format(minor / 100);
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LenderAgreementsPage({
  session,
  initialLoanId,
  onInitialLoanHandled,
}: Props) {
  const [records, setRecords] = useState<SharedLegalDocument[]>([]);
  const [selected, setSelected] = useState<SharedLegalDocument | null>(null);
  const [signedName, setSignedName] = useState(session.displayName);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchLenderAgreements();
      setRecords(response.documents);
      if (selected) {
        setSelected(
          response.documents.find((record) => record.id === selected.id) ?? selected,
        );
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load agreements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
    // Session changes remount the lender workspace; no token is copied into state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.lenderId]);

  useEffect(() => {
    if (!initialLoanId) return;
    let mounted = true;
    setBusy(true);
    fetchLatestLenderAgreement(initialLoanId)
      .then((agreement) => {
        if (!mounted) return;
        if (agreement) setSelected(agreement);
        else setError("No agreement exists for this loan yet.");
      })
      .catch((nextError) => {
        if (mounted) setError(nextError instanceof Error ? nextError.message : "Unable to load agreement.");
      })
      .finally(() => {
        if (mounted) {
          setBusy(false);
          onInitialLoanHandled?.();
        }
      });
    return () => {
      mounted = false;
    };
  }, [initialLoanId, onInitialLoanHandled]);

  const pendingCount = useMemo(
    () => records.filter((record) => record.status !== "fully_accepted").length,
    [records],
  );

  async function handleSign() {
    if (!selected || !signedName.trim() || !consentAccepted) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await acceptLenderAgreement(selected, signedName.trim());
      if (response.document) setSelected(response.document);
      setNotice(response.message ?? "Agreement signature recorded.");
      setConsentAccepted(false);
      await loadList();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign agreement.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await retryLenderAgreementFinalization(selected.id);
      if (response.document) setSelected(response.document);
      setNotice(response.message ?? "Agreement finalization completed.");
      await loadList();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to finalize agreement.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await downloadLenderAgreement(selected);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to download agreement.");
    } finally {
      setBusy(false);
    }
  }

  const lenderSigned = selected?.lenderAcceptance.accepted ?? false;

  return (
    <section className="dashboard-panel lender-agreements">
      <header className="page-header">
        <div>
          <p className="eyebrow">Contracts</p>
          <h1 className="page-title">Agreements</h1>
          <p className="page-subtitle">Review and sign first, then the borrower signs after the external transfer step. Smart Credit does not execute or verify that transfer.</p>
        </div>
        <button className="pagination-button" type="button" disabled={loading} onClick={() => void loadList()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <section className="summary-grid" aria-label="Agreement summary">
        <article className="card metric-card">
          <div className="metric-icon metric-icon--primary"><FileSignature size={22} /></div>
          <div className="metric-copy"><p className="metric-label">Total agreements</p><p className="metric-value">{loading ? "--" : records.length}</p></div>
        </article>
        <article className="card metric-card">
          <div className="metric-icon metric-icon--warning"><ShieldCheck size={22} /></div>
          <div className="metric-copy"><p className="metric-label">Awaiting completion</p><p className="metric-value">{loading ? "--" : pendingCount}</p></div>
        </article>
      </section>

      {error ? <p className="create-ad-banner create-ad-banner--error">{error}</p> : null}
      {notice ? <p className="create-ad-banner create-ad-banner--primary">{notice}</p> : null}

      <div className="lender-agreements__layout">
        <section className="card lender-agreements__list" aria-label="Loan agreements">
          {loading ? <p className="lender-agreements__state">Loading agreements...</p> : records.length ? records.map((record) => (
            <button
              type="button"
              key={record.id}
              className={`lender-agreements__record${selected?.id === record.id ? " lender-agreements__record--active" : ""}`}
              onClick={() => { setSelected(record); setConsentAccepted(false); setNotice(""); }}
            >
              <span><strong>{record.borrower.fullName}</strong><small>Version {record.version} · {label(record.status)}</small></span>
              <span>{money(record.terms.principalMinor)}</span>
            </button>
          )) : <p className="lender-agreements__state">No agreements are available.</p>}
        </section>

        <section className="card lender-agreements__detail">
          {!selected ? <div className="lender-agreements__empty"><FileSignature size={34} /><h2>Select an agreement</h2><p>Choose a borrower contract to review its current version.</p></div> : (
            <>
              <div className="lender-agreements__detail-header">
                <div><p className="eyebrow">Version {selected.version}</p><h2>{selected.title}</h2><p>{selected.summary}</p></div>
                <span className={`badge badge-${selected.status}`}>{label(selected.status)}</span>
              </div>

              <div className="lender-agreements__terms">
                <div><span>Principal</span><strong>{money(selected.terms.principalMinor)}</strong></div>
                <div><span>Interest</span><strong>{selected.terms.annualInterestRate}% p.a.</strong></div>
                <div><span>Tenure</span><strong>{selected.terms.tenureMonths} months</strong></div>
                <div><span>Monthly installment</span><strong>{money(selected.terms.monthlyInstallmentMinor)}</strong></div>
                <div><span>Total repayable</span><strong>{money(selected.terms.totalRepayableMinor)}</strong></div>
                <div><span>First due date</span><strong>One month after activation</strong></div>
              </div>

              <div className="lender-agreements__signatures">
                <p><CheckCircle2 size={16} /> Borrower: {selected.borrowerAcceptance.accepted ? `${selected.borrowerAcceptance.signedName} signed` : lenderSigned ? "Waiting to sign after the external transfer step" : "Waiting for your lender signature first"}</p>
                <p><CheckCircle2 size={16} /> Lender: {lenderSigned ? `${selected.lenderAcceptance.signedName} signed` : "Awaiting your signature"}</p>
              </div>

              {!selected.legacyReadOnly && !lenderSigned ? (
                <div className="lender-agreements__sign-form">
                  <label><span>Legal signing name</span><input className="input" value={signedName} onChange={(event) => setSignedName(event.target.value)} /></label>
                  <label className="lender-agreements__consent"><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} /><span>I reviewed version {selected.version}, agree to the displayed terms, and intend my typed name to be the lender-first electronic signature before the borrower signs.</span></label>
                  <button className="button button-primary" type="button" disabled={busy || !signedName.trim() || !consentAccepted} onClick={() => void handleSign()}><FileSignature size={17} /> Sign agreement</button>
                </div>
              ) : null}

              <div className="lender-agreements__actions">
                {selected.status === "finalization_failed" ? <button className="button button-primary" type="button" disabled={busy} onClick={() => void handleRetry()}><RefreshCw size={17} /> Retry finalization</button> : null}
                <button className="button button-secondary" type="button" disabled={busy} onClick={() => void handleDownload()}><Download size={17} /> {selected.pdfAvailable ? "Download signed PDF" : "Download draft PDF"}</button>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
