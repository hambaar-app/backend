import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>('RESPONSE_WRAPPER_ENABLED') === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.enabled) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return data;
        }
        return { data };
      }),
    );
  }
}
