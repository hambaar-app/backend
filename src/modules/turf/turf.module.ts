import { Module } from '@nestjs/common';
import { TurfService } from './turf.service';
import { TurfProvider } from './turf.provider';

@Module({
  providers: [
    TurfProvider,
    TurfService
  ]
})
export class TurfModule {}
