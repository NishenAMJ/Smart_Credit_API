import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(FirebaseService.name);
  readonly app: App;
  readonly db: Firestore;

  constructor(private readonly configService: ConfigService) {
    this.app = getApps()[0] ?? initializeApp(this.buildOptions());
    this.db = getFirestore(this.app);
  }

  private buildOptions(): AppOptions {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const serviceAccountJson = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );

    if (serviceAccountJson) {
      this.logger.log(
        `Initializing Firebase with inline service account for project ${projectId ?? 'unknown'}.`,
      );
      return {
        credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
        ...(projectId ? { projectId } : {}),
      };
    }

    const explicitPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const serviceAccountPath =
      explicitPath ?? this.findServiceAccountFile();

    if (serviceAccountPath) {
      const candidatePaths = [
        resolve(process.cwd(), serviceAccountPath),
        resolve(process.cwd(), 'apps/backend', serviceAccountPath),
      ];
      const resolvedPath =
        candidatePaths.find((candidate) => existsSync(candidate)) ??
        candidatePaths[0];
      const fileContents = readFileSync(resolvedPath, 'utf8');
      this.logger.log(
        `Initializing Firebase with service account file ${resolvedPath}.`,
      );

      return {
        credential: cert(JSON.parse(fileContents) as ServiceAccount),
        ...(projectId ? { projectId } : {}),
      };
    }

    this.logger.log(
      `Initializing Firebase with application default credentials for project ${projectId ?? 'unknown'}.`,
    );
    return {
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    };
  }

  private findServiceAccountFile(): string | null {
    const candidateNames = [
      'firebase-service-account.json',
      'your-service-account-key.json',
      'service-account.json',
      'serviceAccountKey.json',
    ];
    const candidateDirs = [
      process.cwd(),
      resolve(process.cwd(), 'apps/backend'),
    ];

    for (const dir of candidateDirs) {
      for (const fileName of candidateNames) {
        const fullPath = resolve(dir, fileName);

        if (existsSync(fullPath)) {
          return fullPath;
        }
      }

      const adminSdkFile = readdirSync(dir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith('.json') &&
            entry.name.includes('firebase-adminsdk'),
        )
        .map((entry) => resolve(dir, entry.name))[0];

      if (adminSdkFile) {
        return adminSdkFile;
      }
    }

    return null;
  }
}
