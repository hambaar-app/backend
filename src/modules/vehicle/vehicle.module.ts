import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService]
})
export class VehicleModule {}
