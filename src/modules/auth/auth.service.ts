import { Injectable, NotFoundException } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';
import { CheckOtpDto } from './dto/check-otp.dto';
import { NotFoundMessages } from '../../common/enums/messages.enum';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { AuthTokens } from '../../common/enums/auth.enum';
import { PrismaService } from '../prisma/prisma.service';
import { SignupSenderDto } from './dto/signup-sender.dto';
import { CheckOtpResult } from './types/auth.types';
import { SignupTransporterDto } from './dto/signup-transporter.dto';
import { RolesEnum } from '../../../generated/prisma';
import { VehicleService } from '../vehicle/vehicle.service';
import { CreateVehicleDto } from '../vehicle/dto/create-vehicle.dto';
import { SubmitDocumentsDto } from './dto/submit-documents.dto';
import { SessionData } from 'express-session';
import { UserStatesEnum } from './types/auth.enums';
import { TransporterResponseDto } from '../user/dto/transporter-response.dto';
import { OtpService } from './domain/otp.service';
import { AuthStateMachine } from './domain/auth-state.machine';
import { TransporterSignupService } from './application/transporter-signup.service';
import { setUserState } from './domain/session-utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly vehicleService: VehicleService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly signupService: TransporterSignupService,
    private readonly stateMachine: AuthStateMachine,
  ) {}

  async sendOtp({ phoneNumber }: SendOtpDto): Promise<boolean> {
    return this.otpService.sendOtp(phoneNumber);
  }

  async checkOtp({ phoneNumber, code }: CheckOtpDto): Promise<CheckOtpResult> {
    await this.otpService.verify(phoneNumber, code);

    const user = await this.userService.getByPhoneNumber(phoneNumber);

    if (!user) {
      const token = this.tokenService.generateTempToken({ phoneNumber });
      return {
        isNewUser: true,
        token,
        type: AuthTokens.Temporary,
      };
    }

    const payload = { sub: user.id, phoneNumber: user.phoneNumber };

    const result: CheckOtpResult = {
      isNewUser: false,
      userId: user.id,
      role: user.role,
      token: this.tokenService.generateAccessToken(payload),
      type: AuthTokens.Access,
    };

    if (user.role === RolesEnum.transporter) {
      const transporterState = await this.computeTransporterState(user.id);
      result.userState = transporterState.userState;

      const progressStates = [
        UserStatesEnum.PersonalInfoSubmitted,
        UserStatesEnum.VehicleInfoSubmitted,
      ];
      if (progressStates.includes(transporterState.userState)) {
        result.token = this.tokenService.generateProgressToken(payload);
        result.type = AuthTokens.Progress;
        result.transporter =
          transporterState.transporter as TransporterResponseDto;
      }
    } else if (user.role === RolesEnum.sender) {
      result.userState = UserStatesEnum.Authenticated;
    }

    return result;
  }

  signupSender(senderDto: SignupSenderDto) {
    return this.signupService.signupSender(senderDto);
  }

  signupTransporter(transporterDto: SignupTransporterDto) {
    return this.signupService.signupTransporter(transporterDto);
  }

  async submitDocuments(
    userId: string,
    phoneNumber: string,
    {
      nationalIdDocumentKey,
      licenseDocumentKey,
      ...vehicleDocs
    }: SubmitDocumentsDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.userService.updateTransporter(
        userId,
        {
          nationalIdDocumentKey,
          licenseDocumentKey,
        },
        tx,
      );

      const transporter = await this.userService.getTransporter({ userId }, tx);
      const vehicleId = transporter.vehicles[0].id;
      await this.vehicleService.update(
        vehicleId,
        {
          verificationDocuments: vehicleDocs,
        },
        tx,
      );
    });

    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      phoneNumber,
    });

    return { accessToken };
  }

  async registerVehicle(
    userId: string,
    vehicleDto: CreateVehicleDto,
    session: SessionData,
  ) {
    const vehicle = await this.vehicleService.create(userId, vehicleDto);
    setUserState(session, UserStatesEnum.VehicleInfoSubmitted);
    return vehicle;
  }

  async getUserState(session: SessionData) {
    if (session.userState) {
      if (session.userState === UserStatesEnum.Authenticated) {
        return { userState: session.userState };
      }

      const user = await this.userService.get({ id: session.userId });
      if (!user) {
        throw new NotFoundException(NotFoundMessages.User);
      }

      if (user.role === RolesEnum.transporter) {
        const transporter = await this.userService.getTransporter({
          userId: session.userId,
        });
        return {
          userState: session.userState,
          transporter: {
            ...user,
            ...transporter,
          },
        };
      }

      return null;
    }

    // Compute and set initial state
    const user = await this.userService.get({ id: session.userId });
    if (!user) {
      throw new NotFoundException(NotFoundMessages.User);
    }

    let computedState: UserStatesEnum = UserStatesEnum.Authenticated;
    let transporter: TransporterResponseDto | undefined;

    if (user.role === RolesEnum.transporter) {
      const { userState, transporter: transporterData } =
        await this.computeTransporterState(session.userId!);
      computedState = userState;
      transporter = transporterData as TransporterResponseDto;
    }

    setUserState(session, computedState);

    return computedState === UserStatesEnum.Authenticated
      ? { userState: computedState, role: user.role }
      : {
          userState: computedState,
          role: user.role,
          transporter: {
            ...user,
            ...transporter,
          },
        };
  }

  private async computeTransporterState(userId: string) {
    const transporter = await this.userService.getTransporter({ userId });
    return this.stateMachine.compute(transporter);
  }
}
