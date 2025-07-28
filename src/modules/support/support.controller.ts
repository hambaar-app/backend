import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { SupportService } from './support.service';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { UpdateVerificationDto } from './dto/update-verification.dto';

@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @ApiOperation({
    summary: 'Update a verification status by its id',
    description: 'Just for Admin and Support users (But it hasn\'t implemented yet.)'
  })
  @Patch('verification/:id')
  updateVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVerificationDto
  ) {
    return this.supportService.updateVerification(id, body);
  }

  @ApiOperation({
    summary: 'Update a transporter verification status by its userId',
    description: 'Just for Admin and Support users (But it hasn\'t implemented yet.)'
  })
  @Patch('verification/transporters/:id')
  updateTransporterVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVerificationDto
  ) {
    return this.supportService.updateTransporterVerification(id, body);
  }
}
