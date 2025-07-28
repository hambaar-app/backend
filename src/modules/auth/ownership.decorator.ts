import { SetMetadata } from '@nestjs/common';
import { OwnershipConfig } from 'src/modules/auth/types/auth.types';

export const CheckOwnership = (config: OwnershipConfig) => 
  SetMetadata('ownership', config);