import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlayEventDocument = PlayEvent & Document;

@Schema({ timestamps: true })
export class PlayEvent {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  contentId: string;

  @Prop({ required: true })
  device: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  playbackDuration: number;

  @Prop({ required: true })
  idempotencyKey: string;
}

export const PlayEventSchema = SchemaFactory.createForClass(PlayEvent);

// Add indexes for common queries
PlayEventSchema.index({ userId: 1, timestamp: -1 });
PlayEventSchema.index({ contentId: 1 });
PlayEventSchema.index({ idempotencyKey: 1, userId: 1 }, { unique: true });
