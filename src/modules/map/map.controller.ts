import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { CityDto } from '../trip/dto/city.dto';
import { AuthResponses } from 'src/common/api-docs.decorators';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CoordinatesQueryDto } from './coordinates-query.dto';

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
  @Serialize(CityDto)
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
  @Serialize(CityDto)
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
}
