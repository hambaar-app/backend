import { SetMetadata } from '@nestjs/common';
import { OwnershipConfig } from './types/auth.types';

export const CheckOwnership = (config: OwnershipConfig) =>
  SetMetadata('ownership', config);
