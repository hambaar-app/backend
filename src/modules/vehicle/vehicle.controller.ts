import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CreateModelDto } from './dto/create-model.dto';
import { Serialize } from 'src/common/serialize.interceptor';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { CheckOwnership } from '../auth/ownership.decorator';

@Controller('vehicles')
export class VehicleController {
  constructor(private vehicleService: VehicleService) {}

  @ApiOperation({
    summary: 'Create a vehicle brand'
  })
  @ApiConflictResponse({
    description: 'Unique database constraint for => name'
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('brands')
  async createBrand(@Body() body: CreateBrandDto) {
    return this.vehicleService.createBrand(body);
  }

  @ApiOperation({
    summary: 'Retrieves all vehicle brands'
  })
  @ApiQuery({
    name: 'search',
    type: String,
    description: 'Search term to filter results',
    required: false,
  })
  @Get('brands')
  async getAllBrands(@Query('search') search?: string) {
    return this.vehicleService.getAllBrands(search);
  }

  @ApiOperation({
    summary: 'Create a vehicle model'
  })
  @ApiConflictResponse({
    description: 'Unique database constraint for => model (With this brandId)'
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('models')
  async createModel(@Body() body: CreateModelDto) {
    return this.vehicleService.createModel(body);
  }

  @ApiOperation({
    summary: 'Retrieves all vehicle models'
  })
  @ApiQuery({
    name: 'search',
    type: String,
    description: 'Search term to filter results',
    required: false,
  })
  @Get('models/:brandId')
  async getAllBrandModels(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query('search') search?: string
  ) {
    return this.vehicleService.getAllBrandModels(brandId, search);
  }

  @ApiOperation({
    summary: 'Updates a vehicle by its id',
  })
  @ApiOkResponse({
    type: VehicleResponseDto
  })
  @Serialize(VehicleResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'vehicle'
  })
  @Patch('/:id')
  async updateTransporter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVehicleDto
  ) {
    return this.vehicleService.update(id, body);
  }
}
