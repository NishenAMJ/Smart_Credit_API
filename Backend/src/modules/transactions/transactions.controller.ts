import { Controller, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TransactionsService } from './transactions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactions(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.transactionsService.getTransactions(
      this.parseLimit(limit),
      cursor,
    );
  }

  @Sse('stream')
  streamTransactions(@Query('limit') limit?: string): Observable<{
    data: Awaited<ReturnType<TransactionsService['getTransactions']>>;
  }> {
    return this.transactionsService.streamTransactions(this.parseLimit(limit));
  }

  private parseLimit(value?: string): number {
    const limit = Number(value ?? 100);

    if (!Number.isFinite(limit)) {
      return 100;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), 250);
  }
}
