import { isCorsOriginAllowed } from './cors-origins';

describe('CORS origin allowlist', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOrigins = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalOrigins;
  });

  it('allows configured production origins and ignores trailing slashes', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS =
      'https://smart-credit.vercel.app/, https://www.smartcredit.lk';

    expect(isCorsOriginAllowed('https://smart-credit.vercel.app')).toBe(true);
    expect(isCorsOriginAllowed('https://www.smartcredit.lk/')).toBe(true);
    expect(isCorsOriginAllowed('https://untrusted.example')).toBe(false);
  });

  it('allows requests without an origin for native and server clients', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = '';

    expect(isCorsOriginAllowed(undefined)).toBe(true);
  });

  it('keeps local Vite origins available outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = '';

    expect(isCorsOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:5174')).toBe(true);
    expect(isCorsOriginAllowed('http://127.0.0.1:4173')).toBe(true);
    expect(isCorsOriginAllowed('https://localhost:5173')).toBe(true);
    expect(isCorsOriginAllowed('http://untrusted.example:5173')).toBe(false);
  });
});
