import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { CreateBorrowerProfileDto } from './dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from './dto/update-profile.dto';
import { BorrowerProfileService } from './borrower-profile.service';

@Controller('borrower/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerProfileController {
  constructor(
    private readonly borrowerProfileService: BorrowerProfileService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Req() req: AuthenticatedRequest,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateBorrowerProfileDto,
  ) {
    return this.borrowerProfileService.createProfile({
      ...dto,
      userId: resolveAuthenticatedBorrowerId(req.user.sub, dto.userId),
    });
  }

  @Get(':userId')
  async getProfile(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.borrowerProfileService.getProfile(
      resolveAuthenticatedBorrowerId(req.user.sub, userId),
    );
  }

  @Put(':userId')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: UpdateBorrowerProfileDto,
  ) {
    return this.borrowerProfileService.updateProfile(
      resolveAuthenticatedBorrowerId(req.user.sub, userId),
      dto,
    );
  }
}
