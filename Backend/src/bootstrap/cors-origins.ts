const LOCAL_WEB_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

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
  if (process.env.NODE_ENV !== 'production') {
    allowed.push(...LOCAL_WEB_ORIGINS);
  }

  return allowed.includes(normalizedOrigin);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
): void {
  callback(null, isCorsOriginAllowed(origin));
}
