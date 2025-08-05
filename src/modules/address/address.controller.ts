import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { AddressResponseDto } from './dto/address-response.dto';
import { CheckOwnership } from '../auth/auth.decorators';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../user/current-user.middleware';
import { ApiQuerySearch } from 'src/common/api-docs.decorators';

@Controller('addresses')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @ApiOperation({
    summary: 'Get all provinces',
    description: "Retrieves a list of all Iran's provinces in the database.",
  })
  @Get('provinces')
  async getProvinces() {
    return this.addressService.getAllProvinces();
  }

  @ApiOperation({
    summary: 'Get cities by province Id',
    description:
      'Retrieves a list of all cities belonging to the specified province.',
  })
  @Get('provinces/:id/cities')
  async getCitiesByProvince(@Param('id', ParseUUIDPipe) id: string) {
    return this.addressService.getAllProvinceCities(id);
  }

  @ApiOperation({
    summary: 'Search cities by name',
    description: `Searches for cities across all provinces based on the provided search query.
      The search parameter is required.`,
  })
  @ApiQuerySearch(true)
  @Get('cities')
  async searchCitiesByName(@Query('search') search: string) {
    return this.addressService.searchCitiesByName(search);
  }

  @ApiOperation({
    summary: 'Create a new address',
    description: `This endpoint is used for creating addresses in package, packageRecipient, and trip creation.
      If \`isHighlighted\` is set to \`true\`, the address will be displayed in the response of the \`GET /addresses\` endpoint.`,
  })
  @ApiCreatedResponse({
    type: AddressResponseDto,
  })
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createAddress(
    @Body() body: CreateAddressDto,
    @CurrentUser('id') id: string,
  ) {
    return this.addressService.create(id, body);
  }

  @ApiOperation({
    summary: 'Retrieves all highlighted addresses',
  })
  @ApiCreatedResponse({
    type: [AddressResponseDto],
  })
  @ApiQuerySearch()
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllAddresses(
    @CurrentUser('id') id: string,
    @Query('search') search?: string
  ) {
    return this.addressService.getAll(id, search);
  }

  @ApiOperation({
    summary: 'Update a address by its id',
    description: `This endpoint updates an existing address.
      Note that addresses cannot be deleted; they can only be unhighlighted by setting \`isHighlighted\` to \`false\`.`,
  })
  @ApiOkResponse({
    type: AddressResponseDto,
  })
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'address',
  })
  @Patch(':id')
  async updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.addressService.update(id, body);
  }
}
