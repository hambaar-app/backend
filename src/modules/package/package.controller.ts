import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RecipientResponseDto } from './dto/recipient-response.dto';
import { Serialize } from 'src/common/serialize.interceptor';
import { CreatePackageDto } from './dto/create-package.dto';
import {
  PackageCompactResponseDto,
  PackageResponseDto,
} from './dto/package-response.dto';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { CheckOwnership } from '../auth/auth.decorators';
import { ApiQuerySearch, AuthResponses, CrudResponses, ValidationResponses } from 'src/common/api-docs.decorators';
import { UpdatePackageDto } from './dto/update.package.dto';
import { CurrentUser } from '../user/current-user.middleware';
import { PackageFilterQueryDto } from './dto/package-filter-query.dto';

@Controller('packages')
export class PackageController {
  constructor(private packageService: PackageService) {}

  @ApiOperation({
    summary: 'Create a new recipient',
    description: `This endpoint creates a new recipient. If \`isHighlighted\` is set to \`true\`,
      the recipient will be highlighted and displayed in the response of the \`GET /packages/recipients\` endpoint.
      Note that recipients cannot be edited or deleted.`,
  })
  @ApiCreatedResponse({
    type: RecipientResponseDto,
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(RecipientResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('recipients')
  async createPackageRecipient(
    @Body() body: CreateRecipientDto,
    @CurrentUser('id') id: string,
  ) {
    return this.packageService.createRecipient(id, body);
  }

  @ApiOperation({
    summary: 'Retrieves all highlighted recipients',
  })
  @ApiOkResponse({
    type: [RecipientResponseDto],
  })
  @ApiQuerySearch()
  @AuthResponses()
  @Serialize(RecipientResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get('recipients')
  async getAllRecipients(
    @CurrentUser('id') id: string,
    @Query('search') search?: string
  ) {
    return this.packageService.getAllRecipients(id, search);
  }

  @ApiOperation({
    summary: 'Create a new package',
    description: `This endpoint creates a new package. The \`originAddressId\` must be a valid address Id
      created via \`POST /addresses\` or obtained from the old addresses retrieved via \`GET /addresses\`.
      Recipients can be included by providing recipient Ids created via \`POST /packages/recipients\`
      or retrieved from \`GET /packages/recipients\`.`,
  })
  @ApiOkResponse({
    type: [PackageResponseDto],
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(PackageResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createPackage(
    @Body() body: CreatePackageDto,
    @CurrentUser('id') id: string,
  ) {
    return this.packageService.create(id, body);
  }

  @ApiOperation({
    summary: 'Retrieves all user packages',
  })
  @AuthResponses()
  @ApiOkResponse({
    type: [PackageResponseDto],
  })
  @AuthResponses()
  @Serialize(PackageResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllPackages(
    @Query() query: PackageFilterQueryDto,
    @CurrentUser('id') id: string,
  ) {
    return this.packageService.getAll(id, query.status, query.page, query.limit);
  }

  @ApiOperation({
    summary: 'Retrieves a package by its id',
  })
  @ApiCreatedResponse({
    type: PackageResponseDto,
  })
  @AuthResponses()
  @CrudResponses()
  @Serialize(PackageResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'package',
  })
  @Get(':id')
  async getPackageById(@Param('id', ParseUUIDPipe) id: string) {
    return this.packageService.getById(id);
  }

  @ApiOperation({
    summary: 'Update a package by its id',
    description: `Updates specific properties of an existing package identified by its id. 
    Partial updates are supported, but modifications are only allowed if the package has not been matched yet.
    Pictures key will be override, if included.`,
  })
  @ApiCreatedResponse({
    type: PackageCompactResponseDto,
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(PackageCompactResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'package',
  })
  @Patch(':id')
  async updatePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePackageDto,
  ) {
    return this.packageService.update(id, body);
  }

  @ApiOperation({
    summary: 'Delete a package by its id',
    description: `Deletion are only allowed if the package has not been matched yet.`,
  })
  @ApiCreatedResponse({
    type: PackageCompactResponseDto,
  })
  @AuthResponses()
  @CrudResponses()
  @Serialize(PackageCompactResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'package',
  })
  @Delete(':id')
  async deletePackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packageService.delete(id);
  }
}
