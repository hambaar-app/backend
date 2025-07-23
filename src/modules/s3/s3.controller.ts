import { Body, Controller, Post } from '@nestjs/common';
import { S3Service } from './s3.service';
import { TransporterPictureDto, VehiclePictureDto } from './s3.dto';

@Controller('s3')
export class S3Controller {
  constructor(private s3Service: S3Service) {}

  @Post('/presigned/transporter/profile-pic')
  async getPresignedTransporterProfilePic(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/profile-pic-${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }

  @Post('/presigned/transporter/national-id')
  async getPresignedTransporterNationalId(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/national-id-${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }

  @Post('/presigned/transporter/license')
  async getPresignedTransporterLicense(@Body() body: TransporterPictureDto) {
    const key = `/transporter/${body.transporterId}/license-${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }

  @Post('/presigned/transporter/vehicle/pic')
  async getPresignedVehiclePicture(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/pic-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }

  @Post('/presigned/transporter/vehicle/green-sheet')
  async getPresignedVehicleGreenSheet(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/green-sheet-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }
  
  @Post('/presigned/transporter/vehicle/card')
  async getPresignedVehicleCard(@Body() body: VehiclePictureDto) {
    const key = `/transporter/${body.transporterId}/vehicle/card-${body.vehicleId}/${body.fileName}`;
    const url = await this.s3Service.generateGetPresignedUrl(key);
    return { key, url };
  }
}
