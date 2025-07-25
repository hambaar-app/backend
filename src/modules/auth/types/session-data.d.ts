import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    phoneNumber: string;
    userState: UserStatesEnum;
    accessToken: string;
    lastAccessed: Date;
    destroy(callback?: (err: any) => void): void;
  }
}

export enum UserStatesEnum {
  PersonalInfoSubmitted = 'personal_info_submitted',
  VehicleInfoSubmitted = 'vehicle_info_submitted',
  DocumentsSubmitted = 'documents_submitted',
  Authenticated = 'authenticated'
}