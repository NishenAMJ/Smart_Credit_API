import { Global, Module } from '@nestjs/common';
import { AdminQueryCacheService } from './admin-query-cache.service';

@Global()
@Module({
  providers: [AdminQueryCacheService],
  exports: [AdminQueryCacheService],
})
export class AdminQueryCacheModule {}
