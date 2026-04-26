import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { User, UserRole } from '../interfaces/user.interface';
import { AdminSignupDto } from './dto/admin-signup.dto';

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

  private async buildAdminAuthResponse(uid: string, email: string) {
    const payload: AdminJwtPayload = {
      uid,
      email,
      role: 'admin',
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: payload,
    };
  }

  // Validates the admin's credentials and returns a signed JWT session token.
  async adminLogin(email: string, password: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const snapshot = await this.firebaseService.db
        .collection('users')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new UnauthorizedException('Invalid credential');
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

      return {
        accessToken: await this.jwtService.signAsync(payload),
        user: payload,
      };
    } catch (error: any) {
      if (error?.status) throw error;

      console.error('adminLogin error:', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async adminSignup(dto: AdminSignupDto) {
    try {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const usersCollection = this.firebaseService.db.collection('users');
      const existingUser = await usersCollection
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        throw new ConflictException('An account with this email already exists');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const userRef = usersCollection.doc();

      const user: User = {
        id: userRef.id,
        email: normalizedEmail,
        role: 'admin',
        status: 'active',
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        department: dto.department.trim(),
        adminRole: dto.adminRole.trim(),
        passwordHash,
        createdAt: FieldValue.serverTimestamp() as never,
        updatedAt: FieldValue.serverTimestamp() as never,
      };

      await userRef.set(user);

      return this.buildAdminAuthResponse(userRef.id, normalizedEmail);
    } catch (error: any) {
      if (error?.status) throw error;

      console.error('adminSignup error:', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
