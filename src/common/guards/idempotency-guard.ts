import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-idempotency-key'] as string | undefined;

    if (!key) {
      throw new BadRequestException('Header x-idempotency-key is required');
    }

    if (!isUUID(key, '4')) {
      throw new BadRequestException(
        'Header x-idempotency-key must be a valid UUID v4',
      );
    }
    return true;
  }
}
