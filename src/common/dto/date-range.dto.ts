import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Enforce a strict ISO 8601 format ending in Z (UTC)

export class DateRangeDto {
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
}
