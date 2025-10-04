import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { PlayEvent } from '@app/v1/play-events/schema/play-event.schema';
import { GlobalExceptionFilter } from '@app/common/exceptions/global-exception.filter';

describe('PlayEvents (e2e)', () => {
  let app: INestApplication;
  let playEventModel: Model<any>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new GlobalExceptionFilter());
    // Apply the same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    playEventModel = moduleFixture.get(getModelToken(PlayEvent.name));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await playEventModel.deleteMany({});
  });

  describe('POST /v1/play', () => {
    const validPayload = {
      userId: 'user123',
      contentId: 'movie456',
      device: 'mobile',
      timestamp: '2025-09-30T12:00:00Z',
      playbackDuration: 120,
    };

    describe('Validation Tests', () => {
      it('should return 400 when x-idempotency-key header is missing', () => {
        return request(app.getHttpServer())
          .post('/v1/play')
          .send(validPayload)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('x-idempotency-key is required');
          });
      });

      it('should return 400 when x-idempotency-key is not a valid UUID v4', () => {
        return request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', 'not-a-uuid')
          .send(validPayload)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('valid UUID v4');
          });
      });

      it('should return 400 when timestamp is not ISO 8601 format', () => {
        const idempotencyKey = crypto.randomUUID();
        return request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey)
          .send({ ...validPayload, timestamp: 'invalid-date' })
          .expect(400)
          .expect((res) => {
            expect(res.body.message[0]).toContain('timestamp');
          });
      });

      it('should return 400 when required fields are missing', () => {
        const idempotencyKey = crypto.randomUUID();
        return request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey)
          .send({ userId: 'user123' }) // Missing other required fields
          .expect(400);
      });

      it('should return 400 when playbackDuration is negative', () => {
        return request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', '123e4567-e89b-12d3-a456-426614174000')
          .send({ ...validPayload, playbackDuration: -10 })
          .expect(400);
      });

      it('should return 201 and create a play event successfully with valid data', () => {
        const idempotencyKey = crypto.randomUUID();
        return request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey)
          .send(validPayload)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body.userId).toBe(validPayload.userId);
            expect(res.body.contentId).toBe(validPayload.contentId);
          });
      });
    });
    describe('Functional Tests', () => {
      it('should return 201 and same response for duplicate idempotency key', async () => {
        const idempotencyKey = crypto.randomUUID();
        // first request
        const firstResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey)
          .send(validPayload)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body.userId).toBe(validPayload.userId);
            expect(res.body.contentId).toBe(validPayload.contentId);
          });
        // second request
        const secondResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey)
          .send(validPayload)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body.userId).toBe(validPayload.userId);
            expect(res.body.contentId).toBe(validPayload.contentId);
          });

        expect(firstResponse.body._id).toBe(secondResponse.body._id);

        // Verify only one record exists in database
        const count = await playEventModel.countDocuments({
          userId: 'user123',
        });
        expect(count).toBe(1);
      });

      it('should return 409 with duplicate event same content hash', async () => {
        const idempotencyKey1 = crypto.randomUUID();
        const idempotencyKey2 = crypto.randomUUID();

        const firstResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey1)
          .send(validPayload)
          .expect(201);

        const secondResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey2)
          .send(validPayload)
          .expect(409);
      });

      it('should return 201 and create different events with different idempotency keys and different payload', async () => {
        const idempotencyKey1 = crypto.randomUUID();
        const idempotencyKey2 = crypto.randomUUID();

        const firstResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey1)
          .send(validPayload)
          .expect(201);

        const secondResponse = await request(app.getHttpServer())
          .post('/v1/play')
          .set('x-idempotency-key', idempotencyKey2)
          .send({ ...validPayload, contentId: 'movie01' })
          .expect(201);

        // Should return different _ids
        expect(firstResponse.body._id).not.toBe(secondResponse.body._id);

        // Verify two records exist in database
        const count = await playEventModel.countDocuments({
          userId: 'user123',
        });
        expect(count).toBe(2);
      });
    });
  });

  describe('GET /v1/history/:userId', () => {
    describe('Validation Tests', () => {
      it('should return 400 when limit is not a number', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123?limit=not-a-number')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'limit must be an integer number',
            );
          });
      });

      it('should return 400 when limit is not a positive number', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123?limit=0')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('limit must not be less than 1');
          });
      });

      it('should return 400 when limit is greater than 5000', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123?limit=5001')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('limit must not be greater than 5000');
          });
      });


      it('should return 400 when cursor format is not a valid ObjectId', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123?cursor=not-a-valid-objectid')
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Invalid cursor format. Must be a valid MongoDB ObjectId.',
            );
          });
      });

      it('should return 200 and empty array when user not found', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user1234567890')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body.items.length).toBe(0);
          });
      });

      it('should return 200 and support optoonal params limit and cursor pagination', () => {
        request(app.getHttpServer())
          .get('/v1/history/user123?limit=5&cursor=662626262626262626262626')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
          });
        request(app.getHttpServer())
          .get('/v1/history/user123?limit=5')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
          });
        request(app.getHttpServer())
          .get('/v1/history/user123?cursor=662626262626262626262626')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
          });
      });
    });
    describe('Functional Tests', () => {
      beforeEach(async () => {
        // Setup test data
        const events = [
          {
            userId: 'user123',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-30T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHash1',
          },
          {
            userId: 'user123',
            contentId: 'movie2',
            device: 'tv',
            timestamp: new Date('2025-09-30T11:00:00Z'),
            playbackDuration: 200,
            eventHash: 'eventHash2',
          },
          {
            userId: 'user123',
            contentId: 'movie3',
            device: 'mobile',
            timestamp: new Date('2025-09-30T12:00:00Z'),
            playbackDuration: 150,
            eventHash: 'eventHash3',
          },
          {
            userId: 'user456',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-30T13:00:00Z'),
            playbackDuration: 120,
            eventHash: 'eventHash4',
          },
        ];

        await playEventModel.insertMany(events);
      });

      it('should return 200 and empty array when user has no history', () => {
        return request(app.getHttpServer())
          .get('/v1/history/nonexistent-user')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body.items.length).toBe(0);
          });
      });

      it('should return 200 and all play events for a user', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123')

          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body.items.length).toBe(3);
            expect(res.body.items[0].userId).toBe('user123');
          });
      });
      it('should return 200 and events sorted by timestamp descending', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123')
          .expect(200)
          .expect((res) => {
            const items = res.body.items;
            expect(items.length).toBe(3);

            // Most recent first
            expect(items[0].contentId).toBe('movie3');
            expect(items[1].contentId).toBe('movie2');
            expect(items[2].contentId).toBe('movie1');
          });
      });

      it('should return 200 and support pagination with limit', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user123')
          .query({ limit: 2 })
          .expect(200)
          .expect((res) => {
            expect(res.body.items.length).toBe(2);
            expect(res.body).toHaveProperty('nextCursor');
          });
      });

      it('should return 200 and support cursor-based pagination', async () => {
        // Get first page
        const firstPage = await request(app.getHttpServer())
          .get('/v1/history/user123')
          .query({ limit: 2 })
          .expect(200);

        expect(firstPage.body.items.length).toBe(2);
        expect(firstPage.body.nextCursor).toBeDefined();

        // Get second page using cursor
        const secondPage = await request(app.getHttpServer())
          .get('/v1/history/user123')
          .query({ limit: 2, cursor: firstPage.body.nextCursor })
          .expect(200);

        expect(secondPage.body.items.length).toBe(1);
        // Verify we got different items
        expect(secondPage.body.items[0]._id).not.toBe(
          firstPage.body.items[0]._id,
        );
      });

      it('should only return events for the specified user', () => {
        return request(app.getHttpServer())
          .get('/v1/history/user456')
          .expect(200)
          .expect((res) => {
            expect(res.body.items.length).toBe(1);
            expect(res.body.items[0].userId).toBe('user456');
            expect(res.body.items[0].contentId).toBe('movie1');
          });
      });
    });
  });

  describe('GET /v1/history/most-watched', () => {
    describe('Validation Tests', () => {
      it('should return 400 when dates are not in ISO 8601 format', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '09/01/2025', to: '09/30/2025' }) // MM/DD/YYYY format
          .expect(400);
      });

      it('should return 400 when limit is not a number', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-30T23:59:59Z',
            limit: 'not-a-number',
          })
          .expect(400);
      });

      it('should return 400 when limit is not a positive number', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-30T23:59:59Z',
            limit: 0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('limit must not be less than 1');
          });
      });

      it('should return 400 when limit is greater than 5000', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({
            from: '2025-09-01T00:00:00Z',
            to: '2025-09-30T23:59:59Z',
            limit: 5001,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'limit must not be greater than 5000',
            );
          });
      });

      it('should return 400 when from/to dates are missing', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: null, to: null })
          .expect(400);
      });

      it('should return 400 when to date is missing', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-01' })
          .expect(400);
      });

      it('should return 400 when from date is missing', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ to: '2025-09-30' })
          .expect(400);
      });
      it('should return 400 when start date is greater than end date', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-30', to: '2025-09-01' })
          .expect(400);
      });

      it('should return 200 expected response structure with valid date range', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-01', to: '2025-09-30' })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
            expect(res.body).toHaveProperty('startDate');
            expect(res.body.startDate).toBe('2025-09-01T00:00:00.000Z');
            expect(res.body).toHaveProperty('endDate');
            expect(res.body.endDate).toBe('2025-09-30T00:00:00.000Z');
          });
      });
    });
    describe('Functional Tests', () => {
      beforeEach(async () => {
        // Setup test data with various play counts
        const events = [
          // Movie1: 5 plays
          ...Array(5)
            .fill(null)
            .map((_, i) => ({
              userId: `user${i}`,
              contentId: 'movie1',
              device: 'mobile',
              timestamp: new Date('2025-09-15T10:00:00Z'),
              playbackDuration: 100,
              eventHash: `eventHash1${i}`,
            })),
          // Movie2: 3 plays
          ...Array(3)
            .fill(null)
            .map((_, i) => ({
              userId: `user${i}`,
              contentId: 'movie2',
              device: 'tv',
              timestamp: new Date('2025-09-20T10:00:00Z'),
              playbackDuration: 100,
              eventHash: `eventHash2${i}`,
            })),
          // Movie3: 7 plays
          ...Array(7)
            .fill(null)
            .map((_, i) => ({
              userId: `user${i}`,
              contentId: 'movie3',
              device: 'mobile',
              timestamp: new Date('2025-09-25T10:00:00Z'),
              playbackDuration: 100,
              eventHash: `eventHash3${i}`,
            })),
          // Movie4: 2 plays (outside date range)
          ...Array(2)
            .fill(null)
            .map((_, i) => ({
              userId: `user${i}`,
              contentId: 'movie4',
              device: 'mobile',
              timestamp: new Date('2025-10-01T10:00:00Z'),
              playbackDuration: 100,
              eventHash: `eventHash4${i}`,
            })),
        ];

        await playEventModel.insertMany(events);
      });

      it('should return 200 and most watched content sorted by play count', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-01', to: '2025-09-30' })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('items');
            expect(res.body).toHaveProperty('startDate');
            expect(res.body).toHaveProperty('endDate');
            expect(res.body.startDate).toBe('2025-09-01T00:00:00.000Z');
            expect(res.body.endDate).toBe('2025-09-30T00:00:00.000Z');

            expect(res.body.items.length).toBe(3);
            expect(res.body.items[0].contentId).toBe('movie3');
            expect(res.body.items[0].totalPlayCount).toBe(7);
            expect(res.body.items[1].contentId).toBe('movie1');
            expect(res.body.items[1].totalPlayCount).toBe(5);
            expect(res.body.items[2].contentId).toBe('movie2');
            expect(res.body.items[2].totalPlayCount).toBe(3);
          });
      });

      it('should return 200 and only include content within the specified date range', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-01', to: '2025-09-30' })
          .expect(200)
          .expect((res) => {
            // Should not include movie4 which is in October
            const movie4 = res.body.items.find(
              (item) => item.contentId === 'movie4',
            );
            expect(movie4).toBeUndefined();
          });
      });

      it('should return empty array when no content in date range', () => {
        return request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-08-01', to: '2025-08-31' })
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body.items.length).toBe(0);
          });
      });

      it('should return 200 and count unique plays correctly', async () => {
        // Add duplicate plays from same user for same content
        await playEventModel.insertMany([
          {
            userId: 'user1',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-16T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHashX',
          },
          {
            userId: 'user1',
            contentId: 'movie1',
            device: 'tv',
            timestamp: new Date('2025-09-17T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHashY',
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/v1/history/most-watched')
          .query({ from: '2025-09-01', to: '2025-09-30' })
          .expect(200);

        const movie1 = response.body.items.find(
          (item) => item.contentId === 'movie1',
        );
        // Should now have 7 plays (5 original + 2 new)
        expect(movie1.totalPlayCount).toBe(7);
      });
    });
  });

  describe('PATCH /v1/history/anonymize/:userId', () => {
    describe('Functional Tests', () => {
      beforeEach(async () => {
        // Setup test data
        const events = [
          {
            userId: 'user123',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-30T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHash1',
          },
          {
            userId: 'user123',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-30T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHash2',
          },
          {
            userId: 'user789',
            contentId: 'movie1',
            device: 'mobile',
            timestamp: new Date('2025-09-30T10:00:00Z'),
            playbackDuration: 100,
            eventHash: 'eventHash3',
          },
        ];

        await playEventModel.insertMany(events);
      });

      it('should return 200 and anonymize user history', async () => {
        const count = await playEventModel.countDocuments({
          userId: 'user123',
        });
        expect(count).toBe(2);

        return request(app.getHttpServer())
          .patch('/v1/history/user123')
          .expect(200)
          .then(async () => {
            //simulate wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const countAfter = await playEventModel.countDocuments({
              userId: 'user123',
            });
            expect(countAfter).toBe(0);
          });
      });

      it('should return 200 and no anonymize user history for other users', async () => {
        const count = await playEventModel.countDocuments({
          userId: 'user123',
        });
        expect(count).toBe(2);

        return request(app.getHttpServer())
          .patch('/v1/history/user123')
          .expect(200)
          .then(async () => {
            //simulate wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const countAfter = await playEventModel.countDocuments({
              userId: 'user789',
            });
            expect(countAfter).toBe(1);
          });
      });

      it('should return 200 and set userId to user-deleted', async () => {
        const count = await playEventModel.countDocuments({
          userId: 'user123',
        });
        expect(count).toBe(2);

        return request(app.getHttpServer())
          .patch('/v1/history/user123')
          .expect(200)
          .then(async () => {
            //simulate wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const countAfter = await playEventModel.countDocuments({
              userId: 'user-deleted',
            });
            expect(countAfter).toBe(2);
          });
      });
    });
  });

  describe('GET /health', () => {
    it('should return 200 OK and "connected" when database is available', async () => {
      // The connection is alive from the beforeAll setup
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
      expect(response.body).toHaveProperty('timestamp');
    });

    // TODO: Add test to validate invalid connection state
  });
});
