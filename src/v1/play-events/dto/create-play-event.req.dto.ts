import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePlayEventDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'user123',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Unique identifier for the content',
    example: 'movie456',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'Device type used for playback',
    example: 'mobile',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @IsNotEmpty()
  device: string;

  @ApiProperty({
    description:
      'Start date of the time range (Must be ISO 8601 / UTC format ending in Z)',
    example: '2025-09-30T12:00:00Z',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsDateString({ strict: true })
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({
    description: 'Duration of playback in seconds',
    example: 120,
    minimum: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  playbackDuration: number;
}
