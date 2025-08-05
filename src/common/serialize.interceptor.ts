import { CallHandler, ExecutionContext, NestInterceptor, UseInterceptors } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { map, Observable } from 'rxjs';

export type ClassConstructor<T> = new (...args: any[]) => T;

export function Serialize<T>(dto: ClassConstructor<T>) {
  return UseInterceptors(new SerializeInterceptor<T>(dto));
}

export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(private readonly dto: ClassConstructor<T>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: T | T[]) => {
        if (data === null || data === undefined) {
          return data;
        }

        const isArray = Array.isArray(data);
        const dataToSerialize = isArray ? data : [data];

        const result = plainToInstance(this.dto, dataToSerialize, {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        });

        return isArray ? result : result[0];
      })
    );
  }
}