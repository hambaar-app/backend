import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { S3Service } from './s3.service';
import { PackagePictureDto, TransporterPictureDto, VehiclePictureDto } from './s3.dto';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../user/current-user.middleware';

// TODO: Add limit
@UseGuards(AccessTokenGuard)
@Controller('s3')
export class S3Controller {
  constructor(private s3Service: S3Service) {}

  @ApiOperation({
    summary: 'Generate presigned URL for transporter profile picture upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/profile-pic')
  async getPresignedTransporterProfilePic(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/profile-pic-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for transporter national id document upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/national-id')
  async getPresignedTransporterNationalId(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/national-id-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for transporter driver’s license document upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/license')
  async getPresignedTransporterLicense(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/license-${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle picture upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/vehicle/pic')
  async getPresignedVehiclePicture(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/pic-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle green sheet upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/vehicle/green-sheet')
  async getPresignedVehicleGreenSheet(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/green-sheet-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle card document upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/vehicle/card')
  async getPresignedVehicleCard(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/card-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for package picture upload',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/presigned/transporter/vehicle/card')
  async getPresignedPackagePicture(
    @Body() body: PackagePictureDto,
    @CurrentUser('id') id: string
  ) {
    const key = `/sender/${id}/package/${body.packageId}/${body.fileName}`;
    const url = await this.s3Service.generatePutPresignedUrl(key);
    return { key, url };
  }
}
