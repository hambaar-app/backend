import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { TripService } from './trip.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { Request } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { IntermediateCityDto } from './dto/intermediate-city.dto';

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

  @ApiOperation({
    summary: 'Create a new trip',
    description: `This endpoint allows a transporter to create a new trip,
      which senders can send delivery requests for via \`POST /packages/:id/requests\`.
      The \`originId\` and \`destinationId\` must be valid address IDs created via \`POST /addresses\`
      or obtained from \`GET /addresses\`. The \`vehicleId\` must reference a valid vehicle owned by the transporter,
      created via \`POST /vehicles\` or obtained from \`GET /vehicles\`.
      The \`departureTime\` must be a tuple of two valid DateTime values [start, end],
      where the end time is after the start time.`
  })
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createTrip(
    @Body() body: CreateTripDto,
    @Req() req: Request
  ) {
    const id = req.user?.id;
    return this.tripService.create(id!, body);
  }

  @ApiOperation({
    summary: 'Get intermediate cities between two coordinates',
    description: `This endpoint returns a list of intermediate cities between two coordinates
      (e.g., origin and destination latitude/longitude), which can be used to define waypoints
      during trip creation via \`POST /trips\`.`
  })
  @Serialize(IntermediateCityDto)
  // @UseGuards(AccessTokenGuard)
  @Get('intermediate-cities')
  async getIntermediateCities(@Query() query: CoordinatesQueryDto) {
    return this.tripService.getIntermediateCities(query);
  }
}
