import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  MeResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest): Promise<MeResponseDto> {
    return this.authService.getMe(req.user.sub);
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@Req() req: AuthenticatedRequest): Promise<SessionResponseDto> {
    return this.authService.getSessionStatus(req.user.sub, req.user.role);
  }

  // Updates the authenticated user's password hash in Firestore after validating the current password.
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower', 'lender')
  async dashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardResponseDto> {
    return this.authService.getDashboard(req.user.sub, req.user.role);
  }

  @Get('borrower/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async borrowerDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardResponseDto> {
    return this.authService.getDashboard(req.user.sub, 'borrower');
  }

  @Get('lender/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  async lenderDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardResponseDto> {
    return this.authService.getDashboard(req.user.sub, 'lender');
  }

  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardResponseDto> {
    return this.authService.getAdminDashboard(req.user.sub);
  }
}
