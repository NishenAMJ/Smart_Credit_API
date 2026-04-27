import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

describe('AppController', () => {
  let appController: AppController;

  // 1. Mock the Firestore methods
  const mockSet = jest.fn();
  const mockGet = jest.fn();
  const mockDoc = jest.fn().mockReturnValue({ set: mockSet, get: mockGet });
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

  const mockFirebaseService = {
    db: { collection: mockCollection },
  };

  // 2. Mock the Firebase App Injection
  const mockFirebaseApp = {
    name: '[DEFAULT]',
    options: { projectId: 'test-project-id' },
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {}, // We don't use AppService in the controller right now
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: 'FIREBASE_APP',
          useValue: mockFirebaseApp,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFirebaseStatus', () => {
    it('should return ok when Firebase connects successfully', async () => {
      // Arrange: Pretend the database write/read worked perfectly
      mockSet.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce({ exists: true });

      // Act
      const result = await appController.getFirebaseStatus();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Firebase is connected and ready');
      expect(result.firebaseApp?.projectId).toBe('test-project-id');
      
      // Verify we actually tried to ping the database
      expect(mockCollection).toHaveBeenCalledWith('_test');
      expect(mockDoc).toHaveBeenCalledWith('connection');
    });

    it('should return error when Firebase connection fails', async () => {
      // Arrange: Force the database to throw an error
      mockSet.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await appController.getFirebaseStatus();

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Firebase connection failed');
      expect(result.error).toBe('Network error');
    });
  });
});
