import { Module } from '@nestjs/common';
import { AdvertisementController }       from './advertisement.controller';
import { AdvertisementCreateService }    from './services/advertisement-create.service';
import { AdvertisementReadService }      from './services/advertisement-read.service';
import { AdvertisementUpdateService }    from './services/advertisement-update.service';
import { AdvertisementDeleteService }    from './services/advertisement-delete.service';
import { AdvertisementBoostService }     from './services/advertisement-boost.service';
import { AdvertisementAnalyticsService }    from './services/advertisement-analytics.service';


@Module({
  controllers: [AdvertisementController],
  providers: [
    AdvertisementCreateService,
    AdvertisementReadService,
    AdvertisementUpdateService,
    AdvertisementDeleteService,
    AdvertisementBoostService,
    AdvertisementAnalyticsService
  ],
  // Export services so other modules can use them
  exports: [
    AdvertisementReadService,
    AdvertisementCreateService,
  ],
})
export class AdvertisementModule {}