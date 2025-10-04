import { GlobalExceptionFilter } from './global-exception.filter';
import {
  HttpException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-url',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    it('should handle BadRequestException (400)', () => {
      const exception = new BadRequestException('Test validation error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test validation error',
          path: '/test-url',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle NotFoundException (404)', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Resource not found',
          path: '/test-url',
        }),
      );
    });

    it('should handle custom HttpException with specific status', () => {
      const exception = new HttpException('Forbidden', 403);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Forbidden',
        }),
      );
    });
  });

  describe('MongoDB error handling', () => {
    it('should handle MongoDB duplicate key error on eventHash duplicate (code 11000)', () => {
      const exception = {
        code: 11000,
        name: 'MongoError',
        message: 'E11000 duplicate key error',
        keyValue: {
          eventHash: '123',
        },
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'A uniqueness constraint was violated.',
          path: '/test-url',
          timestamp: expect.any(String),
        }),
      );
    });

    xit('should handle Mongoose ValidationError', () => {
      const exception = {
        name: 'ValidationError',
        message: 'User validation failed: email: Path `email` is required.',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Schema validation failed.',
          path: '/test-url',
        }),
      );
    });
  });

  describe('Unknown error handling', () => {
    it('should handle generic Error as 500', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          path: '/test-url',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle null/undefined exceptions as 500', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
    });

    it('should handle string exceptions as 500', () => {
      filter.catch('Some error string', mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('Response format', () => {
    it('should always include timestamp in ISO format', () => {
      const exception = new BadRequestException('Test');
      const beforeTime = new Date().toISOString();

      filter.catch(exception, mockArgumentsHost);

      const callArg = mockResponse.json.mock.calls[0][0];
      const timestamp = callArg.timestamp;

      expect(timestamp).toBeDefined();
      expect(() => new Date(timestamp)).not.toThrow();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include request path in response', () => {
      mockRequest.url = '/api/v1/users/123';
      const exception = new NotFoundException();

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/v1/users/123',
        }),
      );
    });

    it('should always return consistent response structure', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('path');
      expect(Object.keys(response)).toHaveLength(4);
    });
  });

  describe('Edge cases', () => {
    it('should handle MongoDB error without code property', () => {
      const exception = {
        name: 'MongoError',
        message: 'Some mongo error',
      };

      filter.catch(exception, mockArgumentsHost);

      // Should fall back to 500 since code !== 11000 and name !== 'ValidationError'
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle object with code but not 11000', () => {
      const exception = {
        code: 99999,
        name: 'SomeError',
        message: 'Some error',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
