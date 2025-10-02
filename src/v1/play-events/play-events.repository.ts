import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
// import { Logger } from '@nestjs/common';
import { PlayEvent, PlayEventDocument } from './schema/play-event.schema';
// import { MongooseErrorHandler } from '@app/common/exceptions/__mongoose-error-handler.service';
import { DateRangeDto } from '@app/common/dto/date-range.dto';
import { MostWatchedResponseDto } from '@app/v1/play-events/dto/most-watched-response.dto';


@Injectable()
export class PlayEventsRepository {
  constructor(
    @InjectModel(PlayEvent.name)
    private playEventModel: Model<PlayEventDocument>,
    // private readonly mongooseErrorHandler: MongooseErrorHandler,
  ) {}

  async create(playEvent: Partial<PlayEvent>): Promise<PlayEventDocument> {
    // try {
      const event = new this.playEventModel(playEvent);
      return await event.save();
  //   } catch (error: unknown) {
  //     this.mongooseErrorHandler.handle(error);
  //   }
  }

  async findHistoryByUserId(
    userId: string,
    limit: number,
    cursor: string | undefined,
  ): Promise<PlayEventDocument[]> {
    // try {
      const filter: FilterQuery<PlayEventDocument> = { userId };

      // If a cursor is provided, filter records older than or equal to that timestamp
      if (cursor) {
        if (!Types.ObjectId.isValid(cursor)) {
          throw new BadRequestException(
            'Invalid cursor format. Must be a valid MongoDB ObjectId.',
          );
        }
        filter._id = { $lt: new Types.ObjectId(cursor) };
      }

      return await this.playEventModel
        .find(filter)
        // Sort by timestamp DESC, then _id DESC (best practice for cursors)
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit + 1)
        .exec();
    // } catch (error) {
    //   this.mongooseErrorHandler.handle(error);
    // }
  }

  async findMostWatchedContent(
    range: DateRangeDto,
    limit: number,
  ): Promise<MostWatchedResponseDto[]> {
    // try {
      const startDate = new Date(range.from);
      const endDate = new Date(range.to);

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
          { $sort: { totalPlayCount: -1 } },
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

      return results as MostWatchedResponseDto[];
    // } catch (error) {
    //   this.mongooseErrorHandler.handle(error);
    // }
  }
}
