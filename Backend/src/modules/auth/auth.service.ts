import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../../firebase/firebase.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, role, name, phone } = registerDto;

    // Check if user already exists
    const existingUserSnapshot = await this.firebaseService.db
      .collection('users')
      .where('email', '==', email)
      .get();

    if (!existingUserSnapshot.empty) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document
    const userData = {
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const userRef = await this.firebaseService.db
      .collection('users')
      .add(userData);

    const userId = userRef.id;

    // Create profile based on role
    let profileId: string | undefined;
    if (role === 'lender') {
      const lenderData = {
        userId,
        name,
        email,
        phone,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lenderRef = await this.firebaseService.db
        .collection('lenders')
        .add(lenderData);
      profileId = lenderRef.id;

      // Link profile to user
      await userRef.update({ lenderProfileId: profileId });
    } else if (role === 'borrower') {
      const borrowerData = {
        userId,
        name,
        email,
        phone,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const borrowerRef = await this.firebaseService.db
        .collection('borrowers')
        .add(borrowerData);
      profileId = borrowerRef.id;

      // Link profile to user
      await userRef.update({ borrowerProfileId: profileId });
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: userId,
      email: email,
      role: role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: userId,
        email,
        role,
        profileId,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const userSnapshot = await this.firebaseService.db
      .collection('users')
      .where('email', '==', email)
      .get();

    if (userSnapshot.empty) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if user is active
    if (userData.isActive === false) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get profile ID based on role
    let profileId: string | undefined;
    if (userData.role === 'lender' && userData.lenderProfileId) {
      profileId = userData.lenderProfileId;
    } else if (userData.role === 'borrower' && userData.borrowerProfileId) {
      profileId = userData.borrowerProfileId;
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: userId,
      email: userData.email,
      role: userData.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: userId,
        email: userData.email,
        role: userData.role,
        profileId,
      },
    };
  }

  async validateUser(userId: string): Promise<any> {
    const userDoc = await this.firebaseService.db
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new NotFoundException('User not found');
    }

    const userData = userDoc.data();
    
    if (!userData) {
      throw new NotFoundException('User data not found');
    }
    
    if (userData.isActive === false) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return {
      id: userDoc.id,
      email: userData.email,
      role: userData.role,
      lenderProfileId: userData.lenderProfileId,
      borrowerProfileId: userData.borrowerProfileId,
    };
  }

  async getUserProfile(userId: string): Promise<any> {
    const user = await this.validateUser(userId);

    let profile: any = null;
    if (user.role === 'lender' && user.lenderProfileId) {
      const profileDoc = await this.firebaseService.db
        .collection('lenders')
        .doc(user.lenderProfileId)
        .get();
      if (profileDoc.exists) {
        profile = {
          id: profileDoc.id,
          ...profileDoc.data(),
        };
      }
    } else if (user.role === 'borrower' && user.borrowerProfileId) {
      const profileDoc = await this.firebaseService.db
        .collection('borrowers')
        .doc(user.borrowerProfileId)
        .get();
      if (profileDoc.exists) {
        profile = {
          id: profileDoc.id,
          ...profileDoc.data(),
        };
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile,
    };
  }
}
