import { Controller } from '@nestjs/common';
import { BorrowerService } from './borrower.service';

@Controller('borrower')
export class BorrowerController {
  constructor(private readonly borrowerService: BorrowerService) {}
}
