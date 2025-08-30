import { Expose } from 'class-transformer';

export class HealthCheckDto {
  @Expose()
  status: 'ok' | 'error' | 'shutting_down';
  info?: {
    [key: string]: {
      status: 'up' | 'down';
      [key: string]: any;
    };
  };
  error?: {
    [key: string]: {
      status: 'up' | 'down';
      [key: string]: any;
    };
  };
  details: {
    [key: string]: {
      status: 'up' | 'down';
      [key: string]: any;
    };
  };
}