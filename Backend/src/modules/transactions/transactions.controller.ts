import { Controller, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AdminJwtGuard } from '../admin/admin-auth/guards/admin-jwt.guard';
import { TransactionsService } from './transactions.service';

@Controller('admin/transactions')
@UseGuards(AdminJwtGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactions(@Query('limit') limit?: string) {
    return this.transactionsService.getTransactions(this.parseLimit(limit));
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
