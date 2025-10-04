import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, UpdateWriteOpResult } from 'mongoose';
import { Logger } from '@nestjs/common';
import { PlayEvent, PlayEventDocument } from './schema/play-event.schema';
import { PlayEventMostWatchedResponseDto } from '@app/v1/play-events/dto/play-event-most-watched.res.dto';
import { PlayEventMostWatchedResponseWrapperDto } from '@app/v1/play-events/dto/play-event-most-watched.res.wrapper.dto';

@Injectable()
export class PlayEventsRepository {
  private static readonly ANONYMIZED_USER_ID = 'user-deleted';
  private readonly logger = new Logger(PlayEventsRepository.name);

  constructor(
    @InjectModel(PlayEvent.name)
    private playEventModel: Model<PlayEventDocument>,
  ) {}

  async create(playEvent: Partial<PlayEvent>): Promise<PlayEventDocument> {
    this.logger.log(
      `[PlayEventsRepository.create] Creating play event for user ${playEvent.userId}.`,
    );
    const event = new this.playEventModel(playEvent);
    return await event.save();
  }

  async findHistoryByUserId(
    userId: string,
    limit: number,
    cursor: string | undefined,
  ): Promise<PlayEventDocument[]> {
    this.logger.log(
      `[PlayEventsRepository.findHistoryByUserId] Finding history by user id ${userId}.`,
    );
    const filter: FilterQuery<PlayEventDocument> = { userId };

    if (cursor) {
      if (!Types.ObjectId.isValid(cursor)) {
        throw new BadRequestException(
          'Invalid cursor format. Must be a valid MongoDB ObjectId.',
        );
      }
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    // Sort by timestamp DESC, then _id DESC
    return await this.playEventModel
      .find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .exec();
  }

  async findMostWatchedContent(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<PlayEventMostWatchedResponseWrapperDto> {
    const range = `${startDate.toISOString()} to ${endDate.toISOString()}`;
    this.logger.log(
      `[PlayEventsRepository.findMostWatchedContent] Finding most watched content for date range ${range}.`,
    );
    const results = await this.playEventModel
      .aggregate([
        // Aggregartion Pipeline: Filter events by the specified time range (inlusive)
        {
          $match: {
            timestamp: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: '$contentId',
            totalPlayCount: { $sum: 1 },
          },
        },
        { $sort: { totalPlayCount: -1, contentId: 1 } },
        // TODO: optional limit
        { $limit: limit },
        {
          $project: {
            _id: 0,
            contentId: '$_id',
            totalPlayCount: 1,
          },
        },
      ])
      .exec();

    return {
      items: results as PlayEventMostWatchedResponseDto[],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  async anonymizeUser(userId: string): Promise<UpdateWriteOpResult> {
    this.logger.log(
      `[PlayEventsRepository.anonymizeUser] Anonymizing user ${userId}.`,
    );
    return this.playEventModel
      .updateMany(
        { userId: userId },
        {
          // Replace the PII/SPII identifier with a placeholder
          $set: { userId: PlayEventsRepository.ANONYMIZED_USER_ID },
        },
        {
          strict: false,
        },
      )
      .exec();
  }
}
