import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * GlobalExceptionFilter
 *
 * A NestJS exception filter that catches **all exceptions** thrown in the application
 * and transforms them into consistent HTTP responses.
 *
 * This filter handles:
 * - Standard HTTP exceptions (`HttpException`) and preserves their status and message.
 * - MongoDB duplicate key errors (`code === 11000`) and returns HTTP 409 Conflict.
 * - Mongoose validation errors (`name === 'ValidationError'`) and returns HTTP 400 Bad Request.
 * - Any other unhandled exceptions as HTTP 500 Internal Server Error.
 *
 * The response format is always consistent:
 * ```json
 * {
 *   "statusCode": <number>,
 *   "message": "<string>",
 *   "timestamp": "<ISO string>",
 *   "path": "<request path>"
 * }
 * ```
 *
 * @example
 * // Apply globally in main.ts
 * app.useGlobalFilters(new GlobalExceptionFilter());
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      'name' in exception
    ) {
      const mongoError = exception as {
        code?: number;
        name: string;
        message: string;
      };

      if (mongoError.code === 11000) {
        status = 409;
        message = 'A uniqueness constraint was violated.';
      } else if (mongoError.name === 'ValidationError') {
        status = 400;
        message = 'Schema validation failed.';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
