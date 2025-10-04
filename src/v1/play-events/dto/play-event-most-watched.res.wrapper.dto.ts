import { ApiProperty } from '@nestjs/swagger';
import { PlayEventMostWatchedResponseDto } from '@app/v1/play-events/dto/play-event-most-watched.res.dto';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class PlayEventMostWatchedResponseWrapperDto {
  @ApiProperty({
    description: 'List of most-watched content items',
    type: [PlayEventMostWatchedResponseDto],
  })
  items: PlayEventMostWatchedResponseDto[];

  @ApiProperty({
    description: 'Start date of the time range',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;
  @ApiProperty({
    description: 'End date of the time range',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
