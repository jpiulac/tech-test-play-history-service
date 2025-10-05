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

async function bootstrap(): Promise<void> {
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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH'],
  });

  swagger_docs(app);
  const port = process.env.PORT ?? 3000;
  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
  logger.log(`Application started on port: ${port}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    app
      .close()
      .then(() => process.exit(0))
      .catch((err) => {
        logger.error('Error shutting down:', err);
        process.exit(1);
      });
  });
}

bootstrap().catch((err) => {
  logger.error('Application failed to start:', err);
  process.exit(1);
});
