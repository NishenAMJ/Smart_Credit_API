import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Eye, RefreshCw, Rocket, Search, X } from "lucide-react";
import { decideAdBoostPayment, getAdBoostReceiptAccess, getAdBoosts, type AdminAdBoost } from "../../lib/api";

const FILTERS = ["pending_verification", "approved", "rejected", "all"] as const;
const PAGE_SIZE = 10;

// ADMIN: Verify ad boost payments - frontend
export default function AdBoosts() {
  const [items, setItems] = useState<AdminAdBoost[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending_verification");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminAdBoost | null>(null);
  const [decision, setDecision] = useState<{ item: AdminAdBoost; approved: boolean } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<{
    url: string;
    reference: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(""); setItems(await getAdBoosts("all"));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to load ad boosts.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter, search, planFilter, dateFrom, dateTo]);

  const plans = useMemo(() => [...new Map(items.map((item) => [item.plan.id, item.plan])).values()], [items]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const rawDate = item.submittedAt ?? item.createdAt;
      const date = rawDate ? new Date(rawDate) : null;
      return (filter === "all" || item.status === filter) &&
        (planFilter === "all" || item.plan.id === planFilter) &&
        (!dateFrom || Boolean(date && date >= new Date(`${dateFrom}T00:00:00`))) &&
        (!dateTo || Boolean(date && date <= new Date(`${dateTo}T23:59:59.999`))) &&
        (!query || [item.boostId, shortReference(item.boostId), item.lenderId, item.lenderName,
          item.listingId, item.listingTitle, item.bankReference, item.transactionId]
          .filter(Boolean).some((value) => value!.toLowerCase().includes(query)));
    });
  }, [dateFrom, dateTo, filter, items, planFilter, search]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const stats = {
    pending: items.filter((item) => item.status === "pending_verification").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    revenue: items.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.plan.amountMinor / 100, 0),
  };

  async function viewReceipt(item: AdminAdBoost) {
    if (!item.receiptDocumentId) return;
    try {
      setReceiptLoading(true);
      setError("");
      const access = await getAdBoostReceiptAccess(item.receiptDocumentId);
      setReceiptPreview({
        url: access.accessUrl,
        reference: shortReference(item.boostId),
        fileName: access.fileName,
        mimeType: access.mimeType,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to open receipt.");
    } finally {
      setReceiptLoading(false);
    }
  }

  async function submitDecision() {
    if (!decision || (!decision.approved && !rejectionReason.trim())) return;
    try {
      setBusyId(decision.item.boostId); setError(""); setMessage("");
      await decideAdBoostPayment(decision.item.boostId, decision.approved,
        decision.approved ? undefined : rejectionReason.trim());
      setMessage(`Ad boost ${decision.approved ? "approved" : "rejected"} successfully.`);
      setDecision(null); setRejectionReason(""); setSelected(null); await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to review ad boost.");
    } finally { setBusyId(null); }
  }

  function exportCsv() {
    const rows = filtered.map((item) => [shortReference(item.boostId), item.boostId,
      item.lenderName ?? item.lenderId, item.listingTitle ?? item.listingId, item.plan.name,
      money(item.plan.amountMinor / 100), label(item.paymentMethod), item.bankReference ?? "",
      label(item.status), item.reviewedByAdminName ?? "", formatDate(item.reviewedAt)]);
    const csv = [["Reference", "Full ID", "Lender", "Advertisement", "Plan", "Amount",
      "Payment Method", "Bank Reference", "Status", "Reviewed By", "Reviewed At"], ...rows]
      .map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url;
    link.download = `ad-boosts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }

  return <div>
    <div className="page-header"><div><h1 className="page-title">Ad Boosts</h1>
      <p className="page-subtitle">Review and verify payments for boosted advertisements.</p></div>
      <div style={S.actions}><button className="btn-secondary btn-sm" onClick={exportCsv} disabled={!filtered.length}>
        <Download size={16} /> Export CSV</button>
        <button className="btn-secondary btn-sm" onClick={() => void load()} title="Refresh"><RefreshCw size={16} /></button></div>
    </div>
    {error && <div className="card" style={S.error}>{error}</div>}
    {message && <div className="card" style={S.success}>{message}</div>}
    <div style={S.statsGrid}><Summary label="Pending" value={String(stats.pending)} />
      <Summary label="Approved" value={String(stats.approved)} /><Summary label="Rejected" value={String(stats.rejected)} />
      <Summary label="Ad Boost Revenue" value={money(stats.revenue)} /></div>
    <div className="card" style={S.toolbar}><div className="tabs">{FILTERS.map((value) =>
      <button key={value} className={`tab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label(value)}</button>)}</div>
      <select className="input" style={S.planSelect} value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} aria-label="Boost plan">
        <option value="all">All plans</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{label(plan.name)}</option>)}</select>
      <input className="input" style={S.dateInput} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} title="From date" />
      <input className="input" style={S.dateInput} type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} title="To date" />
      <div className="search-wrap" style={S.searchWrap}><Search className="search-icon" size={16} />
        <input className="input" placeholder="Search ad boosts..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    </div>
    <div className="table-container"><table><thead><tr><th>Boosted Ad</th><th>Lender / Advertisement</th><th>Plan</th><th>Payment</th>
      <th>Status</th><th>Reviewed</th><th>Actions</th></tr></thead><tbody>
      {pageItems.map((item) => <tr key={item.boostId} style={S.row} onClick={() => setSelected(item)}>
        <td><div style={S.boostCell}><Rocket size={16} /><div><strong>{shortReference(item.boostId)}</strong><div style={S.muted}>{formatDate(item.submittedAt ?? item.createdAt)}</div></div></div></td>
        <td><strong>{item.lenderName ?? item.lenderId}</strong><div style={S.muted}>{item.listingTitle ?? "Advertisement"}</div></td>
        <td><strong>{label(item.plan.name)}</strong><div style={S.muted}>{money(item.plan.amountMinor / 100)}</div></td>
        <td><strong>{label(item.paymentMethod)}</strong><div style={S.muted}>{item.bankReference ?? "No reference"}</div></td>
        <td><span className={`badge ${badge(item.status)}`}>{label(item.status)}</span>{item.rejectionReason && <div style={S.reason}>{item.rejectionReason}</div>}</td>
        <td><strong>{item.reviewedByAdminName ?? "Not reviewed"}</strong><div style={S.muted}>{formatDate(item.reviewedAt)}</div></td>
        <td onClick={(event) => event.stopPropagation()}><div style={S.tableActions}>
          <button className="btn-secondary" style={S.tableActionButton} onClick={() => setSelected(item)} title="View details" aria-label="View details"><Eye size={16} /></button>
          {item.status === "pending_verification" && <><button className="btn-primary" style={S.tableActionButton} disabled={busyId === item.boostId} onClick={() => setDecision({ item, approved: true })} title="Approve payment" aria-label="Approve payment"><Check size={16} /></button>
            <button className="btn-secondary" style={S.tableActionButton} disabled={busyId === item.boostId} onClick={() => setDecision({ item, approved: false })} title="Reject payment" aria-label="Reject payment"><X size={16} /></button></>}</div></td>
      </tr>)}
      {!pageItems.length && <tr><td colSpan={7} style={S.empty}>{loading ? "Loading ad boosts..." : filter === "pending_verification" ? "No ad boosts awaiting verification." : `No ${filter === "all" ? "" : label(filter).toLowerCase() + " "}ad boosts found.`}</td></tr>}
    </tbody></table><div style={S.pagination}><span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
      <div style={S.actions}><button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Previous</button>
        <span>Page {page} of {pages}</span><button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={16} /></button></div></div></div>
    {selected && <Details item={selected} onClose={() => setSelected(null)} onReceipt={() => void viewReceipt(selected)}
      onApprove={() => setDecision({ item: selected, approved: true })} onReject={() => setDecision({ item: selected, approved: false })}
      busy={busyId === selected.boostId} receiptLoading={receiptLoading} />}
    {receiptPreview && <ReceiptPreview preview={receiptPreview} onClose={() => setReceiptPreview(null)} />}
    {decision && <DecisionDialog decision={decision} reason={rejectionReason} setReason={setRejectionReason}
      busy={busyId === decision.item.boostId} onCancel={() => { setDecision(null); setRejectionReason(""); }} onConfirm={() => void submitDecision()} />}
  </div>;
}

