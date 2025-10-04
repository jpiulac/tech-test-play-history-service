import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { PlayEventsRepository } from './play-events.repository';
import { PlayEvent } from './schema/play-event.schema';

describe('PlayEventsRepository', () => {
  let repository: PlayEventsRepository;
  let model: any;

  // Create a mock constructor function
  const mockPlayEventModel = jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  }));

  // Add methods to the constructor
  mockPlayEventModel.find = jest.fn();
  mockPlayEventModel.aggregate = jest.fn();
  mockPlayEventModel.updateMany = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayEventsRepository,
        {
          provide: getModelToken(PlayEvent.name),
          useValue: mockPlayEventModel,
        },
      ],
    }).compile();

    repository = module.get<PlayEventsRepository>(PlayEventsRepository);
    model = module.get(getModelToken(PlayEvent.name));

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a play event', async () => {
      const playEventData = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: new Date('2025-09-30T12:00:00Z'),
        playbackDuration: 120,
        idempotencyKey: 'key123',
      };

      const mockSavedEvent = {
        _id: new Types.ObjectId(),
        ...playEventData,
      };

      const mockInstance = {
        save: jest.fn().mockResolvedValue(mockSavedEvent),
      };

      // Reset and configure the mock for this test
      model.mockImplementationOnce(() => mockInstance);

      const result = await repository.create(playEventData);

      expect(model).toHaveBeenCalledWith(playEventData);
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockSavedEvent);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating play event for user user123'),
      );
    });
  });

  describe('findHistoryByUserId', () => {
    it('should find history without cursor', async () => {
      const userId = 'user123';
      const limit = 10;

      const mockResults = [
        { _id: new Types.ObjectId(), userId, contentId: 'movie1' },
        { _id: new Types.ObjectId(), userId, contentId: 'movie2' },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      };

      model.find.mockReturnValue(mockQuery);

      const result = await repository.findHistoryByUserId(
        userId,
        limit,
        undefined,
      );

      expect(model.find).toHaveBeenCalledWith({ userId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: -1, _id: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(limit + 1);
      expect(result).toEqual(mockResults);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Finding history by user id user123'),
      );
    });

    it('should find history with valid cursor', async () => {
      const userId = 'user123';
      const limit = 10;
      const cursor = new Types.ObjectId().toString();

      const mockResults = [
        { _id: new Types.ObjectId(), userId, contentId: 'movie1' },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      };

      model.find.mockReturnValue(mockQuery);

      const result = await repository.findHistoryByUserId(
        userId,
        limit,
        cursor,
      );

      expect(model.find).toHaveBeenCalledWith({
        userId,
        _id: { $lt: new Types.ObjectId(cursor) },
      });
      expect(result).toEqual(mockResults);
    });

    it('should throw BadRequestException for invalid cursor format', async () => {
      const userId = 'user123';
      const limit = 10;
      const invalidCursor = 'not-a-valid-objectid';

      await expect(
        repository.findHistoryByUserId(userId, limit, invalidCursor),
      ).rejects.toThrow(BadRequestException);

      await expect(
        repository.findHistoryByUserId(userId, limit, invalidCursor),
      ).rejects.toThrow(
        'Invalid cursor format. Must be a valid MongoDB ObjectId.',
      );
    });

    it('should apply limit + 1 for pagination detection', async () => {
      const userId = 'user123';
      const limit = 5;

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      model.find.mockReturnValue(mockQuery);

      await repository.findHistoryByUserId(userId, limit, undefined);

      expect(mockQuery.limit).toHaveBeenCalledWith(6); // limit + 1
    });
  });

  describe('findMostWatchedContent', () => {
    it('should return most watched content for date range', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');
      const limit = 20;

      const mockAggregateResult = [
        { contentId: 'movie1', totalPlayCount: 100 },
        { contentId: 'movie2', totalPlayCount: 75 },
        { contentId: 'movie3', totalPlayCount: 50 },
      ];

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockAggregateResult),
      };

      model.aggregate.mockReturnValue(mockQuery);

      const result = await repository.findMostWatchedContent(
        startDate,
        endDate,
        limit,
      );

      expect(model.aggregate).toHaveBeenCalledWith([
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
        { $limit: limit },
        {
          $project: {
            _id: 0,
            contentId: '$_id',
            totalPlayCount: 1,
          },
        },
      ]);
      expect(result).toEqual({
        items: mockAggregateResult,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Finding most watched content for date range'),
      );
    });

    it('should return empty array when no content in date range', async () => {
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31');
      const limit = 20;

      const mockQuery = {
        exec: jest.fn().mockResolvedValue([]),
      };

      model.aggregate.mockReturnValue(mockQuery);

      const result = await repository.findMostWatchedContent(
        startDate,
        endDate,
        limit,
      );

      expect(result).toEqual({ "items": [], "endDate": endDate.toISOString(), "startDate": startDate.toISOString() });
    });

    it('should apply correct aggregation pipeline', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');
      const limit = 10;

      const mockQuery = {
        exec: jest.fn().mockResolvedValue([]),
      };

      model.aggregate.mockReturnValue(mockQuery);

      await repository.findMostWatchedContent(startDate, endDate, limit);

      const pipeline = model.aggregate.mock.calls[0][0];

      // Verify $match stage
      expect(pipeline[0].$match.timestamp.$gte).toEqual(startDate);
      expect(pipeline[0].$match.timestamp.$lt).toEqual(endDate);

      // Verify $group stage
      expect(pipeline[1].$group._id).toBe('$contentId');
      expect(pipeline[1].$group.totalPlayCount).toEqual({ $sum: 1 });

      // Verify $sort stage
      expect(pipeline[2].$sort.totalPlayCount).toBe(-1);
      expect(pipeline[2].$sort.contentId).toBe(1);

      // Verify $limit stage
      expect(pipeline[3].$limit).toBe(limit);

      // Verify $project stage
      expect(pipeline[4].$project._id).toBe(0);
      expect(pipeline[4].$project.contentId).toBe('$_id');
    });

    it('should respect the limit parameter', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');
      const limit = 5;

      const mockQuery = {
        exec: jest.fn().mockResolvedValue([]),
      };

      model.aggregate.mockReturnValue(mockQuery);

      await repository.findMostWatchedContent(startDate, endDate, limit);

      const pipeline = model.aggregate.mock.calls[0][0];
      expect(pipeline[3].$limit).toBe(5);
    });
  });

  describe('anonymizeUser', () => {
    it('should anonymize user data', async () => {
      const userId = 'user123';

      const mockUpdateResult = {
        acknowledged: true,
        matchedCount: 5,
        modifiedCount: 5,
        upsertedCount: 0,
        upsertedId: null,
      };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUpdateResult),
      };

      model.updateMany.mockReturnValue(mockQuery);

      const result = await repository.anonymizeUser(userId);

      expect(model.updateMany).toHaveBeenCalledWith(
        { userId: 'user123' },
        {
          $set: { userId: 'user-deleted' },
        },
        {
          strict: false,
        },
      );

      expect(result).toEqual(mockUpdateResult);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Anonymizing user user123'),
      );
    });

    it('should replace userId with ANONYMIZED_USER_ID constant', async () => {
      const userId = 'user456';

      const mockQuery = {
        exec: jest.fn().mockResolvedValue({}),
      };

      model.updateMany.mockReturnValue(mockQuery);

      await repository.anonymizeUser(userId);

      const updateCall = model.updateMany.mock.calls[0];
      expect(updateCall[1].$set.userId).toBe('user-deleted');
    });

    it('should use strict: false option', async () => {
      const userId = 'user789';

      const mockQuery = {
        exec: jest.fn().mockResolvedValue({}),
      };

      model.updateMany.mockReturnValue(mockQuery);

      await repository.anonymizeUser(userId);

      const updateCall = model.updateMany.mock.calls[0];
      expect(updateCall[2]).toEqual({ strict: false });
    });

    it('should return update result with matched and modified counts', async () => {
      const userId = 'user123';

      const mockUpdateResult = {
        acknowledged: true,
        matchedCount: 10,
        modifiedCount: 10,
        upsertedCount: 0,
        upsertedId: null,
      };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUpdateResult),
      };

      model.updateMany.mockReturnValue(mockQuery);

      const result = await repository.anonymizeUser(userId);

      expect(result.matchedCount).toBe(10);
      expect(result.modifiedCount).toBe(10);
    });
  });
});
