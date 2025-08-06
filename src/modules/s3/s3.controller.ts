import { Body, Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { S3Service } from './s3.service';
import { FileNameDto } from './s3.dto';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../user/current-user.middleware';
import { CheckOwnership } from '../auth/auth.decorators';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { MultiTokenGuard } from '../auth/guard/multi-token.guard';

// TODO: Add limit
@Controller('s3')
@UseGuards(MultiTokenGuard, OwnershipGuard)
export class S3Controller {
  constructor(private s3Service: S3Service) {}

  @ApiOperation({
    summary: 'Generate presigned URL for transporter profile picture upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/profile-pic')
  async getPresignedTransporterProfilePic(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/profile-pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for transporter national id document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/national-id')
  async getPresignedTransporterNationalId(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/national-id-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for transporter driver’s license document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/license')
  async getPresignedTransporterLicense(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/license-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle picture upload',
  })
  @AuthResponses()
  @CheckOwnership({
    entity: 'vehicle'
  })
  @Get('/presigned/transporter/vehicle/:id/pic')
  async getPresignedVehiclePicture(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/${vehicleId}/pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle green sheet upload',
  })
  @AuthResponses()
  @CheckOwnership({
    entity: 'vehicle'
  })
  @Get('/presigned/transporter/vehicle/:id/green-sheet')
  async getPresignedVehicleGreenSheet(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/${vehicleId}/green-sheet-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle card document upload',
  })
  @AuthResponses()
  @CheckOwnership({
    entity: 'vehicle'
  })
  @Get('/presigned/transporter/vehicle/:id/card')
  async getPresignedVehicleCard(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/${vehicleId}/card-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for package picture upload',
  })
  @AuthResponses()
  @CheckOwnership({
    entity: 'package'
  })
  @Get('/presigned/sender/package/:id')
  async getPresignedPackagePicture(
    @Param('id', ParseUUIDPipe) packageId: string,
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/sender/${userId}/package/${packageId}/pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }
}
