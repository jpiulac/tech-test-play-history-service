import { IdempotencyGuard } from './idempotency-guard';
import { ExecutionContext, BadRequestException } from '@nestjs/common';

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;

  beforeEach(() => {
    guard = new IdempotencyGuard();
  });

  it('should throw BadRequestException when header is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
    expect(() => guard.canActivate(mockContext)).toThrow(
      'x-idempotency-key is required',
    );
  });

  it('should throw BadRequestException when header is not a valid UUID v4', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-idempotency-key': 'not-a-uuid' } }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
  });

  it('should pass when header is a valid UUID v4', () => {
    const uuid = crypto.randomUUID();
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-idempotency-key': uuid },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
