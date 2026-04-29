import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const loginMock = jest.fn();
  const authService = {
    register: jest.fn(),
    login: loginMock,
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService);
  });

  it('returns a health response for the mobile auth route', () => {
    expect(controller.ping()).toEqual({
      ok: true,
      message: 'mobile auth controller working',
    });
  });

  it('delegates login requests to the auth service', async () => {
    const dto = { identifier: 'borrower@example.com', password: 'secret123' };
    const response = { success: true, otpSessionId: 'otp_001' };

    loginMock.mockResolvedValue(response as never);

    await expect(controller.login(dto)).resolves.toBe(response);
    expect(loginMock).toHaveBeenCalledWith(dto);
  });
});
