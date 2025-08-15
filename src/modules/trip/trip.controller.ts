import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Session,
  UseGuards,
} from '@nestjs/common';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { TripService } from './trip.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from 'src/common/serialize.interceptor';
import { CityDto } from './dto/city.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { CheckOwnership } from '../auth/auth.decorators';
import { CurrentUser } from '../user/current-user.middleware';
import { AuthResponses, CrudResponses, ValidationResponses } from 'src/common/api-docs.decorators';
import { TripFilterQueryDto } from './dto/trip-filter-query.dto';
import { TripCompactResponseDto, TripResponseDto } from './dto/trip-response.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { SessionData } from 'express-session';
import { BadRequestMessages, NotFoundMessages } from 'src/common/enums/messages.enum';
import { UpdateRequestDto } from './dto/update-request.dto';

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

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
    return this.tripService.getIntermediateCitiesWithCoords(query);
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
    return this.tripService.getIntermediateCitiesWithIds(originId, destinationId);
  }

  @ApiOperation({
    summary: 'Create a new trip',
    description: `This endpoint allows a transporter to create a new trip,
      which senders can send delivery requests for via \`POST /packages/:id/requests\`.
      The \`originId\` and \`destinationId\` must be valid cities ids obtained from \`GET /addresses/cities\`.
      The \`vehicleId\` must reference a valid vehicle owned by the transporter,
      created via \`POST /vehicles\` or obtained from \`GET /vehicles\`.
      The \`departureTime\` must be a tuple of two valid DateTime values [start, end],
      where the end time is after the start time.`,
  })
  @ApiCreatedResponse({
    type: TripCompactResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(TripCompactResponseDto)
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createTrip(@Body() body: CreateTripDto, @CurrentUser('id') id: string) {
    return this.tripService.create(id, body);
  }

  @ApiOperation({
    summary: 'Retrieves a trip by its id',
  })
  @AuthResponses()
  @ApiOkResponse({
    type: TripResponseDto,
  })
  @AuthResponses()
  @Serialize(TripResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Get(':id')
  async getTripById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripService.getById(id);
  }

  @ApiOperation({
    summary: 'Retrieves all user trips',
  })
  @AuthResponses()
  @ApiOkResponse({
    type: [TripCompactResponseDto],
  })
  @AuthResponses()
  @Serialize(TripCompactResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get()
  async getAllTrips(
    @Query() query: TripFilterQueryDto,
    @CurrentUser('id') id: string,
  ) {
    return this.tripService.getAll(id, query.status);
  }

  @ApiOperation({
    summary: 'Update a trip by its id',
    description: `This endpoint allows a transporter to update a trip with the specified id,
    but only if its status is \`scheduled\` (from TripStatusEnum).
    \`waypoints\` will be overridden. Addresses can be updated separately via \`PATCH /addresses/:id\`.`,
  })
  @ApiCreatedResponse({
    type: TripCompactResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(TripCompactResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip',
  })
  @Patch(':id')
  async updateTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTripDto,
  ) {
    return this.tripService.update(id, body);
  }

  @ApiOperation({
    summary: 'Delete a trip by its id',
    description: `This endpoint allows a transporter to delete a trip with the specified id,
    but only if its status is \`scheduled\` (from TripStatusEnum).`,
  })
  @ApiCreatedResponse({
    type: TripCompactResponseDto
  })
  @AuthResponses()
  @CrudResponses()
  @Serialize(TripCompactResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip',
  })
  @Delete(':id')
  async deleteTrip(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripService.delete(id);
  }

  @ApiOperation({
    summary: 'Create a request for a package to a matched trip',
    description: `The sender must first call \`GET /packages/:id/matched-trips\` 
      to obtain a list of compatible trips for the package.
      If the package is already matched or the trip is not in the matched trips list
      or not in \`scheduled\` or \`delayed\` status, the request will be rejected.`,
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.SendRequestTrip
  })
  @ApiBadRequestResponse({
    description: BadRequestMessages.SendRequestPackage
  })
  @ApiNotFoundResponse({
    description: NotFoundMessages.MatchedTrip
  })
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('requests')
  async createTripRequest(
    @Body() body: CreateRequestDto,
    @CurrentUser('id') userId: string,
    @Session() session: SessionData
  ) {
    return this.tripService.createRequest(userId, body, session);
  }

  @ApiOperation({
    summary: 'Get all trip pending requests by its id'
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Get(':id/requests')
  async getAllTripRequests(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripService.getAllTripRequests(id);
  }

  @ApiOperation({
    summary: 'Update a request status (For transporter)'
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'tripRequest'
  })
  @Patch('requests/:id')
  async updateTripRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRequestDto,
    @Session() session: SessionData
  ) {
    return this.tripService.updateRequest(id, body, session);
  }

  @ApiOperation({
    summary: 'Get all trip matched packages by its id'
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  // TODO: Serialize
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Get(':id/matched-packages')
  async getAllTripMatchedPackages(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripService.getAllMatchedPackages(id);
  }
}
