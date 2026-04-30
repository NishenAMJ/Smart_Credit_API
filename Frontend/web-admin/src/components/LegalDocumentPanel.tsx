import { useState } from 'react';

import { ApiError, authApi } from '../api';
import type { LegalDocument, UserRole } from '../types';

type LegalDocumentPanelProps = {
  accessToken: string;
  activeRole: UserRole;
};

export function LegalDocumentPanel({
  accessToken,
  activeRole,
}: LegalDocumentPanelProps) {
  const [loanId, setLoanId] = useState('');
  const [signedName, setSignedName] = useState('');
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    'Enter a real loan ID to generate or reload the latest loan agreement.',
  );

  const isPartyAccepted =
    activeRole === 'borrower'
      ? document?.borrowerAccepted
      : activeRole === 'lender'
        ? document?.lenderAccepted
        : true;

  function handleDownloadPdf() {
    if (!document) {
      return;
    }

    const url = authApi.getLegalDocumentDownloadUrl(accessToken, document.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleGenerate() {
    const trimmedLoanId = loanId.trim();
    if (!trimmedLoanId) {
      setError('Loan ID is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authApi.generateLegalDocument(
        accessToken,
        trimmedLoanId,
      );
      setDocument(response.document);
      setMessage(response.message ?? 'Loan agreement generated successfully.');
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to generate the legal document.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadLatest() {
    const trimmedLoanId = loanId.trim();
    if (!trimmedLoanId) {
      setError('Loan ID is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authApi.getLatestLegalDocument(
        accessToken,
        trimmedLoanId,
      );

      if (!response.document) {
        setDocument(null);
        setMessage(
          'No legal agreement exists for this loan yet. Generate one to create the first version.',
        );
        return;
      }

      setDocument(response.document);
      setMessage('Latest loan agreement loaded successfully.');
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to load the legal document.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!document) {
      return;
    }

    if (!signedName.trim()) {
      setError('Enter your legal signing name before accepting the agreement.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authApi.acceptLegalDocumentWithSignature(
        accessToken,
        document.id,
        { signedName: signedName.trim() },
      );
      setDocument(response.document);
      setMessage(
        response.message ?? 'Your agreement acceptance has been recorded.',
      );
    } catch (nextError) {
      setError(
        nextError instanceof ApiError || nextError instanceof Error
          ? nextError.message
          : 'Failed to accept the legal document.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="legal-document-panel">
      <div className="legal-toolbar">
        <label className="field legal-field">
          <span>Loan ID</span>
          <input
            value={loanId}
            onChange={(event) => setLoanId(event.target.value)}
            placeholder="Paste a loan document ID"
          />
        </label>

        <div className="legal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleLoadLatest()}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load latest'}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate agreement'}
          </button>
        </div>
      </div>

      <p className="legal-helper">
        Use a real `loans` document ID. If your project has no loans yet, create one first through `/api/loans` or seed mock loan data.
      </p>

      {message ? <div className="message-banner success">{message}</div> : null}
      {error ? <div className="message-banner error">{error}</div> : null}

      {document ? (
        <div className="legal-preview-stack">
          <div className="detail-list">
            <DetailRow label="Document ID" value={document.id} />
            <DetailRow label="Status" value={document.status} />
            <DetailRow
              label="Borrower accepted"
              value={document.borrowerAccepted ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Lender accepted"
              value={document.lenderAccepted ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Borrower signed name"
              value={document.borrowerSignatureAudit?.signedName ?? 'Pending signer name'}
            />
            <DetailRow
              label="Lender signed name"
              value={document.lenderSignatureAudit?.signedName ?? 'Pending signer name'}
            />
          </div>

          <div className="legal-meta-card">
            <h3>{document.title}</h3>
            <p>{document.summary}</p>
            <p>
              <strong>Loan amount:</strong>{' '}
              {new Intl.NumberFormat('en-LK', {
                style: 'currency',
                currency: 'LKR',
                maximumFractionDigits: 0,
              }).format(document.loanSnapshot.amount)}
            </p>
            <p>
              <strong>Interest:</strong> {document.loanSnapshot.interestRate}% for{' '}
              {document.loanSnapshot.durationMonths} months
            </p>
          </div>

          <iframe
            className="legal-preview-frame"
            title="Generated legal agreement preview"
            srcDoc={document.htmlContent}
          />

          {activeRole !== 'admin' ? (
            <div className="legal-actions">
              <label className="field legal-field">
                <span>Your legal signing name</span>
                <input
                  value={signedName}
                  onChange={(event) => setSignedName(event.target.value)}
                  placeholder="Enter your full legal name"
                />
              </label>
              <button
                className="primary-button"
                type="button"
                onClick={() => void handleAccept()}
                disabled={loading || isPartyAccepted}
              >
                {isPartyAccepted ? 'Agreement accepted' : 'Accept this agreement'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={handleDownloadPdf}
                disabled={loading || !isPartyAccepted}
              >
                Download PDF
              </button>
            </div>
          ) : (
            <button
              className="secondary-button"
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading}
            >
              Download PDF
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
