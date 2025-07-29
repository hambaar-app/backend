import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AddressService],
  controllers: [AddressController],
  exports: [AddressService]
})
export class AddressModule {}
