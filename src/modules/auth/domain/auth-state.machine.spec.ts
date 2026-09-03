import { AuthStateMachine, TransporterLike } from './auth-state.machine';
import { UserStatesEnum } from '../types/auth.enums';
import { VerificationStatusEnum } from '../../../../generated/prisma';

describe('AuthStateMachine', () => {
  let machine: AuthStateMachine;

  beforeEach(() => {
    machine = new AuthStateMachine();
  });

  const baseTransporter: TransporterLike = {
    vehicles: [],
    licenseDocumentKey: null,
    nationalIdDocumentKey: null,
    verificationStatus: { status: VerificationStatusEnum.pending },
  };

  describe('compute', () => {
    it('should return PersonalInfoSubmitted with transporter data when no vehicles exist', () => {
      const result = machine.compute(baseTransporter);

      expect(result.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
      expect(result.transporter).toBeDefined();
    });

    it('should return VehicleInfoSubmitted when a vehicle exists but documents are missing', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        vehicles: [{ verificationDocuments: null }],
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.VehicleInfoSubmitted);
      expect(result.transporter).toBeDefined();
    });

    it('should return DocumentsSubmitted when all documents are present', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        vehicles: [{ verificationDocuments: {} }],
        licenseDocumentKey: 'license-key',
        nationalIdDocumentKey: 'national-id-key',
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.DocumentsSubmitted);
    });

    it('should return Authenticated when verificationStatus is verified', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        vehicles: [{ verificationDocuments: {} }],
        licenseDocumentKey: 'license-key',
        nationalIdDocumentKey: 'national-id-key',
        verificationStatus: { status: VerificationStatusEnum.verified },
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.Authenticated);
      expect(result.transporter).toBeUndefined();
    });

    it('should return VehicleInfoSubmitted even when verified without any vehicles', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        verificationStatus: { status: VerificationStatusEnum.verified },
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.Authenticated);
    });

    it('should handle a null verificationStatus without throwing', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        verificationStatus: null,
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.PersonalInfoSubmitted);
    });

    it('should require both transport-level and vehicle documents for DocumentsSubmitted', () => {
      const transporter: TransporterLike = {
        ...baseTransporter,
        vehicles: [{ verificationDocuments: {} }],
        licenseDocumentKey: null,
        nationalIdDocumentKey: 'national-id-key',
      };

      const result = machine.compute(transporter);

      expect(result.userState).toBe(UserStatesEnum.VehicleInfoSubmitted);
    });
  });
});