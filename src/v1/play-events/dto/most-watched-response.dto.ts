import { ApiProperty } from '@nestjs/swagger';

export class MostWatchedResponseDto {
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
