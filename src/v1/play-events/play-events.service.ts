import { Injectable, NotFoundException } from '@nestjs/common';
import { PlayEventsRepository } from '@app/v1/play-events/play-events.repository';
import { CreatePlayEventDto } from '@app/v1/play-events/dto/create-play-event.dto';
import { CreatePlayEventResponseDto } from '@app/v1/play-events/dto/create-play-event-response.dto';
import { CursorRangeDto } from '@app/common/dto/cursor-range.dto';
import { PlayEventsHistoryResponseDto } from '@app/v1/play-events/dto/play-events-history-response.dto';
import { PlayEventHistoryResponseDto } from '@app/v1/play-events/dto/play-event-history-response.dto';
import { PlayEventDocument } from '@app/v1/play-events/schema/play-event.schema';
import { DateRangeDto } from '@app/common/dto/date-range.dto';
import { MostWatchedResponseDto } from '@app/v1/play-events/dto/most-watched-response.dto';

@Injectable()
export class PlayEventsService {
  constructor(private readonly playRepository: PlayEventsRepository) {}

  async createPlayEvent(
    createPlayEventDto: CreatePlayEventDto,
    idempotencyKey: string,
  ): Promise<CreatePlayEventResponseDto> {
    const createdEvent = await this.playRepository.create({
      ...createPlayEventDto,
      timestamp: new Date(createPlayEventDto.timestamp),
      idempotencyKey: idempotencyKey,
    });

    return {
      _id: createdEvent._id?.toString() || '',
      userId: createdEvent.userId,
      contentId: createdEvent.contentId,
      device: createdEvent.device,
      timestamp: createdEvent.timestamp.toISOString(),
      playbackDuration: createdEvent.playbackDuration,
    };
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
  ): Promise<PlayEventsHistoryResponseDto> {
    const results: PlayEventDocument[] =
      await this.playRepository.findHistoryByUserId(
        userId,
        query.limit,
        query.cursor,
      );

    if (!results || results.length === 0) {
      throw new NotFoundException(`No play history found for user ${userId}.`);
    }

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

    // Convert Mongoose Documents to clean DTOs
    const dtos = items.map((item) => this.toPlayEventHistoryResponseDto(item));

    return {
      userId,
      items: dtos,
      count: dtos.length,
      nextCursor,
    };
  }

  async getMostWatched(
    dateRangeDto: DateRangeDto,
  ): Promise<MostWatchedResponseDto[]> {
    return await this.playRepository.findMostWatchedContent(dateRangeDto, 20);
  }
}
