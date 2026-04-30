import { useState } from 'react';
import { ApiError, authApi } from '../api';
import type { KycSubmissionDto } from '../types';

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

export function useKycSubmission(accessToken: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submission, setSubmission] = useState<KycSubmissionDto | null>(null);

  const submitKyc = async (formData: KycFormData) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await authApi.submitKyc(accessToken, formData);
      setSuccess((response as any).message);
      setSubmission((response as any).submission);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit KYC');
    } finally {
      setLoading(false);
    }
  };

  const loadMySubmission = async () => {
    try {
      setLoading(true);
      const response = await authApi.getMyKycSubmission(accessToken);
      setSubmission((response as any).submission);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load KYC submission');
    } finally {
      setLoading(false);
    }
  };

  return {
    submitKyc,
    loadMySubmission,
    loading,
    error,
    success,
    submission,
  };
}