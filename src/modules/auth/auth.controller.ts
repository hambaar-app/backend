import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Session,
  UseGuards
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { CheckOtpDto, CheckOtpResponseDto } from './dto/check-otp.dto';
import { SessionData } from 'express-session';
import { CookieNames } from 'src/common/enums/cookies.enum';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { SignupSenderDto } from './dto/signup-sender.dto';
import { ProgressTokenGuard, TemporaryTokenGuard } from './guard/token.guard';
import { AuthMessages, NotFoundMessages } from 'src/common/enums/messages.enum';
import { DenyAuthorizedGuard } from './guard/deny-authorized.guard';
import { SignupTransporterDto, SignupTransporterResponseDto } from './dto/signup-transporter.dto';
import { VehicleService } from '../vehicle/vehicle.service';
import { CreateVehicleDto } from '../vehicle/dto/create-vehicle.dto';
import { SubmitDocumentsDto } from './dto/submit-documents.dto';
import { UserStatesEnum } from './types/auth.enums';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { Serialize } from 'src/common/serialize.interceptor';
import { VehicleResponseDto } from '../vehicle/dto/vehicle-response.dto';
import { StateDto } from './dto/state-response.dto';
import { CurrentUser } from '../user/current-user.middleware';
import { User } from 'generated/prisma';
import { AuthResponses, ValidationResponses } from 'src/common/api-docs.decorators';

@Controller('auth')
export class AuthController {
  private cookieMaxAge: number;
  private progressMaxAge: number;

  constructor(
    private authService: AuthService,
    private vehicleService: VehicleService,
    config: ConfigService,
  ) {
    this.cookieMaxAge = config.get<number>('COOKIE_MAX_AGE', 15 * 24 * 3600 * 1000); // 15 days
    this.progressMaxAge = 2 * 24 * 60 * 60 * 1000; // 2 days
  }

