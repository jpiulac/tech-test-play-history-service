import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsDateString,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PlayEventHistoryResponseDto {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value.toString())
  @IsString()
  _id: string;

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
    description: 'ISO 8601 timestamp of when the play event occurred',
    example: '2025-09-30T12:00:00Z',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsDateString()
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
