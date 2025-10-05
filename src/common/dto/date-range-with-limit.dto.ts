import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DateRangeWithLimitDto {
  @ApiProperty({
    description:
      'Start date of the time range (Must be ISO 8601 / UTC format ending in Z)',
    example: '2025-09-01T00:00:00Z',
    format: 'date-time',
  })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    description:
      'End date of the time range (Must be ISO 8601 / UTC format ending in Z)',
    example: '2025-09-30T23:59:59Z',
    format: 'date-time',
  })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({
    description: 'Maximum number of records to return (defaults to 200), [minimum 1, maximum 5000].',
    example: 200,
    minimum: 1,
    maximum: 5000,
    default: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 200;
}
