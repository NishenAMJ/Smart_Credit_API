import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Provides a lightweight endpoint for checking that the auth module is reachable.
  @Get('ping')
  ping() {
    return { ok: true, message: 'auth controller working' };
  }

  // Authenticates an admin and returns a JWT for protected routes.
  @Post('admin/login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }
}
