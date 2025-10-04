import { BadRequestException, Injectable } from '@nestjs/common';
import { PlayEventsRepository } from '@app/v1/play-events/play-events.repository';
import { CreatePlayEventDto } from '@app/v1/play-events/dto/create-play-event.req.dto';
import { CreatePlayEventResponseDto } from '@app/v1/play-events/dto/create-play-event.res.dto';
import { CursorRangeDto } from '@app/common/dto/cursor-range.dto';
import { PlayEventHistoryResponseWrapperDto } from '@app/v1/play-events/dto/play-event-history.res.wrapper.dto';
import { PlayEventHistoryResponseDto } from '@app/v1/play-events/dto/play-event-history.res.dto';
import { PlayEventDocument } from '@app/v1/play-events/schema/play-event.schema';
import { DateRangeWithLimitDto } from '@app/common/dto/date-range-with-limit.dto';
import { PlayEventMostWatchedResponseWrapperDto } from '@app/v1/play-events/dto/play-event-most-watched.res.wrapper.dto';
import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class PlayEventsService {
  private readonly idempotencyMemo = new Map<
    string,
    CreatePlayEventResponseDto
  >();
  private readonly logger = new Logger(PlayEventsService.name);

  constructor(private readonly playRepository: PlayEventsRepository) {}

  generateContentHash(data: CreatePlayEventDto): string {
    const normalized = JSON.stringify({
      userId: data.userId,
      contentId: data.contentId,
      device: data.device,
      timestamp: data.timestamp,
      playbackDuration: data.playbackDuration,
    });
    return createHash('sha256').update(normalized).digest('hex');
  }

  async createPlayEvent(
    createPlayEventDto: CreatePlayEventDto,
    idempotencyKey: string,
  ): Promise<CreatePlayEventResponseDto> {
    this.logger.log(
      `[PlayEventsService.createPlayEvent] Creating play event for user ${createPlayEventDto.userId}.`,
    );

    // just checking in memory cache as a mock for idempotency
    // in a real system, this would be a redis cache or a database
    // TODO: add redis cache or database for idempotency
    const cachedResult = this.idempotencyMemo.get(idempotencyKey);
    if (cachedResult) {
      this.logger.log(
        `[Idempotency HIT] Returning cached success for key: ${idempotencyKey}`,
      );
      return cachedResult; // Return the original 201 success payload
    }

    const eventHash = this.generateContentHash(createPlayEventDto);
    this.logger.log(
      `[PlayEventsService.createPlayEvent] Event hash: ${eventHash}.`,
    );

    const createdEvent = await this.playRepository.create({
      ...createPlayEventDto,
      timestamp: new Date(createPlayEventDto.timestamp),
      eventHash,
    });

    const responseDto: CreatePlayEventResponseDto = {
      _id: createdEvent._id?.toString() || '',
      userId: createdEvent.userId,
      contentId: createdEvent.contentId,
      device: createdEvent.device,
      timestamp: createdEvent.timestamp.toISOString(),
      playbackDuration: createdEvent.playbackDuration,
    };

    this.idempotencyMemo.set(idempotencyKey, responseDto);
    return responseDto;
  }

  toPlayEventHistoryResponseDto(
    item: PlayEventDocument,
  ): PlayEventHistoryResponseDto {
    return {
      _id: item._id?.toString() || '',
      userId: item.userId,
      contentId: item.contentId,
      device: item.device,
      timestamp: item.timestamp.toISOString(),
      playbackDuration: item.playbackDuration,
    };
  }

  async getUserHistory(
    userId: string,
    query: CursorRangeDto,
  ): Promise<PlayEventHistoryResponseWrapperDto> {
    const results: PlayEventDocument[] =
      await this.playRepository.findHistoryByUserId(
        userId,
        query.limit,
        query.cursor,
      );

    this.logger.log(
      `[PlayEventsService.getUserHistory] Found ${results.length} play events for user ${userId}.`,
    );

    // Check if we have one extra document, indicating there is a next page
    const hasNextPage = results.length > query.limit;
    // discard the extra document (for detection only)
    const items = hasNextPage ? results.slice(0, query.limit) : results;

    // Determine the next cursor
    let nextCursor: string | null = null;
    if (hasNextPage) {
      // The cursor is the timestamp of the very last item returned
      const lastItem: PlayEventDocument = items[items.length - 1];
      nextCursor = lastItem._id?.toString() || null;
    }

    const dtos = items.map((item) => this.toPlayEventHistoryResponseDto(item));

    return {
      userId,
      items: dtos,
      count: dtos.length,
      nextCursor,
    };
  }

  async getMostWatched(
    dateRangeDto: DateRangeWithLimitDto,
    limit: number,
  ): Promise<PlayEventMostWatchedResponseWrapperDto> {
    this.logger.log(
      `[PlayEventsService.getMostWatched] Finding most watched content for date range ${dateRangeDto.from} to ${dateRangeDto.to} with limit ${limit}.`,
    );
    const startDate = new Date(dateRangeDto.from);
    const endDate = new Date(dateRangeDto.to);
    if (startDate >= endDate) {
      throw new BadRequestException('"from" date must be before "to" date');
    }

    this.logger.log(
      `[PlayEventsServicegetMostWatched] Start date: ${startDate.toISOString()}, End date: ${endDate.toISOString()}.`,
    );
    return await this.playRepository.findMostWatchedContent(
      startDate,
      endDate,
      limit,
    );
  }

  async triggerAnonymization(userId: string): Promise<void> {
    this.logger.log(
      `[PlayEventsService.triggerAnonymization] Starting anonymization job for user: ${userId}`,
    );

    // In a real system, this would push a message to a message queue for further processing.
    // potentially this could be an expensive operation, so we should consider using a message queue.
    // TODO: add message queue for anonymization
    await this.playRepository.anonymizeUser(userId);

    this.logger.log(
      `[PlayEventsService.triggerAnonymization] Anonymization job for user: ${userId} completed.`,
    );
  }
}
