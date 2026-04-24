import type { Request } from 'express';

import type { UserRole } from '../../modules/auth/auth.types';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

