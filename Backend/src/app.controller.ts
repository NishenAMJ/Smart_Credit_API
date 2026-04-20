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

      // Try to read the test document to verify connection
      const doc = await testRef.get();

      return {
        status: 'ok',
        message: 'Firebase is connected and ready',
        firebaseApp: {
          name: this.firebaseApp.name,
          projectId: this.firebaseApp.options.projectId,
        },
        testDocExists: doc.exists,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        message: 'Firebase connection failed',
        error: errorMessage,
      };
    }
  }
}
