import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { CityDto } from './dto/city.dto';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CoordinateQueryDto, CoordinatesQueryDto } from './coordinates-query.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('map')
export class MapController {
  constructor(private mapService: MapService) {}

  @ApiOperation({
    summary: 'Get intermediate cities between two coordinates',
    description: `This endpoint returns a list of intermediate cities between two coordinates
      (e.g., origin and destination latitude/longitude), which can be used to define waypoints
      during trip creation via \`POST /trips\`.`,
  })
  @ApiOkResponse({
    type: [CityDto]
  })
  @AuthResponses()
  @ApiInternalServerErrorResponse({
    description: 'Failed to get intermediate cities.'
  })
  @Serialize(CityDto)
  @UseGuards(AccessTokenGuard)
  @Get('intermediate-cities/with-coords')
  async getIntermediateCitiesWithCoords(@Query() query: CoordinatesQueryDto) {
    return this.mapService.getIntermediateCitiesWithCoords(query);
  }

  @ApiOperation({
    summary: 'Get intermediate cities between two coordinates',
    description: `This endpoint returns a list of intermediate cities between two coordinates
      (e.g., origin and destination latitude/longitude), which can be used to define waypoints
      during trip creation via \`POST /trips\`.`,
  })
  @ApiOkResponse({
    type: [CityDto]
  })
  @AuthResponses()
  @ApiInternalServerErrorResponse({
    description: 'Failed to get intermediate cities.'
  })
  @Serialize(CityDto)
  @UseGuards(AccessTokenGuard)
  @Get('intermediate-cities/with-ids')
  async getIntermediateCitiesWithIds(
    @Query('originId', ParseUUIDPipe) originId: string,
    @Query('destinationId', ParseUUIDPipe) destinationId: string
  ) {
    return this.mapService.getIntermediateCitiesWithIds(originId, destinationId);
  }

  @ApiOperation({
    summary: 'Get current location info',
    description: `Which can be used to update tracking via \`POST /trips/:id/tracking\`.`,
  })
  @ApiOkResponse({
    type: ReverseGeocodeDto
  })
  @AuthResponses()
  @ApiInternalServerErrorResponse({
    description: 'Failed to get intermediate cities.'
  })
  @Serialize(ReverseGeocodeDto)
  @UseGuards(AccessTokenGuard)
  @Get('reverse-geocode')
  async reverseGeocode(@Query() query: CoordinateQueryDto) {
    const location = {
      latitude: query.lat,
      longitude: query.lng
    };
    
    const result = await this.mapService.reverseGeocode({
      latitude: query.lat,
      longitude: query.lng
    });

    return {
      ...location,
      ...result
    };
  }
}
