import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PlayEventsController } from './play-events.controller';
import { PlayEventsService } from './play-events.service';
import { CreatePlayEventDto } from './dto/create-play-event.req.dto';

describe('PlayEventsController', () => {
  let controller: PlayEventsController;
  let service: jest.Mocked<PlayEventsService>;

  const mockService = {
    createPlayEvent: jest.fn(),
    getUserHistory: jest.fn(),
    getMostWatched: jest.fn(),
    triggerAnonymization: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayEventsController],
      providers: [
        {
          provide: PlayEventsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PlayEventsController>(PlayEventsController);
    service = module.get(PlayEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/play', () => {
    it('should create a play event', async () => {
      const dto: CreatePlayEventDto = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00Z',
        playbackDuration: 120,
      };

      const idempotencyKey = crypto.randomUUID();

      const expectedResponse = {
        _id: '66f0d9e6c0a25a7b6a8f9f11',
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00.000Z',
        playbackDuration: 120,
      };

      mockService.createPlayEvent.mockResolvedValue(expectedResponse);

      const result = await controller.createPlayEvent(dto, idempotencyKey);

      expect(mockService.createPlayEvent).toHaveBeenCalledWith(
        dto,
        idempotencyKey,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should pass idempotency key to service', async () => {
      const dto: CreatePlayEventDto = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00Z',
        playbackDuration: 120,
      };

      const idempotencyKey = crypto.randomUUID();

      mockService.createPlayEvent.mockResolvedValue({
        _id: 'some-id',
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00.000Z',
        playbackDuration: 120,
      });

      await controller.createPlayEvent(dto, idempotencyKey);

      expect(mockService.createPlayEvent).toHaveBeenCalledWith(
        dto,
        idempotencyKey,
      );
    });
  });

  describe('GET /v1/history/:userId', () => {
    it('should return user play history', async () => {
      const userId = 'user123';
      const query = { limit: 10, cursor: undefined };

      const mockHistory = {
        userId: 'user123',
        items: [
          {
            _id: new Types.ObjectId().toString(),
            userId: 'user123',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: '2025-09-30T14:00:00Z',
            playbackDuration: 120,
          },
          {
            _id: new Types.ObjectId().toString(),
            userId: 'user123',
            contentId: 'movie2',
            device: 'tv',
            timestamp: '2025-09-30T13:00:00Z',
            playbackDuration: 200,
          },
        ],
        count: 2,
        nextCursor: null,
      };

      mockService.getUserHistory.mockResolvedValue(mockHistory);

      const result = await controller.getUserHistory(userId, query);

      expect(mockService.getUserHistory).toHaveBeenCalledWith(userId, query);
      expect(result).toEqual(mockHistory);
      expect(result.items).toHaveLength(2);
    });

    it('should return empty history when user has no events', async () => {
      const userId = 'user-no-history';
      const query = { limit: 10, cursor: undefined };

      const emptyHistory = {
        userId: 'user-no-history',
        items: [],
        count: 0,
        nextCursor: null,
      };

      mockService.getUserHistory.mockResolvedValue(emptyHistory);

      const result = await controller.getUserHistory(userId, query);

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should pass cursor to service for pagination', async () => {
      const userId = 'user123';
      const cursor = 'some-cursor-id';
      const query = { limit: 5, cursor };

      mockService.getUserHistory.mockResolvedValue({
        userId: 'user123',
        items: [],
        count: 0,
        nextCursor: null,
      });

      await controller.getUserHistory(userId, query);

      expect(mockService.getUserHistory).toHaveBeenCalledWith(userId, {
        limit: 5,
        cursor,
      });
    });

    it('should return nextCursor when more pages exist', async () => {
      const userId = 'user123';
      const query = { limit: 2, cursor: undefined };

      const historyWithNextPage = {
        userId: 'user123',
        items: [
          {
            _id: 'id1',
            userId: 'user123',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: '2025-09-30T14:00:00Z',
            playbackDuration: 120,
          },
          {
            _id: 'id2',
            userId: 'user123',
            contentId: 'movie2',
            device: 'tv',
            timestamp: '2025-09-30T13:00:00Z',
            playbackDuration: 200,
          },
        ],
        count: 2,
        nextCursor: 'id2',
      };

      mockService.getUserHistory.mockResolvedValue(historyWithNextPage);

      const result = await controller.getUserHistory(userId, query);

      expect(result.nextCursor).toBe('id2');
    });
  });

  describe('GET /v1/history/most-watched', () => {
    it('should return most watched content', async () => {
      const dateRange = { from: '2025-09-01', to: '2025-09-30' };

      const mockMostWatched = [
        { contentId: 'movie456', totalPlayCount: 10 },
        { contentId: 'movie789', totalPlayCount: 5 },
        { contentId: 'movie101', totalPlayCount: 3 },
      ];

      mockService.getMostWatched.mockResolvedValue(mockMostWatched);

      const result = await controller.getMostWatched(dateRange);

      expect(mockService.getMostWatched).toHaveBeenCalledWith(dateRange);
      expect(result).toEqual(mockMostWatched);
      expect(result).toHaveLength(3);
    });

    it('should return results sorted by play count descending', async () => {
      const dateRange = { from: '2025-09-01', to: '2025-09-30' };

      const mockMostWatched = [
        { contentId: 'movie1', totalPlayCount: 100 },
        { contentId: 'movie2', totalPlayCount: 75 },
        { contentId: 'movie3', totalPlayCount: 50 },
      ];

      mockService.getMostWatched.mockResolvedValue(mockMostWatched);

      const result = await controller.getMostWatched(dateRange);

      expect(result[0].totalPlayCount).toBeGreaterThan(
        result[1].totalPlayCount,
      );
      expect(result[1].totalPlayCount).toBeGreaterThan(
        result[2].totalPlayCount,
      );
    });

    it('should return empty array when no content watched in range', async () => {
      const dateRange = { from: '2025-08-01', to: '2025-08-31' };

      mockService.getMostWatched.mockResolvedValue([]);

      const result = await controller.getMostWatched(dateRange);

      expect(result).toEqual([]);
    });

    it('should pass date range to service', async () => {
      const dateRange = { from: '2025-09-15', to: '2025-09-20' };

      mockService.getMostWatched.mockResolvedValue([]);

      await controller.getMostWatched(dateRange);

      expect(mockService.getMostWatched).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('PATCH /v1/{userId}', () => {
    it('should trigger anonymization for a user', async () => {
      mockService.triggerAnonymization.mockResolvedValue(undefined);
      await controller.triggerGdprAnonymization('user123');
      expect(mockService.triggerAnonymization).toHaveBeenCalledWith('user123');
    });

    it('should not return any data on successful anonymization', async () => {
      mockService.triggerAnonymization.mockResolvedValue(undefined);
      const result = await controller.triggerGdprAnonymization('user123');
      expect(result).toBeUndefined();
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Anonymization failed');
      mockService.triggerAnonymization.mockRejectedValue(error);

      await expect(
        controller.triggerGdprAnonymization('user123'),
      ).rejects.toThrow('Anonymization failed');
    });
  });
});
