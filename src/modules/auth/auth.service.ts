import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Keyv } from '@keyv/redis';
import { CheckOtpDto } from './dto/check-otp.dto';
import { ConfigService } from '@nestjs/config';
import { AuthMessages, NotFoundMessages } from 'src/common/enums/messages.enum';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { AuthTokens } from 'src/common/enums/auth.enum';
import { PrismaService } from '../prisma/prisma.service';
import { SignupSenderDto } from './dto/signup-sender.dto';
import { formatPrismaError, generateOTP } from 'src/common/utilities';
import { TooManyRequestsException } from 'src/common/custom.exceptions';
import { CachedUserData, UserAttempts } from './types/auth.types';
import { SignupTransporterDto } from './dto/signup-transporter.dto';
import { RolesEnum, Transporter, VerificationStatusEnum } from 'generated/prisma';
import { VehicleService } from '../vehicle/vehicle.service';
import { SubmitDocumentsDto } from './dto/submit-documents.dto';
import { SessionData } from 'express-session';
import { UserStatesEnum } from './types/auth.enums';

interface TransporterState {
  transporter?: Transporter
  state: UserStatesEnum;
}

@Injectable()
export class AuthService {
  private cacheManager: Keyv;
  private readonly otpExpireTime: number;
  private readonly maxSendAttempts: number;
  private readonly maxCheckAttempts: number;
  private readonly sendWindow: number;
  private readonly baseBlockTime: number;

  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private vehicleService: VehicleService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    config: ConfigService,
  ) {
    this.cacheManager = cacheManager.stores[1];

    this.otpExpireTime = config.get<number>('OTP_EXPIRATION_TIME', 2 * 60 * 1000);
    this.maxSendAttempts = config.get<number>('MAX_SEND_ATTEMPTS ', 5);
    this.maxCheckAttempts = config.get<number>('MAX_CHECK_ATTEMPTS', 10);
    this.sendWindow = config.get<number>('SEND_WINDOW', 30 * 60 * 1000);
    this.baseBlockTime = config.get<number>('BASE_BLOCK_TIME', 20 * 60 * 1000);
  }

  async sendOtp({ phoneNumber }: SendOtpDto): Promise<boolean | never> {
    const userKey = this.getUserKey(phoneNumber);
    const userData = await this.getUserData(userKey);

    this.checkIfBlocked(userData.attempts);
    this.checkSendAttempts(userData.attempts);
    
    const now = Date.now();
    if (userData.otp && now < userData.otp.expiresIn) {
      throw new UnauthorizedException(AuthMessages.OtpNotExpired);
    }
    
    const otp = {
      code: generateOTP(),
      expiresIn: now + this.otpExpireTime,
      createdAt: now
    };

    userData.attempts.sendAttempts++;
    userData.attempts.checkAttempts = 0;
    userData.attempts.lastSendAttempt = now;
    userData.otp = otp;

    const storeResult = await this.setUserData(userKey, userData);
    // call otp service method and error handling.
    return storeResult;
  }

  async checkOtp(
    { phoneNumber, code }: CheckOtpDto
  ): Promise<{ userId: string | undefined; token: string; type: AuthTokens }> {
    const userKey = this.getUserKey(phoneNumber);
    const userData = await this.getUserData(userKey);

    this.checkIfBlocked(userData.attempts);

    if (!userData?.otp) {
      throw new UnauthorizedException(AuthMessages.OtpExpired);
    }

    const now = Date.now();
    if (now > userData.otp.expiresIn) {
      throw new UnauthorizedException(AuthMessages.OtpExpired);
    } 

    userData.attempts.checkAttempts++;

    if (userData.attempts.checkAttempts > this.maxCheckAttempts) {
      // Block user and extend cache time
      userData.attempts.blockedUntil = now + this.calculateBlockTime(userData.attempts);
      await this.setUserData(userKey, userData);
      throw new TooManyRequestsException(AuthMessages.TooManyAttempts);
    }

    if (userData.otp.code !== code) {
      await this.setUserData(userKey, userData);
      throw new UnauthorizedException(AuthMessages.OtpInvalid);
    }

    // OTP is valid - clear the OTP data but keep attempts history
    userData.otp = undefined;
    await this.setUserData(userKey, userData);

    const user = await this.userService.getByPhoneNumber(phoneNumber);
    let token: string;
    let type: AuthTokens;
    let userId: string | undefined = undefined;

    if (!user) {
      const payload = { phoneNumber };
      token = this.tokenService['generateTempToken'](payload);
      type = AuthTokens.Temporary;
    } else {
      userId = user.id;
      const payload = {
        sub: userId,
        phoneNumber: user.phoneNumber,
      };
      token = this.tokenService['generateAccessToken'](payload);
      type = AuthTokens.Access;
    }

    return {
      userId,
      token,
      type
    };
  }

  private getUserKey(
    phoneNumber: string,
    type: 'mobile' | 'email' = 'mobile'
  ): string {
    return `otp:${type}:${phoneNumber}`;
  }

  private async getUserData(userKey: string): Promise<CachedUserData> {
    const userData = await this.cacheManager.get<CachedUserData>(userKey);
    if (!userData) {
      return {
        attempts: {
          sendAttempts: 0,
          checkAttempts: 0,
          lastSendAttempt: 0,
        }
      };
    }

    // Reset attempts if pass the window
    const now = Date.now();
    if (now - userData.attempts.lastSendAttempt > this.sendWindow) {
      userData.attempts.sendAttempts = 0;
    }
    
    return userData;
  }

  private async setUserData(userKey: string, userData: CachedUserData): Promise<boolean> {
    const cacheTime = this.calculateCacheTime(userData.attempts);
    return this.cacheManager.set(userKey, userData, cacheTime);
  }

  private checkIfBlocked(attempts: UserAttempts): void {
    const now = Date.now();
    if (attempts.blockedUntil && now < attempts.blockedUntil) {
      const remainingTime = Math.ceil((attempts.blockedUntil - now) / 1000 / 60); // minutes
      throw new TooManyRequestsException(
        `Too many attempts. Please try again in ${remainingTime} minutes.`
      );
    }
  }

  private checkSendAttempts(attempts: UserAttempts): void {
    if (attempts.sendAttempts >= this.maxSendAttempts) {
      const blockTime = this.calculateBlockTime(attempts);
      attempts.blockedUntil = Date.now() + blockTime;
      throw new TooManyRequestsException(AuthMessages.MaxAttempts);
    }
  }

  private calculateBlockTime(attempts: UserAttempts): number {
    // Progressive blocking: each violation increases block time
    // Violations => 0-2
    const violations = Math.floor(attempts.sendAttempts / this.maxSendAttempts) + 
                      Math.floor(attempts.checkAttempts / this.maxCheckAttempts);
    if (!violations) return 0;
    return this.baseBlockTime * Math.pow(2, violations);
  }

  private calculateCacheTime(attempts: UserAttempts): number {    
    if (attempts.blockedUntil) {
      return Math.max(attempts.blockedUntil - Date.now() + 60_000, this.sendWindow);
    }
    return this.sendWindow;
  }

  async signupSender(senderDto: SignupSenderDto) {
    const sender = await this.prisma.user.create({
      data: {
        ...senderDto,
        role: RolesEnum.sender,
        phoneVerifiedAt: new Date()
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const payload = {
      sub: sender.id,
      phoneNumber: sender.phoneNumber
    };
    const accessToken = this.tokenService['generateAccessToken'](payload);

    return {
      sender,
      accessToken
    };
  }

  async signupTransporter(
    {
      nationalId,
      licenseNumber,
      licenseType,
      profilePictureKey,
      ...transporterDto
    }: SignupTransporterDto
  ) {
    const user = await this.prisma.user.create({
      data: {
        ...transporterDto,
        role: RolesEnum.transporter,
        transporter: {
          create: {
            nationalId,
            licenseNumber,
            licenseType,
            profilePictureKey,
            nationalIdStatus: {
              create: {}
            },
            licenseStatus: {
              create: {}
            },
            verificationStatus: {
              create: {}
            }
          }
        },
      },
      include: {
        transporter: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber
    };
    const progressToken = this.tokenService['generateProgressToken'](payload);

    return {
      transporter: {
        ...user,
        ...user.transporter,
        transporter: undefined
      },
      progressToken
    };
  }

  async submitDocuments(
    userId: string,
    {
      nationalIdDocumentKey,
      licenseDocumentKey,
      ...vehicleDocs
    }: SubmitDocumentsDto,
    phoneNumber: string
  ) {
    await this.prisma.$transaction(async tx => {
      await this.userService.updateTransporter(userId, {
        nationalIdDocumentKey, licenseDocumentKey
      }, tx);

      const transporter = await this.userService.getTransporter({ userId }, tx);
      const vehicleId = transporter.vehicles[0].id;
      await this.vehicleService.update(vehicleId, {
        verificationDocuments: vehicleDocs
      }, tx);
    });

    const payload = {
      sub: userId,
      phoneNumber
    };
    const accessToken = this.tokenService['generateAccessToken'](payload);
    return {
      accessToken
    };
  }

  async getUserState(session: SessionData) {
    if (session.userState) {
      // For authenticated users, just return state
      if (session.userState === UserStatesEnum.Authenticated) {
        return { state: session.userState };
      }

      const user = await this.userService.get({ id: session.userId });
      if (!user) {
        throw new NotFoundException(NotFoundMessages.User);
      }

      // For transporters in progress, return complete transporter data
      if (user.role === RolesEnum.transporter) {
        const transporter = await this.userService.getTransporter({ id: session.userId });
        return { 
          state: session.userState, 
          transporter: {
            ...user,
            ...transporter
          }
        };
      }

      // For other cases, return user info
      return { state: session.userState, user };
    }

    // Compute and set initial state
    const user = await this.userService.get({ id: session.userId });
    if (!user) {
      throw new NotFoundException(NotFoundMessages.User);
    }

    let computedState: UserStatesEnum | undefined;
    let transporter: Transporter | undefined;

    switch (user.role) {
      case RolesEnum.sender:
        computedState = UserStatesEnum.Authenticated;
        break;

      case RolesEnum.transporter:
        const transporterState = await this.computeTransporterState(session.userId!);
        computedState = transporterState.state;
        transporter = transporterState.transporter;
        break;
    }

    // Update session with computed state
    session.userState = computedState;

    return computedState === UserStatesEnum.Authenticated 
      ? { state: computedState }
      : {
          state: computedState,
          transporter: {
            ...user,
            ...transporter
          }
        };
  }

  private async computeTransporterState(
    userId: string
  ): Promise<TransporterState> {
    const transporter = await this.userService.getTransporter({ id: userId });

    // No vehicles submitted yet
    if (transporter.vehicles.length === 0) {
      return { state: UserStatesEnum.PersonalInfoSubmitted };
    }

    // Vehicle info submitted
    const firstVehicle = transporter.vehicles[0];
    const hasAllDocuments = transporter.licenseDocumentKey 
      && transporter.nationalIdDocumentKey 
      && firstVehicle.verificationDocuments;

    if (!hasAllDocuments) {
      return { state: UserStatesEnum.VehicleInfoSubmitted };
    }

    // Transporter verified or not
    const isVerified = transporter.verificationStatus?.status === VerificationStatusEnum.verified;
    
    return isVerified
      ? { state: UserStatesEnum.Authenticated }
      : { transporter, state: UserStatesEnum.DocumentsSubmitted };
  }
}
