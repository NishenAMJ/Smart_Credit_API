import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const activeRole = request.user?.role;

    if (activeRole && requiredRoles.includes(activeRole)) {
      return true;
    }

    throw new ForbiddenException(
      `This route requires one of these roles: ${requiredRoles.join(', ')}.`,
    );
  }
}
