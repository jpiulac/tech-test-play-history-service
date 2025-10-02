import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PlayEventsController } from '@app/v1/play-events/play-events.controller';
import { PlayEventsService } from '@app/v1/play-events/play-events.service';
import { PlayEventsRepository } from '@app/v1/play-events/play-events.repository';
import { PlayEvent, PlayEventSchema } from '@app/v1/play-events/schema/play-event.schema';
import { CommonModule } from '@app/common/common.module';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: PlayEvent.name, schema: PlayEventSchema },
    ]),
  ],
  controllers: [PlayEventsController],
  providers: [PlayEventsService, PlayEventsRepository],
  exports: [PlayEventsService, PlayEventsRepository],
})
export class PlayEventsModule {}
