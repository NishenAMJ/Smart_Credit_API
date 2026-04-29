import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class LenderService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private isLenderRole(roleValue: unknown): boolean {
    if (Array.isArray(roleValue)) {
      return roleValue.includes('lender');
    }

    return roleValue === 'lender';
  }

  async getLenderById(lenderId: string) {
    const doc = await this.firebaseService.db
      .collection('users')
      .doc(lenderId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Lender not found: ${lenderId}`);
    }

    const userData = doc.data();
    if (!this.isLenderRole(userData?.role)) {
      throw new BadRequestException('User is not a lender');
    }

    return userData;
  }

  async getAllLenders() {
    const [arrayRoleSnapshot, stringRoleSnapshot] = await Promise.all([
      this.firebaseService.db
        .collection('users')
        .where('role', 'array-contains', 'lender')
        .get(),
      this.firebaseService.db
        .collection('users')
        .where('role', '==', 'lender')
        .get(),
    ]);

    const lenderMap = new Map<string, any>();

    for (const doc of [...arrayRoleSnapshot.docs, ...stringRoleSnapshot.docs]) {
      lenderMap.set(doc.id, { id: doc.id, ...doc.data() });
    }

    return Array.from(lenderMap.values());
  }
}
