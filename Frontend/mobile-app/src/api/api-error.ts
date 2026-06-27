/** @format */

import axios from "axios";

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function messageFromBody(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.filter(Boolean).join("\n");
  }

  if (typeof data === "object") {
    const body = data as ApiErrorBody;

    if (Array.isArray(body.message)) {
      return body.message.filter(Boolean).join("\n");
    }

    if (typeof body.message === "string") {
      return body.message;
    }

    if (typeof body.error === "string") {
      return body.error;
    }
  }

  return null;
}

function statusFallback(status?: number) {
  if (status === 400) {
    return "The request was not accepted. Please review the details and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested item could not be found.";
  }

  if (status && status >= 500) {
    return "The server is having trouble right now. Please try again shortly.";
  }

  return "Something went wrong. Please try again.";
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (axios.isAxiosError(error)) {
    return (
      messageFromBody(error.response?.data) ??
      error.message ??
      statusFallback(error.response?.status) ??
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function toApiError(error: unknown, fallback?: string) {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return new ApiError(
      getApiErrorMessage(error, fallback ?? statusFallback(status)),
      status,
      error.response?.data,
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError(fallback ?? statusFallback());
}
