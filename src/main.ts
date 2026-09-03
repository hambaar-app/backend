import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { SwaggerModule } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
} from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { parseCorsOrigins, buildSwaggerConfig, isSwaggerEnabled } from './common/http/bootstrap-options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());

  app.enableCors(parseCorsOrigins(config));

  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(config),
    new TransformInterceptor(config),
  );

  app.enableShutdownHooks();

  // Assign request ids
  app.use(RequestIdMiddleware);

  if (isSwaggerEnabled(config)) {
    const swaggerConfig = buildSwaggerConfig();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on port ${port}`);
}

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', error);
  process.exit(1);
});

