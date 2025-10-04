import { Module } from '@nestjs/common';
import { V1Module } from '@app/v1/v1.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration, { envValidationSchema } from './config/configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from '@app/common/health/health.module';

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/play_history_db?authSource=admin';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    HealthModule,
    V1Module,
    MongooseModule.forRoot(mongoUri, {
      // Add autoIndex for development only
      // TODO: make env variable for this
      // autoIndex: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    // V2Module,      // Future API v2
    // AuthModule,     // Shared authentication
    // CacheModule,    // Shared caching
  ],
})
export class AppModule {}
