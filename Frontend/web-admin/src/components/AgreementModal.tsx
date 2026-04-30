import { useState } from 'react';

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  pdfUrl?: string;
}

export function AgreementModal({
  isOpen,
  onClose,
  onAccept,
  title = "Terms and Conditions",
  pdfUrl = "/agreement.pdf"
}: AgreementModalProps) {
  const [isAccepted, setIsAccepted] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (isAccepted) {
      onAccept();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content agreement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="pdf-container">
            <iframe
              src={pdfUrl}
              width="100%"
              height="500px"
              style={{ border: 'none', borderRadius: '8px' }}
              title="Agreement Document"
            />
          </div>

          <div className="agreement-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
              />
              <span className="checkmark"></span>
              I have read and agree to the terms and conditions
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleAccept}
            disabled={!isAccepted}
          >
            Accept Agreement
          </button>
        </div>
      </div>
    </div>
  );
}