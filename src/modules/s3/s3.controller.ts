import {
  Query,
  Controller,
  Get,
  UseGuards,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PORTS } from '../../infra/ports/ports.tokens';
import { StoragePort } from '../../infra/ports/ports';
import { ConfigKey } from '../../common/config/config-names';
import { PresignUploadDto } from './s3.dto';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../user/current-user.middleware';
import { AuthResponses } from '../../common/api-docs.decorators';
import { MultiTokenGuard } from '../auth/guard/multi-token.guard';

/** Default per-file upload cap (MB) when `MAX_UPLOAD_SIZE_MB` is unset. */
const DEFAULT_MAX_UPLOAD_SIZE_MB = 10;
const BYTES_PER_MB = 1024 * 1024;

// TODO: Cryptographic upload enforcement (presigned Content-Length condition)
@Controller('s3')
@UseGuards(MultiTokenGuard)
export class S3Controller {
  private readonly maxUploadBytes: number;

  constructor(
    @Inject(PORTS.STORAGE) private storage: StoragePort,
    config: ConfigService,
  ) {
    this.maxUploadBytes =
      config.get<number>(
        ConfigKey.Upload.MaxSizeMb,
        DEFAULT_MAX_UPLOAD_SIZE_MB,
      ) * BYTES_PER_MB;
  }

  private assertUploadSize(size?: number) {
    if (size !== undefined && size > this.maxUploadBytes) {
      throw new BadRequestException(
        `Upload size exceeds the maximum allowed size of ${this.maxUploadBytes / BYTES_PER_MB} MB.`,
      );
    }
  }

  @ApiOperation({
    summary: 'Generate presigned URL for transporter profile picture upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/profile-pic')
  async getPresignedTransporterProfilePic(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/profile-pic-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary:
      'Generate presigned URL for transporter national id document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/national-id')
  async getPresignedTransporterNationalId(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/national-id-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary:
      'Generate presigned URL for transporter driver’s license document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/license')
  async getPresignedTransporterLicense(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/license-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle picture upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/vehicle/pic')
  async getPresignedVehiclePicture(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/vehicle/pic-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle green sheet upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/vehicle/green-sheet')
  async getPresignedVehicleGreenSheet(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/vehicle/green-sheet-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for vehicle card document upload',
  })
  @AuthResponses()
  @Get('/presigned/transporter/vehicle/card')
  async getPresignedVehicleCard(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `transporter/${userId}/vehicle/card-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }

  @ApiOperation({
    summary: 'Generate presigned URL for package picture upload',
  })
  @AuthResponses()
  @Get('/presigned/sender/package')
  async getPresignedPackagePicture(
    @Query() query: PresignUploadDto,
    @CurrentUser('id') userId: string,
  ) {
    this.assertUploadSize(query.size);
    const key = `sender/${userId}/package/pic-${query.fileName}`;
    const url = await this.storage.generatePutPresignedUrl(key);
    return { key, url };
  }
}
