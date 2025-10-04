import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  async check() {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    };

    try {
      await this.connection.db?.admin().ping();

      response.database = 'connected';
      response.status = 'ok';
      return response;
    } catch (error) {
      // 3. If any error occurs (network, timeout, BSON),
      // set database status to failed and throw 503 Service Unavailable (InternalServerErrorException)
      response.database = 'failed';
      response.status = 'unhealthy';
      this.logger.error('Health check failed due to database error:', error);

      throw new InternalServerErrorException({
        message: 'Service is unhealthy due to failed database connection.',
        details: response, // Include the current status object in the error payload
      });
    }
  }
}
