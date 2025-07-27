import { SetMetadata } from '@nestjs/common';
import { Action, Subjects } from '../casl/casl.types';

export interface CheckPermissionsConfig {
  action: Action;
  subject: Subjects;
  field?: string;
}

export const CheckPermissions = (config: CheckPermissionsConfig | [Action, Subjects]) =>
  SetMetadata('permissions', Array.isArray(config) ? { action: config[0], subject: config[1] } : config);

// Quick decorators for common actions
export const CanRead = (subject: Subjects) => CheckPermissions([Action.Read, subject]);
export const CanUpdate = (subject: Subjects) => CheckPermissions([Action.Update, subject]);
export const CanDelete = (subject: Subjects) => CheckPermissions([Action.Delete, subject]);
export const CanCreate = (subject: Subjects) => CheckPermissions([Action.Create, subject]);