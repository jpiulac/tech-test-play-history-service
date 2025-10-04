import { Test, TestingModule } from '@nestjs/testing';
import { PlayEventsModule } from '@app/v1/play-events/play-events.module';
import { PlayEventsController } from '@app/v1/play-events/play-events.controller';
import { PlayEventsService } from '@app/v1/play-events/play-events.service';
import { PlayEventsRepository } from '@app/v1/play-events/play-events.repository';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '@app/common/common.module';
import { PlayEvent } from '@app/v1/play-events/schema/play-event.schema';

const mockPlayEventModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

describe('PlayEventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PlayEventsModule],
    })
      .overrideModule(CommonModule)
      .useModule(class MockCommonModule {})
      .overrideProvider(getModelToken(PlayEvent.name))
      .useValue(mockPlayEventModel)
      // OPTIONAL: Override Service/Repository for safety/isolation
      .overrideProvider(PlayEventsService)
      .useValue({})
      .overrideProvider(PlayEventsRepository)
      .useValue({})
      .compile();
  });

  it('should compile and be defined, ensuring correct setup', () => {
    expect(module).toBeDefined();
    expect(module.get(PlayEventsController)).toBeDefined();
  });
});
