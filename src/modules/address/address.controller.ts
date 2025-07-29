import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { Request } from 'express';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { AddressResponseDto } from './dto/address-response.dto';

@Controller('addresses')
export class AddressController {
  constructor(private addressService: AddressService) {}

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
}
