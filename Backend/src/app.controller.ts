import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';
import { app } from 'firebase-admin';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
    @Inject('FIREBASE_APP') private firebaseApp: app.App,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('firebase-status')
  async getFirebaseStatus() {
    try {
      await this.firebaseService.db.collection('_test').doc('connection').get();

      return {
        status: 'ok',
        message: 'Firebase is connected and ready',
        firebaseApp: {
          name: this.firebaseApp.name,
          projectId: this.firebaseApp.options.projectId,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Firebase error';

      return {
        status: 'error',
        message: 'Firebase connection failed',
        error: message,
      };
    }
  }
}
