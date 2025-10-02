import { ApiProperty } from '@nestjs/swagger';
import { PlayEventHistoryResponseDto } from '@app/v1/play-events/dto/play-event-history-response.dto';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

export class PlayEventsHistoryResponseDto {
  @ApiProperty({
    description: 'List of play events',
    type: [PlayEventHistoryResponseDto],
  })
  items: PlayEventHistoryResponseDto[];
  @ApiProperty({
    description: 'Id of the user',
    type: String,
  })
  userId: string;
  @ApiProperty({
    description: 'Number of items in the response',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  count: number;

  @ApiProperty({
    description: 'Cursor to use for the next page',
    type: String,
  })
  @IsString()
  @IsOptional()
  nextCursor: string | null;
}
