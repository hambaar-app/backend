import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('HamBaar App')
    .setDescription('HamBaar App API using NestJS and Prisma')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT, () => console.log(`Listening on port ${PORT}.`));
}
bootstrap();
