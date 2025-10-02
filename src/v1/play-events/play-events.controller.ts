import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PlayEventsService } from '@app/v1/play-events/play-events.service';
// import { PlayEventDto } from './dto/play-event.dto';
import { CreatePlayEventDto } from '@app/v1/play-events/dto/create-play-event.dto';
import { CreatePlayEventResponseDto } from './dto/create-play-event-response.dto';
import { PlayEventsHistoryResponseDto } from '@app/v1/play-events/dto/play-events-history-response.dto';
// import { DateRangeDto } from '../../dto/date-range.dto';
import { CursorRangeDto } from '@app/common/dto/cursor-range.dto';
import { IdempotencyGuard } from '@app/common/guards/idempotency-guard';
import { MostWatchedResponseDto } from '@app/v1/play-events/dto/most-watched-response.dto';
import { DateRangeDto } from '@app/common/dto/date-range.dto';

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
    type: [MostWatchedResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid date format or range',
  })
  async getMostWatched(
    @Query() dateRangeDto: DateRangeDto,
  ): Promise<MostWatchedResponseDto[]> {
    return await this.playService.getMostWatched(dateRangeDto);
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
    type: PlayEventsHistoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or no play history',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 500, default: 20 },
  })
  async getUserHistory(
    @Param('userId') userId: string,
    @Query() cursorRangeDto: CursorRangeDto,
  ): Promise<PlayEventsHistoryResponseDto> {
    return await this.playService.getUserHistory(userId, cursorRangeDto);
  }
}
