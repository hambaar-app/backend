import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiConflictResponse, ApiOperation } from '@nestjs/swagger';
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
    summary: 'Create a vehicle brand'
  })
  @ApiConflictResponse({
    description: 'Unique database constraint for => model (With this brandId)'
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('models')
  async createModel(@Body() body: CreateModelDto) {
    return this.vehicleService.createModel(body);
  }
}
