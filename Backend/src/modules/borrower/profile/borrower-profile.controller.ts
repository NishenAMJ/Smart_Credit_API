import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateBorrowerProfileDto } from './dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from './dto/update-profile.dto';
import { BorrowerProfileService } from './borrower-profile.service';

@Controller('borrower/profile')
export class BorrowerProfileController {
  constructor(private readonly borrowerProfileService: BorrowerProfileService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() dto: CreateBorrowerProfileDto) {
    return this.borrowerProfileService.createProfile(dto);
  }

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    return this.borrowerProfileService.getProfile(userId);
  }

  @Put(':userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateBorrowerProfileDto,
  ) {
    return this.borrowerProfileService.updateProfile(userId, dto);
  }
}

