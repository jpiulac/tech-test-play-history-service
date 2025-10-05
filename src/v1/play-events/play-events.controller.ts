import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

import { PlayEventsService } from '@app/v1/play-events/play-events.service';
import { CreatePlayEventDto } from '@app/v1/play-events/dto/create-play-event.req.dto';
import { CreatePlayEventResponseDto } from './dto/create-play-event.res.dto';
import { PlayEventHistoryResponseWrapperDto } from '@app/v1/play-events/dto/play-event-history.res.wrapper.dto';
import { CursorRangeDto } from '@app/common/dto/cursor-range.dto';
import { IdempotencyGuard } from '@app/common/guards/idempotency-guard';
import { PlayEventMostWatchedResponseWrapperDto } from '@app/v1/play-events/dto/play-event-most-watched.res.wrapper.dto';
import { DateRangeWithLimitDto } from '@app/common/dto/date-range-with-limit.dto';

@ApiTags('Play-Events')
@Controller('v1')
export class PlayEventsController {
  constructor(private readonly playService: PlayEventsService) {}

  @Post('/play')
  @ApiOperation({ summary: 'Create a new play event' })
  @ApiHeader({
    name: 'x-idempotency-key',
    description: 'Idempotency key sent by clients',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
      example: '123e4567-e89b-42d3-a456-426614174000',
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Play event successfully created',
    type: CreatePlayEventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Duplicate play event detected (same content hash)',
  })
  @UseGuards(IdempotencyGuard)
  async createPlayEvent(
    @Body() CreatePlayEventDto: CreatePlayEventDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ): Promise<CreatePlayEventResponseDto> {
    return await this.playService.createPlayEvent(
      CreatePlayEventDto,
      idempotencyKey,
    );
  }

  @Get('/history/most-watched')
  @ApiOperation({
    summary: 'Return the most watched content IDs in a given time range',
  })
  @ApiResponse({
    status: 200,
    description: 'Most watched content retrieved successfully',
    type: [PlayEventMostWatchedResponseWrapperDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid date format, range, or limit parameter',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Database aggregation failed',
  })
  async getMostWatched(
    @Query() queryDto: DateRangeWithLimitDto,
  ): Promise<PlayEventMostWatchedResponseWrapperDto> {
    return await this.playService.getMostWatched(queryDto);
  }

  @Get('history/:userId')
  @ApiOperation({
    summary:
      "Retrieve a user's play history, sorted by most recent with pagination",
  })
  @ApiParam({
    name: 'userId',
    description: 'Unique identifier for the user',
    example: 'user123',
  })
  @ApiResponse({
    status: 200,
    description: 'Play history retrieved successfully',
    type: PlayEventHistoryResponseWrapperDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid cursor or limit parameter',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Database query failed',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 1000, default: 200 },
  })
  async getUserHistory(
    @Param('userId') userId: string,
    @Query() cursorRangeDto: CursorRangeDto,
  ): Promise<PlayEventHistoryResponseWrapperDto> {
    return await this.playService.getUserHistory(userId, cursorRangeDto);
  }

  @Patch('history/:userId')
  @ApiOperation({
    summary:
      'Triggers the asynchronous anonymization of a user record (Right to be Forgotten).',
    description:
      'Replaces the user ID token in all history records with a non-identifiable placeholder ("user-deleted"). Returns 202 ACCEPTED.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Anonymization job successfully initiated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid user ID format',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Anonymization process failed',
  })
  @ApiParam({
    name: 'userId',
    description: 'Unique identifier for the user',
    example: 'user123',
  })
  // IMPORTANT: For production, this endpoint would be secured with an Admin/System role guard.
  // TODO: add Admin/System role guard
  async triggerGdprAnonymization(
    @Param('userId') userId: string,
  ): Promise<void> {
    return await this.playService.triggerAnonymization(userId);
  }
}
