// import {
//   BadRequestException,
//   ConflictException,
//   InternalServerErrorException,
//   Injectable,
// } from '@nestjs/common';
// import { Logger } from '@nestjs/common';
// import { HttpException } from '@nestjs/common';

// type MongoServerError = {
//   code?: number;
//   name: string;
//   message: string;
//   stack?: string;
// };

// @Injectable()
// export class MongooseErrorHandler {
//   private readonly logger = new Logger(MongooseErrorHandler.name);

//   public handle(error: unknown): never {
//     if (error instanceof HttpException) {
//       this.logger.warn(
//         `Preserving HTTP exception: ${error.getStatus()} - ${error.message}`,
//       );
//       throw error; // Re-throw original error
//     }

//     this.logger.error('Caught Mongoose/MongoDB Error:', error);

//     if (
//       error &&
//       typeof error === 'object' &&
//       'code' in error &&
//       'name' in error
//     ) {
//       const mongoError = error as MongoServerError;
//       // (409 Conflict) on duplicate key error
//       if (mongoError.code === 11000) {
//         this.logger.warn(
//           'Uniqueness constraint violation detected (Duplicate Key).',
//         );
//         throw new ConflictException(
//           'A uniqueness constraint was violated. This play event may have been submitted previously.',
//         );
//       }

//       if (mongoError.name === 'ValidationError') {
//         this.logger.warn(`Mongoose Validation Failed: ${mongoError.message}`);
//         throw new BadRequestException(
//           'Schema validation failed for the database entry.',
//         );
//       }
//     }

//     this.logger.error('Throwing generic Internal Server Error.', error);
//     throw new InternalServerErrorException(
//       'An unexpected database error occurred.',
//     );
//   }
// }
