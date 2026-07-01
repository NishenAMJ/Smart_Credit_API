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
import { BorrowerService } from './borrower.service';
import { CreateBorrowerProfileDto } from './dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from './dto/update-profile.dto';

@Controller('borrower')
export class BorrowerController {
  constructor(private readonly borrowerService: BorrowerService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() dto: CreateBorrowerProfileDto) {
    return this.borrowerService.createProfile(dto);
  }

  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.borrowerService.getProfile(userId);
  }

  @Put('profile/:userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateBorrowerProfileDto,
  ) {
    return this.borrowerService.updateProfile(userId, dto);
  }
}
