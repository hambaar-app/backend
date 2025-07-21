import { Body, Controller, Post } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('vehicles')
export class VehicleController {
  constructor(private vehicleService: VehicleService) {}

  @ApiOperation({
    summary: 'Create a vehicle brand'
  })
  @Post('brands')
  async createBrand(@Body() body: CreateBrandDto) {
    return this.vehicleService.createBrand(body);
  }
}