  @ApiOperation({
    summary: "Sends OTP code to the user's phone number",
    description: `Sends a OTP code to the user's phone number or email for authentication for login or signup.
      This endpoint is used by both senders and transporters to verify their identity.`,
  })
  @ApiTooManyRequestsResponse({
    description: AuthMessages.MaxAttempts,
  })
  @ApiTooManyRequestsResponse({
    description: AuthMessages.TooManyAttempts,
  })
  @UseGuards(DenyAuthorizedGuard)
  @HttpCode(HttpStatus.OK)
  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto): Promise<boolean> {
    return this.authService.sendOtp(body);
  }

  @ApiOperation({
    summary: 'Verifies OTP code for login or signup',
    description: `Verifies the OTP code sent to the user's phone number for authentication during login or signup.`,
  })
  @ApiTooManyRequestsResponse({
    description: AuthMessages.TooManyAttempts,
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.OtpExpired,
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.OtpInvalid,
  })
  @ApiOkResponse({
    type: CheckOtpResponseDto
  })
  @Serialize(CheckOtpResponseDto)
  @HttpCode(HttpStatus.OK)
  @Post('check-otp')
  async checkOtp(
    @Body() body: CheckOtpDto,
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, token, type, ...response } = await this.authService.checkOtp(body);

    switch (type) {
      case AuthTokens.Access:
        session.accessToken = token;
        session.userId = userId;

        res.cookie(CookieNames.AccessToken, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: this.cookieMaxAge,
        });
        break;

      case AuthTokens.Temporary:
        res.cookie(CookieNames.TemporaryToken, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 20 * 60 * 1000,
        });
        break;

      case AuthTokens.Progress:
        res.cookie(CookieNames.ProgressToken, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: this.progressMaxAge,
        });
        break;
    }

    session.phoneNumber = body.phoneNumber;
    return response;
  }

  @ApiOperation({
    summary: 'Registers a sender user',
    description: `This endpoint registers a new sender user using the provided data,
      generates an access token and sets it as an cookie.
      You should authorized the phone number with otp before the request.`,
  })
  @ApiBadRequestResponse({
    description: AuthMessages.UnauthorizedPhoneNumber,
  })
  @ApiConflictResponse({
    description: 'Unique database constraint for => phoneNumber and email',
  })
  @ApiCreatedResponse({
    type: UserResponseDto
  })
  @ValidationResponses()
  @Serialize(UserResponseDto)
  @UseGuards(TemporaryTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('sender/signup')
  async signupSender(
    @Body() body: SignupSenderDto,
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (session.phoneNumber !== body.phoneNumber) {
      throw new BadRequestException(AuthMessages.UnauthorizedPhoneNumber);
    }

    const { sender, accessToken } = await this.authService.signupSender(body);

    session.accessToken = accessToken;
    res.cookie(CookieNames.AccessToken, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });
    res.clearCookie(CookieNames.TemporaryToken);

    session.userState = UserStatesEnum.Authenticated;
    session.userId = sender.id;
    session.phoneNumber = sender.phoneNumber;

    return sender;
  }

  @ApiOperation({
    summary: 'Registers a transporter user (Stage 1)',
    description: `This endpoint handles the first stage of transporter registration.
    After successful OTP verification, a token with a 1-day validity is generated and stored in a cookie,
    allowing the user to proceed with subsequent registration stages (vehicle information and submit documents)
    without re-verifying OTP.`,
  })
  @ApiBadRequestResponse({
    description: AuthMessages.UnauthorizedPhoneNumber,
  })
  @ApiConflictResponse({
    description:
      'Unique database constraint for => phoneNumber, email, nationalId and driverLicenseNumber',
  })
  @ApiCreatedResponse({
    type: SignupTransporterResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @Serialize(SignupTransporterResponseDto)
  @UseGuards(TemporaryTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('transporter/signup')
  async signupTransporter(
    @Body() body: SignupTransporterDto,
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (session.phoneNumber !== body.phoneNumber) {
      throw new BadRequestException(AuthMessages.UnauthorizedPhoneNumber);
    }

    const { transporter, progressToken } =
      await this.authService.signupTransporter(body);

    res.cookie(CookieNames.ProgressToken, progressToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.progressMaxAge,
    });
    res.clearCookie(CookieNames.TemporaryToken);

    session.userState = UserStatesEnum.PersonalInfoSubmitted;
    session.userId = transporter.userId;
    session.phoneNumber = transporter.phoneNumber;

    return transporter;
  }

  @ApiOperation({
    summary:
      'Register a vehicle for a transporter during authentication (Stage 2)',
    description: `This endpoint handles the second stage of transporter registration.
    The user submits vehicle information.`,
  })
  @ApiNotFoundResponse({
    description: NotFoundMessages.VehicleModel,
  })
  @ApiConflictResponse({
    description: `Unique database constraint for =>
      vin, licensePlate, barcode, greenSheetNumber and insuranceNumber`,
  })
  @ApiCreatedResponse({
    type: VehicleResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @Serialize(VehicleResponseDto)
  @UseGuards(ProgressTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('transporter/vehicle')
  async registerTransporterVehicle(
    @Body() body: CreateVehicleDto,
    @Session() session: SessionData,
    @CurrentUser('id') id: string,
  ) {
    const vehicle = await this.vehicleService.create(id, body);
    session.userState = UserStatesEnum.VehicleInfoSubmitted;
    return vehicle;
  }

  @ApiOperation({
    summary: 'Submit transporter documents during authentication (Stage 3)',
    description: `This endpoint handles the final stage of transporter registration.
    After successful submission of vehicle information, the user submits keys for required uploaded 
    (with our s3 service) documents. And generates an access token and sets it as an cookie.`,
  })
  @AuthResponses()
  @UseGuards(ProgressTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Post('transporter/submit-docs')
  async submitTransporterDocumentKeys(
    @Body() body: SubmitDocumentsDto,
    @Session() session: SessionData,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response
  ): Promise<true> {
    const { id, phoneNumber } = user;  
    const { accessToken } = await this.authService.submitDocuments(id!, phoneNumber!, body);

    session.accessToken = accessToken;
    res.cookie(CookieNames.AccessToken, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });
    res.clearCookie(CookieNames.ProgressToken);

    return true;
  }

  @ApiOperation({
    summary: 'Retrieves user state for not-authorized transporters',
  })
  @AuthResponses()
  @ApiOkResponse({
    type: StateDto
  })
  @Serialize(StateDto)
  @UseGuards(DenyAuthorizedGuard, ProgressTokenGuard)
  @Get('state')
  async getUserState(@Session() session: SessionData) {
    return this.authService.getUserState(session);    
  }

  @ApiOperation({
    summary: 'Logout user and destroy session',
  })
  @Post('logout')
  async logoutUser(
    @Session() session: SessionData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<true> {
    session.destroy();
    res.clearCookie(CookieNames.SessionId);
    res.clearCookie(CookieNames.TemporaryToken);
    res.clearCookie(CookieNames.ProgressToken);
    res.clearCookie(CookieNames.AccessToken);

    return true;
  }
}
