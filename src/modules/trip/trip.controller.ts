import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Serialize } from '../../common/serialize.interceptor';
import { UpdateTripDto } from './dto/update-trip.dto';
import { OwnershipGuard } from '../auth/guard/ownership.guard';
import { CheckOwnership } from '../auth/auth.decorators';
import { CurrentUser } from '../user/current-user.middleware';
import { AuthResponses, CrudResponses, ValidationResponses } from '../../common/api-docs.decorators';
import { TripFilterQueryDto } from './dto/trip-filter-query.dto';
import { TripCompactResponseDto, TripResponseDto } from './dto/trip-response.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { AddNoteDto, BroadcastNoteDto } from './dto/add-note.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { TrackingResponseDto, TrackingUpdatesResponseDto } from '../package/dto/tracking-response.dto';
import { DeliveryPackageDto } from './dto/delivery-package.dto';
import { BadRequestMessages } from '../../common/enums/messages.enum';
import { RateTripDto } from './dto/rate-trip.dto';
import { MatchedRequestResponseDto } from './dto/matched-request-response.dto';

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

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
    entity: 'tripRequest',
  })
  @Patch('requests/:id')
  async updateTripRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRequestDto,
  ) {
    return this.tripService.updateRequest(id, body);
  }

  @ApiOperation({
    summary: 'Get all trip matched requests by its id'
  })
  @ApiOkResponse({
    type: MatchedRequestResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @CrudResponses()
  @Serialize(MatchedRequestResponseDto)
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Get(':id/matched-requests')
  async getAllTripMatchedRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('inOrder', new ParseBoolPipe({ optional: true })) inOrder: boolean = false
  ) {
    return this.tripService.getAllMatchedRequests(id, inOrder);
  }

  @ApiOperation({
    summary: 'Toggle trip access for requests',
    description: `Toggles the trip status between \`scheduled\` (open for requests)
      and \`closed\` (no more requests, not started). Only works if the current status is one of them.`
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BaseTripStatus
  })
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Serialize(TripCompactResponseDto)
  @Patch(':id/toggle-access')
  async toggleTripAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripService.toggleTripAccess(id);
  }

  @ApiOperation({
    summary: 'Start a trip',
    description: `* The trip can only be started if its status is one of the following: \`scheduled\`
      , \`closed\` and \`delayed\`.
      * It updates package's tracking automatically.`,
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BaseTripStatus
  })
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Serialize(TripCompactResponseDto)
  @HttpCode(HttpStatus.OK)
  @Post(':id/start')
  async startTrip(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripService.startTrip(id);
  }

  @ApiOperation({
    summary: 'Pickup a trip\'s package',
    description: `* The package can be picked up if it's a \`matched\` package.
      * The trip should have \`in_progress\` status.
      * It updates package's tracking automatically.`,
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BaseTripStatus
  })
  @ApiBadRequestResponse({
    description: BadRequestMessages.BasePackageStatus
  })
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip',
    paramName: 'tripId'
  })
  @HttpCode(HttpStatus.OK)
  @Post(':tripId/pickup/:packageId')
  async pickupTripPackage(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('packageId', ParseUUIDPipe) packageId: string
  ) {
    return this.tripService.pickupPackage(tripId, packageId);
  }

  @ApiOperation({
    summary: 'Delivery a trip\'s package',
    description: `* The package can be picked up if it's a \`matched\` package.
      * The trip should have \`in_progress\` status.
      * It updates package's tracking automatically.
      * The delivery code is a 5-digit code the recipient gives to the transporter to verify package delivery.`
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BaseTripStatus
  })
  @ApiBadRequestResponse({
    description: BadRequestMessages.BasePackageStatus
  })
  @ApiBadRequestResponse({
    description: BadRequestMessages.WrongDeliveryCode
  })
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip',
    paramName: 'tripId'
  })
  @HttpCode(HttpStatus.OK)
  @Post(':tripId/delivery/:packageId')
  async deliveryTripPackage(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() body: DeliveryPackageDto
  ) {
    return this.tripService.deliveryPackage(tripId, packageId, body.deliveryCode);
  }

  @ApiOperation({
    summary: 'Finish a trip',
    description: `* The trip can only be started if its status is \`in_progress\`.
      * You cannot finish the trip until all packages are delivered.`,
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BaseTripStatus
  })
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Serialize(TripCompactResponseDto)
  @HttpCode(HttpStatus.OK)
  @Post(':id/finish')
  async finishTrip(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripService.finishTrip(id);
  }

  @ApiOperation({
    summary: 'Add a note for a specific matched package'
  })
  @AuthResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Post(':id/note')
  async addTripNote(
    @Param('id', ParseUUIDPipe) tripId: string,
    @Body() body: AddNoteDto
  ) {
    return this.tripService.addTripNote(tripId, body.note, body.packageId);
  }

  @ApiOperation({
    summary: 'Add a note for all matched packages (broadcast)'
  })
  @AuthResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Post(':id/note/broadcast')
  async broadcastTripNote(
    @Param('id', ParseUUIDPipe) tripId: string,
    @Body() body: BroadcastNoteDto
  ) {
    return this.tripService.addTripNote(tripId, body.note);
  }

  @ApiOperation({
    summary: 'Update tracking info for all matched packages',
    description: 'You should fill the request\'s body with `GET /map/reverse-geocode`'
  })
  @AuthResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip'
  })
  @Post(':id/tracking')
  async updateTripTracking(
    @Param('id', ParseUUIDPipe) tripId: string,
    @Body() body: UpdateTrackingDto
  ) {
    return this.tripService.updateTracking(tripId, body);
  }

  @ApiOperation({
    summary: 'Get tracking info for a specific package (Protected)'
  })
  @ApiOkResponse({
    type: [TrackingUpdatesResponseDto]
  })
  @AuthResponses()
  @CrudResponses()
  @UseGuards(AccessTokenGuard, OwnershipGuard)
  @CheckOwnership({
    entity: 'trip',
    paramName: 'tripId'
  })
  @Serialize(TrackingUpdatesResponseDto)
  @Get(':tripId/tracking/:packageId')
  async getTripTracking(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('packageId', ParseUUIDPipe) packageId: string
  ) {
    return this.tripService.getTripTracking(tripId, packageId);
  }

  @ApiOperation({
    summary: 'Rate to delivered package\'s trip'
  })
  @AuthResponses()
  @CrudResponses()
  @ApiBadRequestResponse({
    description: BadRequestMessages.BasePackageStatus
  })
  @ApiBadRequestResponse({
    description: BadRequestMessages.AlreadyRatedTrip
  })
  @HttpCode(HttpStatus.OK)
  @Post('rate')
  async rateTrip(
    @Body() body: RateTripDto,
    @CurrentUser('id') userId: string
  ) {
    return this.tripService.rateTrip(userId, body);
  }
}
