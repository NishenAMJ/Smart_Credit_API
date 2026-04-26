import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import Twilio from 'twilio';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import type { User } from '../admin/interfaces/user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

type OtpSession = {
  purpose: 'login' | 'register';
  contact: string;
  otpCode: string;
  userId?: string;
  registrationPayload?: Omit<RegisterDto, 'password'> & { passwordHash: string };
  expiresAt: Timestamp;
  consumedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  private normalizeIdentifier(value: string) {
    return value.trim().toLowerCase();
  }

  private generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private buildOtpExpiry() {
    return Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
  }

  private maskContact(contact: string) {
    if (contact.includes('@')) {
      const [name, domain] = contact.split('@');
      const visible = name.slice(0, 2);
      return `${visible}${'*'.repeat(Math.max(0, name.length - 2))}@${domain}`;
    }

    return `${contact.slice(0, 3)}${'*'.repeat(Math.max(0, contact.length - 5))}${contact.slice(-2)}`;
  }

  private async sendOtp(contact: string, otpCode: string) {
    if (contact.includes('@')) {
      return this.sendOtpByEmail(contact, otpCode);
    }

    return this.sendOtpBySms(contact, otpCode);
  }

  private async sendOtpByEmail(email: string, otpCode: string) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('OTP_FROM_EMAIL') ?? user;

    if (!host || !user || !pass || !from) {
      console.warn(`SMTP is not configured. OTP for ${email}: ${otpCode}`);
      return { channel: 'console', contact: email };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your Smart Credit+ OTP Code',
      text: `Your OTP code is ${otpCode}. It will expire in 5 minutes.`,
      html: `<p>Your Smart Credit+ OTP code is <strong>${otpCode}</strong>.</p><p>It will expire in 5 minutes.</p>`,
    });

    return { channel: 'email', contact: email };
  }

  private async sendOtpBySms(phoneNumber: string, otpCode: string) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.warn(`Twilio is not configured. OTP for ${phoneNumber}: ${otpCode}`);
      return { channel: 'console', contact: phoneNumber };
    }

    const client = Twilio(accountSid, authToken);
    await client.messages.create({
      to: phoneNumber,
      from: fromNumber,
      body: `Your Smart Credit+ OTP code is ${otpCode}. It expires in 5 minutes.`,
    });

    return { channel: 'sms', contact: phoneNumber };
  }

  private async createOtpSession(session: OtpSession) {
    const sessionRef = this.db.collection('authOtpSessions').doc();
    const delivery = await this.sendOtp(session.contact, session.otpCode);

    await sessionRef.set({
      ...session,
      deliveryChannel: delivery.channel,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      otpSessionId: sessionRef.id,
      success: true,
      purpose: session.purpose,
      contact: this.maskContact(session.contact),
      deliveryChannel: delivery.channel,
      demoOtpCode: delivery.channel === 'console' ? session.otpCode : undefined,
    };
  }

  private async getUserByIdentifier(identifier: string) {
    const normalized = this.normalizeIdentifier(identifier);
    const usersRef = this.db.collection('users');

    const emailSnapshot = await usersRef
      .where('email', '==', normalized)
      .limit(1)
      .get();

    if (!emailSnapshot.empty) {
      const doc = emailSnapshot.docs[0];
      return { ...(doc.data() as User), id: doc.id };
    }

    const phoneSnapshot = await usersRef
      .where('phone', '==', identifier.trim())
      .limit(1)
      .get();

    if (!phoneSnapshot.empty) {
      const doc = phoneSnapshot.docs[0];
      return { ...(doc.data() as User), id: doc.id };
    }

    return null;
  }

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.getUserByIdentifier(dto.email);
      if (existingUser) {
        throw new ConflictException('An account with this email already exists');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      return this.createOtpSession({
        purpose: 'register',
        contact: dto.phoneNumber || dto.email,
        otpCode: this.generateOtpCode(),
        registrationPayload: {
          role: dto.role,
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber.trim(),
          nic: dto.nic.trim(),
          birthDate: dto.birthDate.trim(),
          passwordHash,
        },
        expiresAt: this.buildOtpExpiry(),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error?.status) throw error;
      rethrowFirebaseError(error, 'Failed to start registration');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.getUserByIdentifier(dto.identifier);
      if (!user) {
        throw new NotFoundException('No user found for that email or phone number');
      }

      if (!user.passwordHash) {
        throw new UnauthorizedException('Password is not set for this account');
      }

      const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.createOtpSession({
        purpose: 'login',
        contact: dto.identifier,
        otpCode: this.generateOtpCode(),
        userId: user.id,
        expiresAt: this.buildOtpExpiry(),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error?.status) throw error;
      rethrowFirebaseError(error, 'Failed to start login');
    }
  }

  async resendOtp(otpSessionId: string) {
    try {
      const sessionRef = this.db.collection('authOtpSessions').doc(otpSessionId);
      const sessionSnapshot = await sessionRef.get();

      if (!sessionSnapshot.exists) {
        throw new NotFoundException('OTP session not found');
      }

      const session = sessionSnapshot.data() as OtpSession;
      const freshCode = this.generateOtpCode();

      return this.createOtpSession({
        ...session,
        otpCode: freshCode,
        expiresAt: this.buildOtpExpiry(),
        consumedAt: undefined,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error?.status) throw error;
      rethrowFirebaseError(error, 'Failed to resend OTP');
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    try {
      if (!dto.otpSessionId) {
        throw new BadRequestException('otpSessionId is required');
      }

      const sessionRef = this.db.collection('authOtpSessions').doc(dto.otpSessionId);
      const sessionSnapshot = await sessionRef.get();

      if (!sessionSnapshot.exists) {
        throw new NotFoundException('OTP session not found');
      }

      const session = sessionSnapshot.data() as OtpSession;
      if (!session) {
        throw new NotFoundException('OTP session data not found');
      }

      if (session.purpose !== dto.purpose) {
        throw new BadRequestException('OTP purpose mismatch');
      }

      if (session.otpCode !== dto.otpCode) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      if (session.expiresAt.toDate().getTime() < Date.now()) {
        throw new UnauthorizedException('OTP code has expired');
      }

      await sessionRef.update({ consumedAt: FieldValue.serverTimestamp() });

      if (dto.purpose === 'login') {
        if (!session.userId) {
          throw new BadRequestException('Login session is missing user information');
        }

        const userRef = this.db.collection('users').doc(session.userId);
        const userSnapshot = await userRef.get();
        if (!userSnapshot.exists) {
          throw new NotFoundException('User not found');
        }

        const user = userSnapshot.data() as User;
        const accessToken = await this.jwtService.signAsync({
          uid: session.userId,
          email: user.email,
          role: Array.isArray(user.role) ? user.role[0] : user.role,
        });

        return {
          success: true,
          accessToken,
          userId: session.userId,
          role: Array.isArray(user.role) ? user.role[0] : user.role,
          kycStatus: user.kycStatus ?? 'pending',
        };
      }

      return {
        success: true,
        otpVerified: true,
        registrationPayload: session.registrationPayload,
      };
    } catch (error) {
      if (error?.status) throw error;
      rethrowFirebaseError(error, 'Failed to verify OTP');
    }
  }
}
