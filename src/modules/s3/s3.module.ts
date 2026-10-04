import { Module } from '@nestjs/common';
import { S3StorageAdapter } from '../../infra/storage/s3-storage.adapter';
import { PORTS } from '../../infra/ports/ports.tokens';
import { S3Controller } from './s3.controller';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [TokenModule],
  providers: [{ provide: PORTS.STORAGE, useClass: S3StorageAdapter }],
  controllers: [S3Controller],
  exports: [PORTS.STORAGE],
})
export class S3Module {}
