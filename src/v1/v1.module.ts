import { Module } from '@nestjs/common';
import { PlayEventsModule } from '@app/v1/play-events/play-events.module';
@Module({
  imports: [PlayEventsModule],
})
export class V1Module {}
