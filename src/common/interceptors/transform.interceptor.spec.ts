import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';

const buildContext = () => ({
  getType: () => 'http',
  switchToHttp: () => ({
    getRequest: () => ({}),
    getResponse: () => ({}),
  }),
  getHandler: () => ({}),
  getClass: () => ({}),
}) as unknown as ExecutionContext;

describe('TransformInterceptor', () => {
  let config: DeepMockProxy<ConfigService>;

  beforeEach(() => {
    config = mockDeep<ConfigService>();
  });

  it('passes through data unchanged when wrapper is disabled', (done) => {
    config.get.mockReturnValue('undefined');
    const interceptor = new TransformInterceptor(config);
    const context = buildContext();

    interceptor.intercept(context, { handle: () => of({ foo: 'bar' }) } as any).subscribe((result) => {
      expect(result).toEqual({ foo: 'bar' });
      done();
    });
  });

  it('wraps data in { data } when enabled', (done) => {
    config.get.mockReturnValue('true');
    const interceptor = new TransformInterceptor(config);
    const context = buildContext();

    interceptor.intercept(context, { handle: () => of({ foo: 'bar' }) } as any).subscribe((result) => {
      expect(result).toEqual({ data: { foo: 'bar' } });
      done();
    });
  });

  it('wraps arrays', (done) => {
    config.get.mockReturnValue('true');
    const interceptor = new TransformInterceptor(config);
    const context = buildContext();

    interceptor.intercept(context, { handle: () => of([1, 2, 3]) } as any).subscribe((result) => {
      expect(result).toEqual({ data: [1, 2, 3] });
      done();
    });
  });

  it('does not wrap null/undefined', (done) => {
    config.get.mockReturnValue('true');
    const interceptor = new TransformInterceptor(config);
    const context = buildContext();

    interceptor.intercept(context, { handle: () => of(null) } as any).subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });
});
