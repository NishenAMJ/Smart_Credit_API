import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { FirebaseService } from '../../firebase/firebase.service';
import { hasRole } from '../../firebase/firestore-query.utils';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'development-secret',
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Invalid session.');
    }

    const snapshot = await this.firebaseService.db
      .collection('users')
      .doc(payload.sub)
      .get();
    const user = snapshot.data();

    if (!snapshot.exists || !user) {
      throw new UnauthorizedException('This account no longer exists.');
    }
    if (user.accountStatus && user.accountStatus !== 'active') {
      throw new UnauthorizedException('This account is not active.');
    }
    if (!hasRole(user.roles ?? user.role, payload.role)) {
      throw new UnauthorizedException(
        'This role is no longer available for the account.',
      );
    }

    return {
      sub: payload.sub,
      email: typeof user.email === 'string' ? user.email : payload.email,
      role: payload.role,
    };
  }
}
