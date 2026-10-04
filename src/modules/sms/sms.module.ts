import { Module } from '@nestjs/common';
import { SmsAdapter } from '../../infra/sms/sms.adapter';
import { PORTS } from '../../infra/ports/ports.tokens';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [{ provide: PORTS.SMS, useClass: SmsAdapter }],
  exports: [PORTS.SMS],
})
export class SmsModule {}
