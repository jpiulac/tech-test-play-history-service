import { Module } from '@nestjs/common';
import { V1Module } from '@app/v1/v1.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

// todo env
const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://user:password@localhost:27017/play_history_db?authSource=admin';

@Module({
  imports: [
    V1Module,
    ConfigModule.forRoot(),
    MongooseModule.forRoot(mongoUri, {
      // TODO: REMOVE FOR PRODUCTION
      autoIndex: true,
    }),
    // V2Module,      // Future API v2
    // AuthModule,     // Shared authentication
    // CacheModule,    // Shared caching
  ],
})
export class AppModule {}
