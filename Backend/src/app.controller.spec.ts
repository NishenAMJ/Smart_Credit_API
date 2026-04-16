import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: FirebaseService,
          useValue: { db: {} },
        },
        {
          provide: 'FIREBASE_APP',
          useValue: {
            name: 'test-app',
            options: { projectId: 'test-project' },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "hi"', () => {
      expect(appController.getHello()).toBe('hi');
    });
  });
});
