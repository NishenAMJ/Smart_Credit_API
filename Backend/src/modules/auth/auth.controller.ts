import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() payload: { email?: string; password?: string }) {
    return {
      success: true,
      data: {
        token: 'dev-token',
        user: {
          id: 'borrower_001',
          email: payload.email ?? 'borrower1@example.com',
          role: 'borrower',
        },
      },
    };
  }

  @Get('me')
  async me() {
    return {
      success: true,
      data: {
        id: 'borrower_001',
        email: 'borrower1@example.com',
        role: 'borrower',
      },
    };
  }
}
