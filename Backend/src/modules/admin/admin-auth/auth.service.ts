import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../../../firebase/firebase.service';
import { User, UserRole } from '../interfaces/user.interface';

type AdminJwtPayload = {
  uid: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // Validates the admin's credentials and returns a signed JWT session token.
  async adminLogin(email: string, password: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const userDoc = snapshot.docs[0];
      const user = userDoc.data() as User;

      if (user.role !== 'admin') {
        throw new UnauthorizedException('Not an admin account');
      }

      if (!user.passwordHash) {
        throw new UnauthorizedException('Password not set');
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload: AdminJwtPayload = {
        uid: userDoc.id,
        email: user.email,
        role: user.role,
      };

      const token = await this.jwtService.signAsync(payload);

      return {
        accessToken: token,
        user: payload,
      };
    } catch (error: any) {
      if (error?.status) throw error;

      console.error('adminLogin error:', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
