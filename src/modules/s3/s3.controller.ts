import { Body, Controller, Get, UseGuards } from '@nestjs/common';
import { S3Service } from './s3.service';
import { FileNameDto } from './s3.dto';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../user/current-user.middleware';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { MultiTokenGuard } from '../auth/guard/multi-token.guard';

// TODO: Add limit
@Controller('s3')
@UseGuards(MultiTokenGuard)
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
  @Get('/presigned/transporter/vehicle/pic')
  async getPresignedVehiclePicture(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle green sheet upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/vehicle/green-sheet')
  async getPresignedVehicleGreenSheet(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/green-sheet-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle card document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/vehicle/card')
  async getPresignedVehicleCard(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/transporter/${userId}/vehicle/card-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for package picture upload',
  })
  @AuthResponses()
  @Get('/presigned/sender/package')
  async getPresignedPackagePicture(
    @Body() body: FileNameDto,
    @CurrentUser('id') userId: string
  ) {
    const key = `/sender/${userId}/package/pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }
}
