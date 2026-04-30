import { useEffect, useState } from 'react';
import { useKycSubmission } from '../hooks/useKyc';

interface KycFormData {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry: string;
  expiryDate: string;
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function KycSubmissionForm({ accessToken, onSuccess }: { accessToken: string; onSuccess?: () => void }) {
  const { submitKyc, loadMySubmission, loading, error, success, submission } = useKycSubmission(accessToken);

  const [formData, setFormData] = useState<KycFormData>({
    documentType: 'national_id',
    documentNumber: '',
    fullName: '',
    issuingCountry: '',
    expiryDate: '',
    documentFrontUrl: '',
    documentBackUrl: '',
    selfieUrl: '',
  });
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadMySubmission();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitKyc(formData);
    if (onSuccess) onSuccess();
  };

  const handleChange = (field: keyof KycFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (
    field: 'documentFrontUrl' | 'documentBackUrl' | 'selfieUrl',
    file: File | null,
  ) => {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormData(prev => ({ ...prev, [field]: dataUrl }));
      setUploadStatus(prev => ({ ...prev, [field]: file.name }));
    } catch (nextError) {
      console.error(nextError);
    }
  };

  if (submission && ['pending', 'under_review'].includes(submission.status)) {
    return (
      <div className="kyc-status">
        <h3>KYC Submission Status</h3>
        <div className="status-card">
          <p><strong>Status:</strong> {submission.status.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Document Type:</strong> {submission.documentType}</p>
          <p><strong>Submitted:</strong> {new Date(submission.submittedAt).toLocaleDateString()}</p>
          {submission.reviewNotes && (
            <p><strong>Review Notes:</strong> {submission.reviewNotes}</p>
          )}
        </div>
        <p>Your KYC submission is being reviewed. You'll be notified once it's processed.</p>
      </div>
    );
  }

  if (submission?.status === 'approved') {
    return (
      <div className="kyc-status approved">
        <h3>KYC Approved ✅</h3>
        <p>Your identity has been verified. You can now access all platform features.</p>
      </div>
    );
  }

  return (
    <form className="kyc-form" onSubmit={handleSubmit}>
      <h3>Submit KYC Documents</h3>

      {error && <div className="message-banner error">{error}</div>}
      {success && <div className="message-banner success">{success}</div>}

      <div className="form-grid">
        <label className="field">
          <span>Document Type</span>
          <select
            value={formData.documentType}
            onChange={(e) => handleChange('documentType', e.target.value)}
            required
          >
            <option value="national_id">National ID</option>
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
          </select>
        </label>

        <label className="field">
          <span>Document Number</span>
          <input
            type="text"
            value={formData.documentNumber}
            onChange={(e) => handleChange('documentNumber', e.target.value)}
            placeholder="Enter document number"
            required
          />
        </label>

        <label className="field">
          <span>Full Name (as on document)</span>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Enter full name"
            required
          />
        </label>

        <label className="field">
          <span>Issuing Country</span>
          <input
            type="text"
            value={formData.issuingCountry}
            onChange={(e) => handleChange('issuingCountry', e.target.value)}
            placeholder="e.g., Sri Lanka"
          />
        </label>

        <label className="field">
          <span>Expiry Date</span>
          <input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => handleChange('expiryDate', e.target.value)}
          />
        </label>
      </div>

      <div className="document-upload-section">
        <h4>Document Uploads</h4>
        <p>Please upload clear photos of your documents. In a production app, these would be secure file uploads.</p>

        <label className="field">
          <span>Document Front Upload</span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              void handleFileChange('documentFrontUrl', e.target.files?.[0] ?? null)
            }
          />
          {uploadStatus.documentFrontUrl ? <small className="upload-success-text">{uploadStatus.documentFrontUrl}</small> : null}
        </label>

        <label className="field">
          <span>Document Back Upload</span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              void handleFileChange('documentBackUrl', e.target.files?.[0] ?? null)
            }
          />
          {uploadStatus.documentBackUrl ? <small className="upload-success-text">{uploadStatus.documentBackUrl}</small> : null}
        </label>

        <label className="field">
          <span>Selfie with Document Upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              void handleFileChange('selfieUrl', e.target.files?.[0] ?? null)
            }
          />
          {uploadStatus.selfieUrl ? <small className="upload-success-text">{uploadStatus.selfieUrl}</small> : null}
        </label>
      </div>

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit KYC'}
      </button>
    </form>
  );
}
