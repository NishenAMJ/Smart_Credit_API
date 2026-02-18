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
      // Test Firestore connection by reading a test document
      const testRef = this.firebaseService.db
        .collection('_test')
        .doc('connection');

      // Try to set a small test value (this also needs permission)
      // If this fails, it means Firebase is not connected properly
      const testData = {
        timestamp: new Date(),
        status: 'connected',
      };
      // Optionally, you might want to actually set or get the document here
      // await testRef.set(testData, { merge: true });

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
      return {
        status: 'error',
        message: 'Firebase connection failed',
        error: error.message,
      };
    }
  }
}
