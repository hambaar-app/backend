import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiConflictResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CreateModelDto } from './dto/create-model.dto';

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
}
