import { BorrowerProfileService } from './borrower-profile.service';

describe('BorrowerProfileService', () => {
  let borrowerService: {
    createProfile: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
  };
  let service: BorrowerProfileService;

  beforeEach(() => {
    borrowerService = {
      createProfile: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };
    service = new BorrowerProfileService(borrowerService as any);
  });

  it('should delegate profile lookup', () => {
    borrowerService.getProfile.mockReturnValueOnce({ userId: 'borrower-1' });

    expect(service.getProfile('borrower-1')).toEqual({ userId: 'borrower-1' });
    expect(borrowerService.getProfile).toHaveBeenCalledWith('borrower-1');
  });

  it('should delegate profile update', () => {
    borrowerService.updateProfile.mockReturnValueOnce({ userId: 'borrower-1' });

    expect(service.updateProfile('borrower-1', { fullName: 'Jane' } as any)).toEqual({
      userId: 'borrower-1',
    });
    expect(borrowerService.updateProfile).toHaveBeenCalledWith(
      'borrower-1',
      expect.objectContaining({ fullName: 'Jane' }),
    );
  });
});

