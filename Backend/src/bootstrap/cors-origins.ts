function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function configuredOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isCorsOriginAllowed(origin?: string): boolean {
  // Native mobile clients and server-to-server requests do not send Origin.
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, '');
  const allowed = configuredOrigins();
  if (
    process.env.NODE_ENV !== 'production' &&
    isLocalDevelopmentOrigin(normalizedOrigin)
  )
    return true;

  return allowed.includes(normalizedOrigin);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
): void {
  callback(null, isCorsOriginAllowed(origin));
}
