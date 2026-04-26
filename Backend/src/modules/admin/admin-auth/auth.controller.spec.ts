import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    adminLogin: jest.fn(),
    adminSignup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards admin signup requests to the auth service', async () => {
    authService.adminSignup.mockResolvedValue({ accessToken: 'token' });

    const dto = {
      firstName: 'Sarah',
      lastName: 'Admin',
      email: 'sarah.admin@example.com',
      phone: '+94 77 123 4567',
      department: 'Compliance',
      adminRole: 'Super Admin',
      password: 'Password123!',
    };

    await controller.adminSignup(dto);

    expect(authService.adminSignup).toHaveBeenCalledWith(dto);
  });
});
