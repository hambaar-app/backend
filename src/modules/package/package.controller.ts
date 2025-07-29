import { Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PackageService } from './package.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { Request } from 'express';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { RecipientResponseDto } from './dto/recipient-response.dto';
import { Serialize } from 'src/common/serialize.interceptor';
import { CreatePackageDto } from './dto/create-package.dto';
import { PackageCompactPlusResponseDto, PackageCompactResponseDto, PackageResponseDto } from './dto/package-response.dto';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { CheckOwnership } from '../auth/ownership.decorator';
import { ApiQueryPagination } from 'src/common/query.decorator';

@Controller('package')
export class PackageController {
  constructor(private packageService: PackageService) {}

  @ApiOperation({
    summary: 'Create a new recipient',
    description: `This endpoint creates a new recipient. If \`isHighlighted\` is set to \`true\`,
      the recipient will be highlighted and displayed in the response of the \`GET /packages/recipients\` endpoint.
      Note that recipients cannot be edited or deleted.`
  })
  @ApiCreatedResponse({
    type: RecipientResponseDto
  })
  @Serialize(RecipientResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('recipients')
  async createPackageRecipient(
    @Body() body: CreateRecipientDto,
    @Req() req: Request
  ) {
    const userId = req.user?.id;
    return this.packageService.createRecipient(userId!, body);
  }

  @ApiOperation({
    summary: 'Retrieves all highlighted recipients',
  })
  @ApiCreatedResponse({
    type: [RecipientResponseDto]
  })
  @Serialize(RecipientResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get('recipients')
  async getAllRecipients(@Req() req: Request) {
    const userId = req.user?.id;
    return this.packageService.getAllRecipients(userId!);
  }

  @ApiOperation({
    summary: 'Create a new package',
    description: `This endpoint creates a new package. The \`originAddressId\` must be a valid address Id
      created via \`POST /addresses\` or obtained from the old addresses retrieved via \`GET /addresses\`.
      Recipients can be included by providing recipient Ids created via \`POST /packages/recipients\`
      or retrieved from \`GET /packages/recipients\`.`
  })
  @ApiCreatedResponse({
    type: PackageResponseDto
  })
  @Serialize(PackageResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createPackage(
    @Body() body: CreatePackageDto,
    @Req() req: Request
  ) {
    const userId = req.user?.id;
    return this.packageService.create(userId!, body);
  }

  @ApiOperation({
    summary: 'Retrieves all user packages'
  })
  @ApiCreatedResponse({
    type: PackageCompactPlusResponseDto
  })
  @ApiQueryPagination()
  @Serialize(PackageCompactPlusResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllPackages(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Req() req: Request
  ) {
    const userId = req.user?.id;
    return this.packageService.getAll(userId!, page, limit);
  }

  @ApiOperation({
    summary: 'Retrieves a package by its id'
  })
  @ApiCreatedResponse({
    type: PackageResponseDto
  })
  @Serialize(PackageResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'package'
  })
  @Get(':id')
  async getPackageById(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.packageService.getById(id);
  }

  @ApiOperation({
  summary: 'Update a package by its id',
  description: `Updates specific properties of an existing package identified by its ID. 
    Partial updates are supported, but modifications are only allowed if the package has not been matched yet.`
})
  @ApiCreatedResponse({
    type: PackageCompactResponseDto
  })
  @Serialize(PackageCompactResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'package'
  })
  @Patch(':id')
  async updatePackage(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.packageService.getById(id);
  }
}
