import { Test, TestingModule } from '@nestjs/testing';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    getMe: jest.Mock;
    getSessionStatus: jest.Mock;
    getDashboard: jest.Mock;
    getAdminDashboard: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      getMe: jest.fn(),
      getSessionStatus: jest.fn(),
      getDashboard: jest.fn(),
      getAdminDashboard: jest.fn(),
    };

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

  it('delegates register requests to the auth service', async () => {
    authService.register.mockResolvedValue({ message: 'ok' });
    const payload = {
      fullName: 'Nimal Perera',
      email: 'nimal@example.com',
      phone: '0771234567',
      password: 'SmartPass123',
      role: 'borrower',
    };

    await controller.register(payload);

    expect(authService.register).toHaveBeenCalledWith(payload);
  });

  it('delegates login requests to the auth service', async () => {
    authService.login.mockResolvedValue({ accessToken: 'jwt' });
    const payload = {
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
    };

    await controller.login(payload);

    expect(authService.login).toHaveBeenCalledWith(payload);
  });

  it('uses the authenticated request payload for session and profile endpoints', async () => {
    const req = {
      user: {
        sub: 'user-1',
        email: 'nimal@example.com',
        role: 'lender',
      },
    } as AuthenticatedRequest;

    await controller.me(req);
    await controller.session(req);
    await controller.dashboard(req);
    await controller.lenderDashboard(req);

    expect(authService.getMe).toHaveBeenCalledWith('user-1');
    expect(authService.getSessionStatus).toHaveBeenCalledWith('user-1', 'lender');
    expect(authService.getDashboard).toHaveBeenNthCalledWith(1, 'user-1', 'lender');
    expect(authService.getDashboard).toHaveBeenNthCalledWith(2, 'user-1', 'lender');
  });

  it('forces borrower and admin role-specific endpoints to call the matching service methods', async () => {
    const borrowerReq = {
      user: {
        sub: 'borrower-1',
        email: 'borrower@example.com',
        role: 'borrower',
      },
    } as AuthenticatedRequest;
    const adminReq = {
      user: {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    } as AuthenticatedRequest;

    await controller.borrowerDashboard(borrowerReq);
    await controller.adminDashboard(adminReq);

    expect(authService.getDashboard).toHaveBeenCalledWith('borrower-1', 'borrower');
    expect(authService.getAdminDashboard).toHaveBeenCalledWith('admin-1');
  });
});