function Summary({ label: text, value }: { label: string; value: string }) {
  return <div className="card"><p style={S.muted}>{text}</p><p style={S.statValue}>{value}</p></div>;
}

function Details({ item, onClose, onReceipt, onApprove, onReject, busy, receiptLoading }: {
  item: AdminAdBoost; onClose: () => void; onReceipt: () => void; onApprove: () => void; onReject: () => void; busy: boolean; receiptLoading: boolean;
}) {
  const rows = [["Reference", shortReference(item.boostId)], ["Full boost ID", item.boostId], ["Lender", item.lenderName ?? item.lenderId],
    ["Advertisement", item.listingTitle ?? item.listingId], ["Advertisement ID", item.listingId], ["Plan", label(item.plan.name)],
    ["Amount", money(item.plan.amountMinor / 100)], ["Payment method", label(item.paymentMethod)], ["Bank reference", item.bankReference ?? "N/A"],
    ["Transaction ID", item.transactionId], ["Status", label(item.status)], ["Submitted at", formatDate(item.submittedAt)],
    ["Reviewed by", item.reviewedByAdminName ?? "Not reviewed"], ["Reviewed at", formatDate(item.reviewedAt)],
    ["Boost starts", formatDate(item.startsAt)], ["Boost ends", formatDate(item.endsAt)]];
  return <div style={S.overlay} onClick={onClose}><div style={S.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
    <div style={S.modalHeader}><div><h2 style={S.modalTitle}>Ad Boost Details</h2><p style={S.muted}>{shortReference(item.boostId)}</p></div>
      <button className="btn-secondary btn-sm" onClick={onClose}><X size={18} /></button></div>
    <div style={S.details}>{rows.map(([name, value]) => <div key={name} style={S.detail}><span style={S.detailLabel}>{name}</span><strong>{value}</strong></div>)}</div>
    {item.rejectionReason && <div style={S.rejectionBox}><strong>Rejection reason</strong><div>{item.rejectionReason}</div></div>}
    <div style={S.modalActions}>{item.receiptDocumentId && <button className="btn-secondary btn-sm" disabled={receiptLoading} onClick={onReceipt}><Eye size={15} /> {receiptLoading ? "Loading Receipt..." : "View Receipt"}</button>}
      {item.status === "pending_verification" && <><button className="btn-primary btn-sm" disabled={busy} onClick={onApprove}><Check size={15} /> Approve</button>
        <button className="btn-secondary btn-sm" disabled={busy} onClick={onReject}><X size={15} /> Reject</button></>}</div>
  </div></div>;
}

function ReceiptPreview({ preview, onClose }: {
  preview: { url: string; reference: string; fileName: string; mimeType: string };
  onClose: () => void;
}) {
  const [mediaError, setMediaError] = useState(false);
  const isPdf = preview.mimeType.toLowerCase().includes("pdf") || preview.fileName.toLowerCase().endsWith(".pdf");
  return <div style={{ ...S.overlay, zIndex: 1200 }} onClick={onClose}>
    <div style={S.receiptModal} role="dialog" aria-modal="true" aria-label="Payment receipt preview" onClick={(event) => event.stopPropagation()}>
      <div style={S.receiptHeader}>
        <div>
          <p style={S.receiptEyebrow}>Payment evidence</p>
          <h2 style={S.modalTitle}>Bank Transfer Receipt</h2>
          <p style={S.muted}>{preview.reference} · {preview.fileName}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={onClose} aria-label="Close receipt preview"><X size={18} /></button>
      </div>
      <div style={S.receiptCanvas}>
        {mediaError ? <div style={S.receiptError}>
          <strong>Receipt preview unavailable</strong>
          <span>The file could not be loaded from secure storage. Try refreshing the page and opening it again.</span>
        </div> : isPdf ? <iframe
          src={preview.url}
          title={`Payment receipt for ${preview.reference}`}
          style={S.receiptFrame}
          onError={() => setMediaError(true)}
        /> : <img
          src={preview.url}
          alt={`Payment receipt for ${preview.reference}`}
          style={S.receiptImage}
          onError={() => setMediaError(true)}
        />}
      </div>
      <div style={S.receiptFooter}>
        <span style={S.receiptHint}>Review the account, amount, date, and reference before making a decision.</span>
        <button className="btn-primary btn-sm" onClick={onClose}>Done</button>
      </div>
    </div>
  </div>;
}

function DecisionDialog({ decision, reason, setReason, busy, onCancel, onConfirm }: {
  decision: { item: AdminAdBoost; approved: boolean }; reason: string; setReason: (value: string) => void;
  busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return <div style={{ ...S.overlay, zIndex: 1100 }}><div style={{ ...S.modal, width: "min(480px, 94vw)" }} role="alertdialog">
    <h2 style={S.modalTitle}>{decision.approved ? "Approve Ad Boost?" : "Reject Ad Boost?"}</h2>
    <p style={S.confirmText}>Confirm {decision.approved ? "approval" : "rejection"} of {shortReference(decision.item.boostId)} for {money(decision.item.plan.amountMinor / 100)}.</p>
    {!decision.approved && <textarea className="input" rows={4} placeholder="Enter rejection reason (required)" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />}
    <div style={S.modalActions}><button className="btn-secondary btn-sm" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className={decision.approved ? "btn-primary btn-sm" : "btn-secondary btn-sm"} disabled={busy || (!decision.approved && !reason.trim())} onClick={onConfirm}>
        {busy ? "Processing..." : decision.approved ? "Confirm Approval" : "Confirm Rejection"}</button></div>
  </div></div>;
}

function shortReference(id: string) { let hash = 0; for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return `BOOST-${String(hash % 1_000_000).padStart(6, "0")}`; }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(value: number) { return `LKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : "N/A"; }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function badge(status: string) { return status === "approved" ? "badge-success" : status === "rejected" ? "badge-danger" : "badge-warning"; }

const S: Record<string, React.CSSProperties> = {
  actions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tableActions: { display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" },
  tableActionButton: { width: 34, height: 34, minWidth: 34, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8 },
  error: { color: "#B91C1C", background: "#FEF2F2", marginBottom: 16 }, success: { color: "#047857", background: "#ECFDF5", marginBottom: 16 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 16 }, statValue: { marginTop: 8, fontSize: 26, fontWeight: 700, color: "#111827" },
  toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }, planSelect: { width: 140 }, dateInput: { width: 145 }, searchWrap: { width: 260, marginLeft: "auto" },
  row: { cursor: "pointer" }, boostCell: { display: "flex", gap: 8, alignItems: "center" }, muted: { marginTop: 3, fontSize: 12, color: "#6B7280" }, reason: { marginTop: 5, fontSize: 12, color: "#B91C1C" },
  empty: { textAlign: "center", padding: 36, color: "#6B7280" }, pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, borderTop: "1px solid #E5E7EB", color: "#6B7280", fontSize: 13 },
  overlay: { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15,23,42,.55)" },
  modal: { width: "min(760px, 94vw)", maxHeight: "88vh", overflowY: "auto", padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingBottom: 16, borderBottom: "1px solid #E5E7EB" }, modalTitle: { margin: 0, fontSize: 20, color: "#111827" },
  details: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16 }, detail: { display: "flex", flexDirection: "column", gap: 5, padding: 12, borderRadius: 10, background: "#F9FAFB", overflowWrap: "anywhere" },
  detailLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#6B7280" }, rejectionBox: { marginTop: 14, padding: 12, borderRadius: 10, color: "#991B1B", background: "#FEF2F2" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }, confirmText: { margin: "12px 0 18px", color: "#4B5563", lineHeight: 1.5 },
  receiptModal: { width: "min(900px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 30px 80px rgba(15,23,42,.35)" },
  receiptHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "20px 22px", borderBottom: "1px solid #E5E7EB" },
  receiptEyebrow: { margin: "0 0 5px", color: "#2563EB", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" },
  receiptCanvas: { minHeight: 300, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 20, background: "#F1F5F9" },
  receiptImage: { display: "block", maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 10, background: "#FFFFFF", boxShadow: "0 8px 28px rgba(15,23,42,.14)" },
  receiptFrame: { width: "100%", height: "65vh", border: 0, borderRadius: 10, background: "#FFFFFF", boxShadow: "0 8px 28px rgba(15,23,42,.14)" },
  receiptError: { maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28, border: "1px solid #FECACA", borderRadius: 12, color: "#991B1B", background: "#FEF2F2", textAlign: "center", lineHeight: 1.5 },
  receiptFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, padding: "14px 22px", borderTop: "1px solid #E5E7EB", background: "#FFFFFF" },
  receiptHint: { color: "#64748B", fontSize: 12, lineHeight: 1.45 },
};
