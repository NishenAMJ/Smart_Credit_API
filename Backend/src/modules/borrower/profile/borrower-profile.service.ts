import { Injectable } from '@nestjs/common';
import { CreateBorrowerProfileDto } from '../dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from '../dto/update-profile.dto';
import { BorrowerService } from '../borrower.service';

@Injectable()
export class BorrowerProfileService {
  constructor(private readonly borrowerService: BorrowerService) {}

  createProfile(dto: CreateBorrowerProfileDto) {
    return this.borrowerService.createProfile(dto);
  }

  getProfile(userId: string) {
    return this.borrowerService.getProfile(userId);
  }

  updateProfile(userId: string, dto: UpdateBorrowerProfileDto) {
    return this.borrowerService.updateProfile(userId, dto);
  }
}
