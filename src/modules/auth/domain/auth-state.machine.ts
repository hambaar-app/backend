import { Injectable } from '@nestjs/common';
import { VerificationStatusEnum } from '../../../../generated/prisma';
import { TransporterResponseDto } from '../../user/dto/transporter-response.dto';
import { UserStatesEnum } from '../types/auth.enums';

export interface TransporterStateResult {
  userState: UserStatesEnum;
  transporter?: TransporterResponseDto;
}

/**
 * Pure transporter state machine. Encapsulates the onboarding transition
 * logic extracted from AuthService.computeTransporterState:
 *
 * PersonalInfoSubmitted ──(vehicle created)──► VehicleInfoSubmitted
 * VehicleInfoSubmitted  ──(all docs present)──► DocumentsSubmitted
 * DocumentsSubmitted    ──(verificationStatus=verified)──► Authenticated
 *
 * Receives plain transporter data (as returned by UserService.getTransporter)
 * and returns the computed state — no DB access, no side effects.
 */
@Injectable()
export class AuthStateMachine {
  compute(transporter: TransporterLike): TransporterStateResult {
    const isVerified =
      transporter.verificationStatus?.status ===
      VerificationStatusEnum.verified;

    if (isVerified) {
      return { userState: UserStatesEnum.Authenticated };
    }

    if (transporter.vehicles.length === 0) {
      return {
        userState: UserStatesEnum.PersonalInfoSubmitted,
        transporter: transporter as TransporterResponseDto,
      };
    }

    let state: UserStatesEnum = UserStatesEnum.VehicleInfoSubmitted;

    const hasAllDocuments =
      transporter.licenseDocumentKey &&
      transporter.nationalIdDocumentKey &&
      transporter.vehicles[0].verificationDocuments;

    if (hasAllDocuments) {
      state = UserStatesEnum.DocumentsSubmitted;
    }

    return {
      userState: state,
      transporter: transporter as TransporterResponseDto,
    };
  }
}

/**
 * Minimal structural type for what the state machine reads from a transporter
 * record. Using a structural type keeps AuthStateMachine pure and testable
 * without importing Prisma-generated types into the domain layer.
 */
export interface TransporterLike {
  vehicles: { verificationDocuments?: unknown }[];
  licenseDocumentKey?: string | null;
  nationalIdDocumentKey?: string | null;
  verificationStatus?: { status: VerificationStatusEnum } | null;
}
