import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { type CollectionReference, Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthResponseDto, MeResponseDto, RegisterResponseDto, SafeUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserDocument, UserRole } from './auth.types';

@Injectable()
export class AuthService {
  private readonly usersCollection: CollectionReference<UserDocument>;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {
    this.usersCollection = this.firebaseService.db.collection(
      'users',
    ) as CollectionReference<UserDocument>;
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const emailLower = this.normalizeEmail(registerDto.email);
    const phoneNormalized = this.normalizePhone(registerDto.phone);

    const [emailExists, phoneExists] = await Promise.all([
      this.hasExistingEmail(emailLower),
      this.hasExistingPhone(phoneNormalized),
    ]);

    if (emailExists) {
      throw new ConflictException('An account with that email already exists.');
    }

    if (phoneExists) {
      throw new ConflictException('An account with that phone number already exists.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const userRef = this.usersCollection.doc();
    const now = Timestamp.now();
    const user: UserDocument = {
      uid: userRef.id,
      role: [registerDto.role],
      fullName: registerDto.fullName.trim(),
      photoURL: '',
      phone: registerDto.phone.trim(),
      email: registerDto.email.trim(),
      emailLower,
      phoneNormalized,
      passwordHash,
      creditScore: 0,
      rating: 0,
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'not_submitted',
      accountStatus: 'active',
      authProvider: 'local',
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(user);

    return {
      message: 'Account created successfully. Please log in to continue.',
      user: this.toSafeUser(user, registerDto.role),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.findUserByIdentifier(loginDto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials or selected role.');
    }

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException('This account is not active.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches || !user.role.includes(loginDto.role)) {
      throw new UnauthorizedException('Invalid credentials or selected role.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.uid,
      email: user.email,
      role: loginDto.role,
    });

    await this.usersCollection.doc(user.uid).update({
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      accessToken,
      user: this.toSafeUser(user, loginDto.role),
    };
  }

  async getMe(userId: string): Promise<MeResponseDto> {
    const snapshot = await this.usersCollection.doc(userId).get();

    if (!snapshot.exists) {
      throw new NotFoundException('User not found.');
    }

    const user = snapshot.data() as UserDocument;

    return {
      user: this.toSafeUser(user),
    };
  }

  private async findUserByIdentifier(
    identifier: string,
  ): Promise<UserDocument | null> {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      throw new BadRequestException('Email or phone is required.');
    }

    if (trimmedIdentifier.includes('@')) {
      const snapshot = await this.usersCollection
        .where('emailLower', '==', this.normalizeEmail(trimmedIdentifier))
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserDocument;
      }

      const legacySnapshot = await this.usersCollection
        .where('email', '==', this.normalizeEmail(trimmedIdentifier))
        .limit(1)
        .get();

      return legacySnapshot.empty
        ? null
        : (legacySnapshot.docs[0].data() as UserDocument);
    }

    const normalizedPhone = this.normalizePhone(trimmedIdentifier);
    const snapshot = await this.usersCollection
      .where('phoneNormalized', '==', normalizedPhone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserDocument;
    }

    const legacySnapshot = await this.usersCollection
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get();

    return legacySnapshot.empty
      ? null
      : (legacySnapshot.docs[0].data() as UserDocument);
  }

  private toSafeUser(user: UserDocument, roleOverride?: UserRole): SafeUserDto {
    return {
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: roleOverride ?? user.role[0],
      kycStatus: user.kycStatus,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone: string): string {
    const raw = phone.trim();

    if (!raw) {
      throw new BadRequestException('Phone number is required.');
    }

    const digitsAndPlus = raw.replace(/[^\d+]/g, '');
    let normalized = digitsAndPlus;

    if (normalized.startsWith('+')) {
      normalized = `+${normalized.slice(1).replace(/\D/g, '')}`;
    } else {
      normalized = normalized.replace(/\D/g, '');

      if (normalized.startsWith('0')) {
        normalized = `+94${normalized.slice(1)}`;
      } else if (normalized.startsWith('94')) {
        normalized = `+${normalized}`;
      } else if (normalized.length === 9) {
        normalized = `+94${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    if (!/^\+\d{9,15}$/.test(normalized)) {
      throw new BadRequestException('Please provide a valid phone number.');
    }

    return normalized;
  }

  private async hasExistingEmail(emailLower: string): Promise<boolean> {
    const [normalizedSnapshot, legacySnapshot] = await Promise.all([
      this.usersCollection.where('emailLower', '==', emailLower).limit(1).get(),
      this.usersCollection.where('email', '==', emailLower).limit(1).get(),
    ]);

    return !normalizedSnapshot.empty || !legacySnapshot.empty;
  }

  private async hasExistingPhone(phoneNormalized: string): Promise<boolean> {
    const [normalizedSnapshot, legacySnapshot] = await Promise.all([
      this.usersCollection
        .where('phoneNormalized', '==', phoneNormalized)
        .limit(1)
        .get(),
      this.usersCollection.where('phone', '==', phoneNormalized).limit(1).get(),
    ]);

    return !normalizedSnapshot.empty || !legacySnapshot.empty;
  }
}
