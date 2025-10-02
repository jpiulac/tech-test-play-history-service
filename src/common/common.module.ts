import { Module } from '@nestjs/common';
import { IdempotencyGuard } from './guards/idempotency-guard';

@Module({
  providers: [IdempotencyGuard],
  exports: [IdempotencyGuard],
})
export class CommonModule {}
