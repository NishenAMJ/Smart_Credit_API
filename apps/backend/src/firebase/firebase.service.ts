import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  AppOptions,
  ServiceAccount,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  readonly app: App;
  readonly db: Firestore;

  constructor(private readonly configService: ConfigService) {
    this.app = getApps()[0] ?? initializeApp(this.buildOptions());
    this.db = getFirestore(this.app);
  }

  private buildOptions(): AppOptions {
    const serviceAccountJson = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );

    if (serviceAccountJson) {
      return {
        credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
      };
    }

    const serviceAccountPath = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_PATH',
    );

    if (serviceAccountPath) {
      const candidatePaths = [
        resolve(process.cwd(), serviceAccountPath),
        resolve(process.cwd(), 'apps/backend', serviceAccountPath),
      ];
      const resolvedPath =
        candidatePaths.find((candidate) => existsSync(candidate)) ??
        candidatePaths[0];
      const fileContents = readFileSync(resolvedPath, 'utf8');

      return {
        credential: cert(JSON.parse(fileContents) as ServiceAccount),
      };
    }

    return {
      credential: applicationDefault(),
    };
  }
}
