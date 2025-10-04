import { ApiProperty } from '@nestjs/swagger';

export class PlayEventMostWatchedResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the content',
    example: 'movie456',
  })
  contentId: string;

  @ApiProperty({
    description: 'Count of times the content was watched',
    example: 42,
  })
  totalPlayCount: number;
}

// export class MostWatchedResponseWrapperDto {
//   @ApiProperty({ description: 'Response metadata', type: MetadataDto })
//   metadata: MetadataDto;

//   @ApiProperty({
//     description: 'List of most-watched content items',
//     type: [PlayEventMostWatchedResponseDto],
//   })
//   items: PlayEventMostWatchedResponseDto[];
// }
