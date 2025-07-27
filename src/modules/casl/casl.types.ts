import { CreateAbility, InferSubjects, PureAbility } from '@casl/ability';
import {
  Achievement,
  Address,
  DeliveryRequest,
  MatchedRequest,
  Package,
  PackageRecipient,
  TrackingUpdate,
  Transaction,
  Transporter,
  Trip,
  TripWaypoint,
  User,
  Vehicle,
  VehicleBrand,
  VehicleModel,
  VerificationStatus,
  Wallet,
} from 'generated/prisma';
import { PrismaQuery, Subjects as CaslSubjects } from '@casl/prisma';

export type Subjects =
  CaslSubjects<{
    User: User;
    Transporter: Transporter;
    VerificationStatus: VerificationStatus;
    VehicleBrand: VehicleBrand;
    VehicleModel: VehicleModel;
    Vehicle: Vehicle;
    Package: Package;
    Trip: Trip;
    TripWaypoint: TripWaypoint;
    Address: Address;
    DeliveryRequest: DeliveryRequest;
    MatchedRequest: MatchedRequest;
    TrackingUpdate: TrackingUpdate;
    PackageRecipient: PackageRecipient;
    Wallet: Wallet;
    Transaction: Transaction;
    Achievement: Achievement;
  }> | 'all';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}


export type AppAbility = PureAbility<[Action, Subjects]>;
