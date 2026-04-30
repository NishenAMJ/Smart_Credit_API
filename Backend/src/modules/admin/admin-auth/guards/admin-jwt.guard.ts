import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  // Verifies the bearer token and ensures the authenticated user has the admin role.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Admin access required');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getToken(request: {
    headers: { authorization?: string };
    query?: { token?: string | string[] };
  }): string | null {
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const queryToken = request.query?.token;

    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
