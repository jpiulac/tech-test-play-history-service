import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PlayEventsService } from './play-events.service';
import { PlayEventsRepository } from './play-events.repository';
import { CreatePlayEventDto } from './dto/create-play-event.req.dto';
import { PlayEventDocument } from './schema/play-event.schema';
import { Types } from 'mongoose';

describe('PlayEventsService', () => {
  let service: PlayEventsService;
  let repository: jest.Mocked<PlayEventsRepository>;

  // Mock repository
  const mockRepository = {
    create: jest.fn(),
    findHistoryByUserId: jest.fn(),
    findMostWatchedContent: jest.fn(),
    anonymizeUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayEventsService,
        {
          provide: PlayEventsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PlayEventsService>(PlayEventsService);
    repository = module.get(PlayEventsRepository);

    // Mock Logger to avoid console output during tests
    // jest.spyOn(service.logger, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlayEvent', () => {
    it('should create a play event successfully', async () => {
      const eventHash =
        '4d3df3f2c95b61d6f37878d58bbbe65e6034dfeb44dc0e3037a6fb88ccc533c9';
      const createDto: CreatePlayEventDto = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00Z',
        playbackDuration: 120,
      };

      const idempotencyKey = crypto.randomUUID();

      const mockCreatedEvent = {
        _id: new Types.ObjectId(),
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: new Date('2025-09-30T12:00:00Z'),
        playbackDuration: 120,
        eventHash,
      } as PlayEventDocument;

      mockRepository.create.mockResolvedValue(mockCreatedEvent);

      const result = await service.createPlayEvent(createDto, idempotencyKey);

      expect(result).toEqual({
        _id: mockCreatedEvent._id?.toString(),
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00.000Z',
        playbackDuration: 120,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        timestamp: new Date('2025-09-30T12:00:00Z'),
        eventHash,
      });

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        '[PlayEventsService.createPlayEvent] Creating play event for user user123.',
      );
    });

    it('should return cached result if idempotency key is hit', async () => {
      const idempotencyKey = crypto.randomUUID();
      const mockCachedResult = {
        _id: 'some-id',
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00.000Z',
        playbackDuration: 120,
      };
      service['idempotencyMemo'].set(idempotencyKey, mockCachedResult);
      const createDto: CreatePlayEventDto = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00Z',
        playbackDuration: 120,
      };

      const result = await service.createPlayEvent(createDto, idempotencyKey);

      expect(result).toEqual(mockCachedResult);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        '[Idempotency HIT] Returning cached success for key: ' + idempotencyKey,
      );
    });

    it('should handle missing _id gracefully', async () => {
      const createDto: CreatePlayEventDto = {
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00Z',
        playbackDuration: 120,
      };

      const mockCreatedEvent = {
        _id: undefined,
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: new Date('2025-09-30T12:00:00Z'),
        playbackDuration: 120,
      } as PlayEventDocument;

      mockRepository.create.mockResolvedValue(mockCreatedEvent);

      const result = await service.createPlayEvent(createDto, 'key123');

      expect(result._id).toBe('');
    });
  });

  describe('toPlayEventHistoryResponseDto', () => {
    it('should transform PlayEventDocument to DTO', () => {
      const mockDocument = {
        _id: new Types.ObjectId(),
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: new Date('2025-09-30T12:00:00Z'),
        playbackDuration: 120,
      } as PlayEventDocument;

      const result = service.toPlayEventHistoryResponseDto(mockDocument);

      expect(result).toEqual({
        _id: mockDocument._id?.toString(),
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: '2025-09-30T12:00:00.000Z',
        playbackDuration: 120,
      });
    });

    it('should handle missing _id', () => {
      const mockDocument = {
        _id: undefined,
        userId: 'user123',
        contentId: 'movie456',
        device: 'mobile',
        timestamp: new Date('2025-09-30T12:00:00Z'),
        playbackDuration: 120,
      } as PlayEventDocument;

      const result = service.toPlayEventHistoryResponseDto(mockDocument);

      expect(result._id).toBe('');
    });
  });

  describe('getUserHistory', () => {
    it('should return user history without next cursor when no more pages', async () => {
      const userId = 'user123';
      const query = { limit: 10, cursor: undefined };

      const mockEvents = [
        {
          _id: new Types.ObjectId(),
          userId: 'user123',
          contentId: 'movie1',
          device: 'mobile',
          timestamp: new Date('2025-09-30T12:00:00Z'),
          playbackDuration: 100,
        },
        {
          _id: new Types.ObjectId(),
          userId: 'user123',
          contentId: 'movie2',
          device: 'tv',
          timestamp: new Date('2025-09-30T11:00:00Z'),
          playbackDuration: 200,
        },
      ] as PlayEventDocument[];

      mockRepository.findHistoryByUserId.mockResolvedValue(mockEvents);
      const result = await service.getUserHistory(userId, query);

      expect(result).toEqual({
        userId: 'user123',
        items: expect.arrayContaining([
          expect.objectContaining({ contentId: 'movie1' }),
          expect.objectContaining({ contentId: 'movie2' }),
        ]),
        count: 2,
        nextCursor: null,
      });

      expect(mockRepository.findHistoryByUserId).toHaveBeenCalledWith(
        userId,
        10,
        undefined,
      );

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        '[PlayEventsService.getUserHistory] Found 2 play events for user user123.',
      );
    });

    it('should return user history with next cursor when more pages exist', async () => {
      const userId = 'user123';
      const query = { limit: 2, cursor: undefined };

      const mockId1 = new Types.ObjectId();
      const mockId2 = new Types.ObjectId();
      const mockId3 = new Types.ObjectId();

      // Repository returns 3 items (limit + 1 for pagination detection)
      const mockEvents = [
        {
          _id: mockId1,
          userId: 'user123',
          contentId: 'movie1',
          device: 'mobile',
          timestamp: new Date('2025-09-30T12:00:00Z'),
          playbackDuration: 100,
        },
        {
          _id: mockId2,
          userId: 'user123',
          contentId: 'movie2',
          device: 'tv',
          timestamp: new Date('2025-09-30T11:00:00Z'),
          playbackDuration: 200,
        },
        {
          _id: mockId3,
          userId: 'user123',
          contentId: 'movie3',
          device: 'mobile',
          timestamp: new Date('2025-09-30T10:00:00Z'),
          playbackDuration: 150,
        },
      ] as PlayEventDocument[];

      mockRepository.findHistoryByUserId.mockResolvedValue(mockEvents);
      const result = await service.getUserHistory(userId, query);

      expect(result.items.length).toBe(2); // Should only return limit items
      expect(result.count).toBe(2);
      expect(result.nextCursor).toBe(mockId2.toString()); // Cursor should be last item's _id
      expect(result.items[0].contentId).toBe('movie1');
      expect(result.items[1].contentId).toBe('movie2');
    });

    it('should return empty array when user has no history', async () => {
      const userId = 'user-no-history';
      const query = { limit: 10, cursor: undefined };

      mockRepository.findHistoryByUserId.mockResolvedValue([]);
      const result = await service.getUserHistory(userId, query);

      expect(result).toEqual({
        userId: 'user-no-history',
        items: [],
        count: 0,
        nextCursor: null,
      });
    });

    it('should pass cursor to repository when provided', async () => {
      const userId = 'user123';
      const cursor = 'some-cursor-id';
      const query = { limit: 10, cursor };

      mockRepository.findHistoryByUserId.mockResolvedValue([]);
      await service.getUserHistory(userId, query);

      expect(mockRepository.findHistoryByUserId).toHaveBeenCalledWith(
        userId,
        10,
        cursor,
      );
    });
  });

  describe('getMostWatched', () => {
    it('should return most watched content for date range', async () => {
      const dateRangeDto = {
        from: '2025-09-01',
        to: '2025-09-30',
      };
      const mockMostWatched = [
        { contentId: 'movie1', totalPlayCount: 100 },
        { contentId: 'movie2', totalPlayCount: 75 },
        { contentId: 'movie3', totalPlayCount: 50 },
      ];

      mockRepository.findMostWatchedContent.mockResolvedValue(mockMostWatched);
      const result = await service.getMostWatched(dateRangeDto, 20);

      expect(result).toEqual(mockMostWatched);
      expect(mockRepository.findMostWatchedContent).toHaveBeenCalledWith(
        new Date('2025-09-01'),
        new Date('2025-09-30'),
        20,
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('[PlayEventsService.getMostWatched]'),
      );
    });

    it('should return empty array when no content watched in date range', async () => {
      const dateRangeDto = {
        from: '2025-08-01',
        to: '2025-08-31',
      };
      mockRepository.findMostWatchedContent.mockResolvedValue([]);
      const result = await service.getMostWatched(dateRangeDto, 20);

      expect(result).toEqual([]);
    });

    it('should convert date strings to Date objects', async () => {
      const dateRangeDto = {
        from: '2025-09-01',
        to: '2025-09-30',
      };
      mockRepository.findMostWatchedContent.mockResolvedValue([]);
      await service.getMostWatched(dateRangeDto, 20);

      const callArgs = mockRepository.findMostWatchedContent.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
      expect(callArgs[0].toISOString()).toContain('2025-09-01');
      expect(callArgs[1].toISOString()).toContain('2025-09-30');
    });
  });

  describe('triggerAnonymization', () => {
    it('should anonymize user data', async () => {
      const userId = 'user123';
      mockRepository.anonymizeUser.mockResolvedValue(undefined);
      await service.triggerAnonymization(userId);

      expect(mockRepository.anonymizeUser).toHaveBeenCalledWith(userId);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        '[PlayEventsService.triggerAnonymization] Starting anonymization job for user: user123',
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        '[PlayEventsService.triggerAnonymization] Anonymization job for user: user123 completed.',
      );
    });

    it('should propagate errors from repository', async () => {
      const userId = 'user123';
      const error = new Error('Database error');

      mockRepository.anonymizeUser.mockRejectedValue(error);

      await expect(service.triggerAnonymization(userId)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
