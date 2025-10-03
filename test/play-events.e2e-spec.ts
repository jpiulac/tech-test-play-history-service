import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PlayEvents (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/play', () => {
    const validPayload = {
      userId: 'user123',
      contentId: 'movie456',
      device: 'mobile',
      timestamp: '2025-09-30T12:00:00Z',
      playbackDuration: 120,
    };

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

    it('should create a play event successfully with valid data', () => {
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

  describe('GET /v1/history/:userId', () => {

    it('should return empty array when user not found', () => {
      return request(app.getHttpServer())
        .get('/v1/history/user123xxx')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.items.length).toBe(0);
        });
    })

    it('should return user play history', () => {
      return request(app.getHttpServer())
        .get('/v1/history/user123')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('should support pagination with limit and cursor', () => {
      return request(app.getHttpServer())
        .get('/v1/history/user123?limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeLessThanOrEqual(5);
        });
    });
  });




  describe('GET /v1/history/most-watched', () => {

    it('should return 400 when dates are not in ISO 8601 format', () => {
      return request(app.getHttpServer())
        .get('/v1/history/most-watched')
        .query({ from: '09/01/2025', to: '09/30/2025' }) // MM/DD/YYYY format
        .expect(400);
    })

    it('should return 400 when from/to dates are missing', () => {
      return request(app.getHttpServer())
        .get('/v1/history/most-watched')
        .query({ from: null, to: null })
        .expect(400);
    })

    it('should return 400 when to date is missing', () => {
      return request(app.getHttpServer())
        .get('/v1/history/most-watched')
        .query({ from: '2025-09-01' })
        .expect(400);
    })

    it('should return 400 when from date is missing', () => {
      return request(app.getHttpServer())
        .get('/v1/history/most-watched')
        .query({ to: '2025-09-30' })
        .expect(400);
    })

    it('should return most watched content with valid date range', () => {
      return request(app.getHttpServer())
        .get('/v1/history/most-watched')
        .query({ from: '2025-09-01', to: '2025-09-30' })
        .expect(200)
        .expect((res) => {
          console.log(res.body);
          expect(Array.isArray(res.body)).toBe(true);
          // expect(res.body.length).toBeGreaterThan(0);
          // expect(res.body[0].contentId).toBeDefined();
          // expect(res.body[0].totalPlayCount).toBeDefined();
          // expect(res.body[0].totalPlayCount).toBeGreaterThanOrEqual(0);
        });
    })

  })
});