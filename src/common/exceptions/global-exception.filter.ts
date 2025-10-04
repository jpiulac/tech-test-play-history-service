/**
 * GlobalExceptionFilter
 *
 * A NestJS exception filter that catches **all exceptions** thrown in the application
 * and transforms them into consistent HTTP responses.
 *
 * This filter handles:
 * - Standard HTTP exceptions (`HttpException`) and preserves their status and message.
 * - MongoDB duplicate key errors (`code === 11000`) and returns HTTP 409 Conflict.
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

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface MongoDuplicateKeyError {
  code: 11000;
  keyValue?: Record<string, any>;
}

function isMongoDuplicateKeyError(e: unknown): e is MongoDuplicateKeyError {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: number }).code === 11000
  );
}

function getMessageFromResponse(responseBody: unknown): string | string[] {
  // If the response is a standard NestJS validation error object (status: 400),
  // the validation messages are often contained in the 'message' property.
  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'message' in responseBody
  ) {
    const message = responseBody.message;

    if (Array.isArray(message)) {
      return message as string[];
    }
    return String(message);
  }
  return String(responseBody);
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;

      const res = exception.getResponse();
      message = getMessageFromResponse(res);
    } else if (isMongoDuplicateKeyError(exception)) {
      if (exception.keyValue?.eventHash) {
        status = 409;
        message = 'A uniqueness constraint was violated.';
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
