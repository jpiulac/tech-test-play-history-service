import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '@app/common/exceptions/global-exception.filter';

import helmet from 'helmet';
const logger = new Logger('Bootstrap');

const swagger_docs = (app: NestExpressApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Play Events Service API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Security headers
  app.use(helmet());

  // Enable CORS for all origins (adjust as needed)
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  swagger_docs(app);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application started on port: ${port}`);
}

bootstrap().catch((err) => {
  logger.error('Application failed to start:', err);
  process.exit(1);
});
