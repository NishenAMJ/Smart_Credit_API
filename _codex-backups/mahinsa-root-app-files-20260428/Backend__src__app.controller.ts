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

  @Get('firebase-status')
  async getFirebaseStatus() {
    try {
      // Read-only connectivity probe: no writes, no side effects.
      await this.firebaseService.db
        .collection('_healthcheck')
        .doc('ping')
        .get();

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'error',
        message: 'Firebase connection failed',
        error: errorMessage,
      };
    }
  }
}
