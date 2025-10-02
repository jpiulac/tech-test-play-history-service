import { Module } from '@nestjs/common';
// import { MongooseErrorHandler } from './exceptions/__mongoose-error-handler.service';
import { IdempotencyGuard } from './guards/idempotency-guard';

@Module({
  providers: [IdempotencyGuard],
  exports: [IdempotencyGuard],
})
export class CommonModule {}
