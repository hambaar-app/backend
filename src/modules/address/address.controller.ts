import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { Request } from 'express';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { AddressResponseDto } from './dto/address-response.dto';
import { CheckOwnership } from '../auth/ownership.decorator';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get('provinces')
  async getProvinces() {
    return this.addressService.getAllProvinces();
  }

  @Get('provinces/:id/cities')
  async getCitiesByProvince(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.addressService.getAllProvinceCities(id);
  }

  @ApiOperation({
    summary: 'Create a new address',
    description: `This endpoint is used for creating addresses in package, packageRecipient, and trip creation.
      If \`isHighlighted\` is set to \`true\`, the address will be displayed in the response of the \`GET /addresses\` endpoint.`
  })
  @ApiCreatedResponse({
    type: AddressResponseDto
  })
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createAddress(
    @Body() body: CreateAddressDto,
    @Req() req: Request
  ) {
    const userId = req.user?.id;
    return this.addressService.create(userId!, body);
  }

  @ApiOperation({
    summary: 'Retrieves all highlighted addresses',
  })
  @ApiCreatedResponse({
    type: [AddressResponseDto]
  })
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllAddresses(@Req() req: Request) {
    const userId = req.user?.id;
    return this.addressService.getAll(userId!);
  }

  @ApiOperation({
    summary: 'Update a address by its id',
    description: `This endpoint updates an existing address.
      Note that addresses cannot be deleted; they can only be unhighlighted by setting \`isHighlighted\` to \`false\`.`
  })
  @ApiOkResponse({
    type: AddressResponseDto
  })
  @Serialize(AddressResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'address'
  })
  @Patch(':id')
  async updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.addressService.update(id, body);
  }
}
