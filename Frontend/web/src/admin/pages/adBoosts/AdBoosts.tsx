import { useCallback, useEffect, useState } from "react";
import { Check, Eye, RefreshCw, Rocket, X } from "lucide-react";
import {
  decideAdBoostPayment,
  getAdBoostReceiptAccess,
  getAdBoosts,
  type AdminAdBoost,
} from "../../lib/api";

const FILTERS = ["pending_verification", "approved", "rejected", "all"];

export default function AdBoosts() {
  const [items, setItems] = useState<AdminAdBoost[]>([]);
  const [filter, setFilter] = useState("pending_verification");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setItems(await getAdBoosts(filter));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to load boost payments.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function viewReceipt(item: AdminAdBoost) {
    if (!item.receiptDocumentId) return;
    try {
      const access = await getAdBoostReceiptAccess(item.receiptDocumentId);
      window.open(access.accessUrl, "_blank", "noopener,noreferrer");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to open receipt.");
    }
  }

  async function decide(item: AdminAdBoost, approved: boolean) {
    const reason = approved ? undefined : window.prompt("Reason for rejecting this payment:")?.trim();
    if (!approved && !reason) return;
    try {
      setBusyId(item.boostId);
      setError("");
      await decideAdBoostPayment(item.boostId, approved, reason);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to review boost payment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Boost Payments</h1>
          <p className="page-subtitle">Verify bank transfers used for optional sponsored ad placement.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => void load()} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error ? <div className="card" style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</div> : null}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="tabs">
          {FILTERS.map((value) => (
            <button key={value} className={`tab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>
              {value.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Boost</th><th>Lender / Ad</th><th>Plan</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.boostId}>
                <td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Rocket size={16} /><div><strong>{item.boostId}</strong><div>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Not submitted"}</div></div></div></td>
                <td><strong>{item.lenderId}</strong><div>Ad: {item.listingId}</div></td>
                <td><strong>{item.plan.name}</strong><div>LKR {(item.plan.amountMinor / 100).toLocaleString()}</div></td>
                <td><strong>{item.paymentMethod.replaceAll("_", " ")}</strong><div>{item.bankReference || item.transactionId}</div></td>
                <td><span className="badge">{item.status.replaceAll("_", " ")}</span>{item.rejectionReason ? <div>{item.rejectionReason}</div> : null}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    {item.receiptDocumentId ? <button className="btn-secondary btn-sm" onClick={() => void viewReceipt(item)} title="View receipt"><Eye size={15} /></button> : null}
                    {item.status === "pending_verification" ? <>
                      <button className="btn-primary btn-sm" disabled={busyId === item.boostId} onClick={() => void decide(item, true)} title="Approve"><Check size={15} /></button>
                      <button className="btn-secondary btn-sm" disabled={busyId === item.boostId} onClick={() => void decide(item, false)} title="Reject"><X size={15} /></button>
                    </> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}>{loading ? "Loading boost payments..." : "No boost payments found."}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
